package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

func init() {
	for _, name := range timeZoneNames {
		locations = append(locations, mustLoadLocation(name))
	}
}

type Song struct {
	Artist string
	Album  string
	Title  string

	Release ReleaseDate

	Link       string // or ""
	AlbumLink  string // or ""
	ArtworkURL string // or ""

	PlayCount   int // or 0
	Loved       *bool
	TrackNumber int // or -1
}

type ReleaseDate struct {
	Year  int        `json:"year"`
	Month time.Month `json:"month"`
	Day   int        `json:"day"`
}

func (r ReleaseDate) Hash() string {
	return fmt.Sprintf("%d-%d-%d", r.Year, r.Month, r.Day)
}

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return loc
}

var (
	timeZoneNames = [...]string{
		"America/Chicago",
		"America/Denver",
		"America/Los_Angeles",
		"America/New_York",
		"America/Phoenix",
		"Asia/Calcutta",
		"Etc/GMT",
	}

	locations []*time.Location // see init()

	defaultLocation = mustLoadLocation("Etc/GMT")
)

func determineReleaseDate(unix int64) ReleaseDate {
	t := time.Unix(unix, 0)

	for _, loc := range locations {
		t = t.In(loc)
		if (t.Hour() == 0 && t.Minute() == 0) || (t.Hour() == 12 && t.Minute() == 0) {
			return ReleaseDate{
				Year:  t.Year(),
				Month: t.Month(),
				Day:   t.Day(),
			}
		}
	}

	t = t.In(defaultLocation)
	return ReleaseDate{
		Year:  t.Year(),
		Month: t.Month(),
		Day:   t.Day(),
	}
}

func ptrBool(b bool) *bool {
	return &b
}

type ScrobbleSong struct {
	AlbumTitle   string        `json:"albumTitle"`
	ArtistName   string        `json:"artistName"`
	Title        string        `json:"title"`
	TotalTime    time.Duration `json:"totalTime"`
	Year         int           `json:"year"`
	ReleaseDate  int64         `json:"releaseDate"` // unix seconds
	LastPlayed   int64         `json:"lastPlayed"`  // unix seconds
	PlayCount    int           `json:"playCount"`
	Added        int64         `json:"added"` // unix seconds
	ArtworkHash  string        `json:"artworkHash"`
	TrackViewURL string        `json:"trackViewURL"`
	Loved        bool          `json:"loved"`
}

type ScrobbleResponse struct {
	Total int            `json:"total"`
	Songs []ScrobbleSong `json:"songs"`
}

func fetchScrobble(ctx context.Context, c *http.Client, username string) ([]Song, error) {
	v := url.Values{}
	v.Set("username", username)
	u := fmt.Sprintf("%s/scrobbled?%s", scrobbleAPIBaseURL, v.Encode())

	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, fmt.Errorf("new scrobble request: %s", err)
	}
	req = req.WithContext(ctx)

	rsp, err := c.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do scrobble request: %s", err)
	}
	defer drainAndClose(rsp.Body)

	switch rsp.StatusCode {
	case 200:
		var scrobbleRsp ScrobbleResponse
		if err := json.NewDecoder(rsp.Body).Decode(&scrobbleRsp); err != nil {
			return nil, fmt.Errorf("json-decode scrobble response: %s", err)
		}
		var ret []Song
		for _, s := range scrobbleRsp.Songs {
			t, ok := transformScrobbleSong(s)
			if !ok {
				continue
			}
			ret = append(ret, t)
		}
		return ret, nil

	case 403:
		return nil, ConnectionErrPermission
	case 404:
		return nil, ConnectionErrNotFound
	default:
		return nil, ConnectionErrGeneric
	}
}

func transformScrobbleSong(s ScrobbleSong) (Song, bool) {
	if s.ArtistName == "" || s.AlbumTitle == "" || s.Title == "" || s.ReleaseDate == 0 {
		return Song{}, false
	}
	return Song{
		Artist:      s.ArtistName,
		Album:       s.AlbumTitle,
		Title:       s.Title,
		Release:     determineReleaseDate(s.ReleaseDate),
		Link:        s.TrackViewURL,
		AlbumLink:   trackToAlbumLink(s.TrackViewURL),
		ArtworkURL:  artworkURL(s.ArtworkHash),
		PlayCount:   s.PlayCount,
		Loved:       ptrBool(s.Loved),
		TrackNumber: -1,
	}, true
}

