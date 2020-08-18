package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
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
	ArtworkURL string

	PlayCount   int // or 0
	Loved       *bool
	TrackNumber int // or -1
}

type ReleaseDate struct {
	Year  int
	Month time.Month
	Day   *int
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
				Day:   ptrInt(t.Day()),
			}
		}
	}

	t = t.In(defaultLocation)
	return ReleaseDate{
		Year:  t.Year(),
		Month: t.Month(),
		Day:   ptrInt(t.Day()),
	}
}

func ptrInt(i int) *int {
	return &i
}

func ptrString(s string) *string {
	return &s
}

func ptrBool(b bool) *bool {
	return &b
}

func intOrNil(i int) *int {
	if i == 0 {
		return nil
	}
	return &i
}

func stringOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
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
		return nil, fmt.Errorf("new request: %s", err)
	}
	req = req.WithContext(ctx)

	rsp, err := c.Do(req)
	if err != nil {
		return nil, err
	}
	defer drainAndClose(rsp.Body)

	switch rsp.StatusCode {
	case 200:
		var songs []ScrobbleSong
		if err := json.NewDecoder(rsp.Body).Decode(songs); err != nil {
			return nil, fmt.Errorf("json-decode songs: %s", err)
		}
		var ret []Song
		for _, s := range songs {
			t, ok := transformScrobbleSong(s)
			if !ok {
				continue
			}
			ret = append(ret, t)
		}
		return ret, nil

	case 403:
		return nil, &ConnectionError{ConnectionErrPermission, time.Now().Unix()}
	case 404:
		return nil, &ConnectionError{ConnectionErrNotFound, time.Now().Unix()}
	default:
		return nil, &ConnectionError{ConnectionErrGeneric, time.Now().Unix()}
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
		ArtworkURL:  fmt.Sprintf(`%s/artwork?hash=%s`, scrobbleAPIBaseURL, url.QueryEscape(s.ArtworkHash)),
		PlayCount:   s.PlayCount,
		Loved:       ptrBool(s.Loved),
		TrackNumber: -1,
	}, true
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

func FetchSongs(ctx context.Context, c *http.Client, conn Connection) ([]Song, error) {
	switch conn.Service {
	case Spotify:
		return nil, fmt.Errorf("not implemented")
	case Scrobble:
		return fetchScrobble(ctx, c, conn.Username)
	default:
		panic("unreachable")
	}
}