func artworkURL(artworkHash string) string {
	if artworkHash == "" {
		return ""
	}
	return fmt.Sprintf(`%s/artwork?hash=%s`, scrobbleAPIBaseURL, url.QueryEscape(artworkHash))
}

func trackToAlbumLink(trackViewURL string) string {
	if trackViewURL == "" {
		return ""
	}
	u, err := url.Parse(trackViewURL)
	if err != nil {
		return ""
	}
	u.RawQuery = ""
	return u.String()
}

type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	ExpiresIn   int    `json:"expires_in"`
}

func fetchSpotifyAccessToken(ctx context.Context, c *http.Client, refreshToken, clientID, clientSecret string) (*oauth2.Token, error) {
	params := url.Values{}
	params.Set("grant_type", "refresh_token")
	params.Set("refresh_token", refreshToken)
	body := strings.NewReader(params.Encode())

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", body)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	cred := base64.StdEncoding.EncodeToString([]byte(clientID + ":" + clientSecret))
	req.Header.Set("Authorization", "Basic "+cred)

	rsp, err := c.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do spotify request: %s", err)
	}
	defer drainAndClose(rsp.Body)

	if rsp.StatusCode != 200 {
		return nil, StatusError{rsp.StatusCode}
	}

	var a AccessTokenResponse
	if err := json.NewDecoder(rsp.Body).Decode(&a); err != nil {
		return nil, fmt.Errorf("json-decode access token response: %s", err)
	}

	tok := &oauth2.Token{
		AccessToken:  a.AccessToken,
		TokenType:    a.TokenType,
		RefreshToken: refreshToken,
		Expiry:       time.Now().Add(time.Duration(a.ExpiresIn) * time.Second),
	}
	return tok, nil
}

// https://developer.spotify.com/documentation/web-api/reference-beta/#endpoint-get-users-saved-tracks
func fetchSpotify(ctx context.Context, c *http.Client, refreshToken, clientID, clientSecret string) ([]Song, error) {
	tok, err := fetchSpotifyAccessToken(ctx, c, refreshToken, clientID, clientSecret)
	if err != nil {
		return nil, fmt.Errorf("fetch access token: %w", err)
	}

	var allSongs []Song
	fetchURL := "https://api.spotify.com/v1/me/tracks?limit=50"

	for fetchURL != "" {
		songs, nextURL, err := fetchSpotifyOnePage(ctx, c, fetchURL, tok.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("fetch spotify one page: %w", err)
		}
		allSongs = append(allSongs, songs...)
		fetchURL = nextURL
	}

	return allSongs, nil
}

func fetchSpotifyOnePage(ctx context.Context, client *http.Client, url string, accessToken string) (songs []Song, nextURL string, err error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", err
	}
	req = req.WithContext(ctx)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	rsp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("do request: %s", err)
	}
	defer drainAndClose(rsp.Body)

	if rsp.StatusCode != 200 {
		// TODO: return connection errors
		return nil, "", StatusError{rsp.StatusCode}
	}

	var s SpotifyResponse
	if err := json.NewDecoder(rsp.Body).Decode(&s); err != nil {
		return nil, "", fmt.Errorf("json-decode spotify response: %s", err)
	}

	var ret []Song
	for _, t := range s.Items {
		r, ok := transformSpotifyTrack(t.Track)
		if !ok {
			continue
		}
		ret = append(ret, r)
	}
	return ret, s.Next, nil
}

type SpotifyResponse struct {
	Next  string              `json:"next"` // possibly ""
	Items []SpotifySavedTrack `json:"items"`
}

type SpotifySavedTrack struct {
	AddedAt string       `json:"added_at"`
	Track   SpotifyTrack `json:"track"`
}

type SpotifyTrack struct {
	Album        SpotifyAlbum        `json:"album"`
	ExternalURLs SpotifyExternalURLs `json:"external_urls"`
	Name         string              `json:"name"` // The name of the track.
	TrackNumber  int                 `json:"track_number"`
}

type SpotifyExternalURLs struct {
	Spotify string `json:"spotify"` // possibly ""
}

type SpotifyAlbum struct {
	ExternalURLs         SpotifyExternalURLs `json:"external_urls"`
	Artists              []SpotifyArtist     `json:"artists"`
	Images               []SpotifyImage      `json:"images"`
	Name                 string              `json:"name"`                   // The name of the album. Possibly "".
	ReleaseDate          string              `json:"release_date"`           // Possibly absent i.e. "", based on examples in docs.
	ReleaseDatePrecision string              `json:"release_date_precision"` // "year" | "month" | "day"
}

type SpotifyImage struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	URL    string `json:"url"`
}

type SpotifyArtist struct {
	Name string `json:"name"`
}

func transformSpotifyTrack(t SpotifyTrack) (Song, bool) {
	if len(t.Album.Artists) == 0 {
		return Song{}, false
	}
	artist := t.Album.Artists[0]

	if t.Name == "" || artist.Name == "" || t.Album.Name == "" {
		return Song{}, false
	}

	// check acceptable release date & precision
	if t.Album.ReleaseDate == "" {
		return Song{}, false
	}
	if t.Album.ReleaseDatePrecision != "month" && t.Album.ReleaseDatePrecision != "day" {
		return Song{}, false
	}
	rel, ok := parseSpotifyReleaseDate(t.Album.ReleaseDate, t.Album.ReleaseDatePrecision)
	if !ok {
		return Song{}, false
	}

	return Song{
		Artist:      artist.Name,
		Album:       t.Album.Name,
		Title:       t.Name,
		Release:     rel,
		Link:        t.ExternalURLs.Spotify,
		AlbumLink:   t.Album.ExternalURLs.Spotify,
		ArtworkURL:  spotifyArtworkURL(t.Album.Images),
		PlayCount:   0,
		Loved:       nil,
		TrackNumber: t.TrackNumber,
	}, true
}

func spotifyArtworkURL(images []SpotifyImage) string {
	if len(images) == 0 {
		return ""
	}
	// NOTE: mutative sort, but should not matter
	sort.Slice(images, func(i, j int) bool {
		return images[i].Width > images[j].Width
	})
	return images[0].URL
}

func parseSpotifyReleaseDate(date, precision string) (ReleaseDate, bool) {
	if precision != "month" && precision != "day" {
		panic("bad precision " + precision)
	}
	if date == "" {
		panic("empty date")
	}
	switch precision {
	case "month":
		c := strings.Split(date, "-")
		if len(c) != 2 {
			return ReleaseDate{}, false
		}
		year, err := strconv.Atoi(c[0])
		if err != nil {
			return ReleaseDate{}, false
		}
		month, err := strconv.Atoi(c[1])
		if err != nil {
			return ReleaseDate{}, false
		}
		return ReleaseDate{
			Year:  year,
			Month: time.Month(month),
			Day:   0,
		}, true
	case "day":
		c := strings.Split(date, "-")
		if len(c) != 3 {
			return ReleaseDate{}, false
		}
		year, err := strconv.Atoi(c[0])
		if err != nil {
			return ReleaseDate{}, false
		}
		month, err := strconv.Atoi(c[1])
		if err != nil {
			return ReleaseDate{}, false
		}
		day, err := strconv.Atoi(c[2])
		if err != nil {
			return ReleaseDate{}, false
		}
		return ReleaseDate{
			Year:  year,
			Month: time.Month(month),
			Day:   day,
		}, true
	default:
		panic("not reachable")
	}
}

func FetchSongs(ctx context.Context, c *http.Client, conn Connection, config Config) ([]Song, error) {
	switch conn.Service {
	case Spotify:
		return fetchSpotify(ctx, c, conn.RefreshToken, config.SpotifyClientID, config.SpotifyClientSecret)
	case Scrobble:
		return fetchScrobble(ctx, c, conn.Username)
	default:
		panic("unreachable")
	}
}
