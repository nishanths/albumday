package main

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"time"
)

type Album struct {
	Artist       string       `json:"artist"`
	Album        string       `json:"album"`
	Release      ReleaseDate  `json:"release"`
	Link         string       `json:"link"` // or ""
	ArtworkURL   string       `json:"artworkURL"`
	ReleaseMatch ReleaseMatch `json:"releaseMatch"`
}

func (a Album) Equal(b Album) bool {
	return a.Artist == b.Artist &&
		a.Album == b.Album &&
		a.Release == b.Release &&
		// Reason that the Link field is ignored: As an example, the links in the same album
		// are of the form:
		//   - https://music.apple.com/us/album/ikaria/1474078530?i=1474078537&uo=4
		//   - https://music.apple.com/us/album/dreaming-of/1474078530?i=1474078536&uo=4
		// a.Link == b.Link &&
		a.ArtworkURL == b.ArtworkURL
}

func (a Album) Hash() string {
	return fmt.Sprintf("%s:%s:%s:%s", a.Artist, a.Album, a.Release.Hash(), a.ArtworkURL)
}

type BirthdayItem struct {
	Album
	Songs []BirthdayItemSong `json:"songs"`
}

type BirthdayItemSong struct {
	Title string `json:"title"`
	Link  string `json:"link"` // or ""
}

func toBirthdayItemSong(s Song) BirthdayItemSong {
	return BirthdayItemSong{
		s.Title,
		s.Link,
	}
}

func toBirthdayItemSongs(songs []Song) []BirthdayItemSong {
	ret := make([]BirthdayItemSong, len(songs))
	for i, s := range songs {
		ret[i] = toBirthdayItemSong(s)
	}
	return ret
}

type ReleaseMatch string

const (
	MatchNone  ReleaseMatch = "none"
	MatchDay   ReleaseMatch = "day"
	MatchMonth ReleaseMatch = "month"
)

type FullDate struct {
	Year  int
	Month time.Month
	Day   int
}

func matchRelease(target FullDate, d ReleaseDate) ReleaseMatch {
	if d.Day != 0 {
		if target.Day == d.Day && target.Month == d.Month {
			return MatchDay
		}
		return MatchNone
	}
	if target.Month == d.Month && target.Day == 1 {
		return MatchMonth
	}
	return MatchNone
}

func computeBirthdays(unix int64, loc *time.Location, songs []Song) []BirthdayItem {
	target := time.Unix(unix, 0).In(loc)
	targetDate := FullDate{
		Year:  target.Year(),
		Month: target.Month(),
		Day:   target.Day(),
	}

	matchingAlbums := make(map[string][]Song)
	hashToAlbums := make(map[string]Album)

	for _, s := range songs {
		match := matchRelease(targetDate, s.Release)
		switch match {
		case MatchDay, MatchMonth:
			a := Album{
				Artist:       s.Artist,
				Album:        s.Album,
				Release:      s.Release,
				Link:         s.AlbumLink,
				ArtworkURL:   s.ArtworkURL,
				ReleaseMatch: match,
			}
			matchingAlbums[a.Hash()] = append(matchingAlbums[a.Hash()], s)
			hashToAlbums[a.Hash()] = a
		case MatchNone:
			// skip
		default:
			panic("unreachable")
		}
	}

	// consolidate for shared artists
	// TODO: implement
	//
	// var consolidated ArtistsConsolidated
	// for a, songs := range matchingAlbums {
	// 	consolidated.Add(a, songs)
	// }
	//
	var consolidated []*AlbumAndSongs
	for hash, songs := range matchingAlbums {
		consolidated = append(consolidated, &AlbumAndSongs{hashToAlbums[hash], songs, 0, 0})
	}

	for _, a := range consolidated {
		a.FillCounts()
	}

	// sort albums ...
	sort.Slice(consolidated, func(i, j int) bool {
		return compareAlbums(consolidated[i], consolidated[j])
	})
	// ... and sort the songs within each album
	for _, a := range consolidated {
		sort.Slice(a.Songs, func(i, j int) bool {
			return compareSongs(a.Songs[i], a.Songs[j])
		})
	}

	// map to return type
	ret := make([]BirthdayItem, len(consolidated))
	for i, a := range consolidated {
		ret[i] = BirthdayItem{
			Album: a.Album,
			Songs: toBirthdayItemSongs(a.Songs),
		}
	}
	return ret
}

func compareAlbums(a, b *AlbumAndSongs) bool {
	if a.PlayCount > b.PlayCount {
		return true
	}
	if b.PlayCount > a.PlayCount {
		return false
	}
	if a.Loved > b.Loved {
		return true
	}
	if b.Loved > a.Loved {
		return false
	}
	if a.Album.Release.Year > b.Album.Release.Year {
		return true
	}
	if b.Album.Release.Year > a.Album.Release.Year {
		return false
	}
	if a.Album.ReleaseMatch == MatchDay && b.Album.ReleaseMatch != MatchDay {
		return true
	}
	if b.Album.ReleaseMatch == MatchDay && a.Album.ReleaseMatch != MatchDay {
		return false
	}
	if a.Album.Artist < b.Album.Artist {
		return true
	}
	if b.Album.Artist < a.Album.Artist {
		return false
	}
	if a.Songs[0].Title < b.Songs[0].Title {
		return true
	}
	if b.Songs[0].Title < a.Songs[0].Title {
		return false
	}

	return a.Album.Album < b.Album.Album
}

func compareSongs(a, b Song) bool {
	if a.Loved != nil && *a.Loved && (b.Loved == nil || !*b.Loved) {
		return true
	}
	if b.Loved != nil && *b.Loved && (a.Loved == nil || !*a.Loved) {
		return false
	}
	if a.PlayCount > b.PlayCount {
		return true
	}
	if b.PlayCount > a.PlayCount {
		return false
	}
	if a.TrackNumber < b.TrackNumber {
		return true
	}
	if b.TrackNumber < a.TrackNumber {
		return false
	}
	return a.Title < b.Title
}

type AlbumAndSongs struct {
	Album Album
	Songs []Song

	PlayCount int
	Loved     int
}

func (a *AlbumAndSongs) FillCounts() {
	var p, l int
	for _, s := range a.Songs {
		p += s.PlayCount
		if s.Loved != nil && *s.Loved {
			l++
		}
	}

	a.PlayCount = p
	a.Loved = l
}

type ArtistsConsolidated []*AlbumAndSongs

func (a *ArtistsConsolidated) Add(newAlbum Album, newSongs []Song) {
	// TODO
}

// Returns whether the songs are the same, but for the artists, where there are
// multiple artists with a shared primary artist. Returns the album with the
// smaller artist name.
//
// For an example, see block comment at end of file.
func equalButMultipleArtists(a, b Album) (Album, bool) {
	hasSmaller := false
	var result Album

	if strings.HasPrefix(a.Artist, b.Artist) {
		hasSmaller = true
		result = b
	}
	if strings.HasPrefix(b.Artist, a.Artist) {
		hasSmaller = true
		result = a
	}

	if !hasSmaller {
		return result, false
	}

	a.Artist = "" // clear for comparison
	b.Artist = ""

	log.Printf("%+v %+v %v", a, b, a.Equal(b))
	if !a.Equal(b) {
		return result, false
	}
	return result, true
}

/*
{
  artist: 'Max Richter, KiKi Layne, Mari Samuelsen & Robert Ziegler',
  album: 'Voices',
  title: 'Murmuration: Pt. 1',
  release: { year: 2020, month: 8, day: 1 },
  link: 'https://music.apple.com/us/album/murmuration-pt-1/1520370274?i=1520371405&uo=4',
  albumLink: 'https://music.apple.com/us/album/murmuration-pt-1/1520370274',
  artworkURL: 'https://selective-scrobble.appspot.com/api/v1/artwork?hash=9474552211958018425228240237176124193187112784089215',
  playCount: 1,
  loved: false
}
{
  artist: 'Max Richter',
  album: 'Voices',
  title: 'Prelude 6: Pt. 2',
  release: { year: 2020, month: 8, day: 1 },
  link: 'https://music.apple.com/us/album/prelude-6-pt-2/1520370274?i=1520371402&uo=4',
  albumLink: 'https://music.apple.com/us/album/prelude-6-pt-2/1520370274',
  artworkURL: 'https://selective-scrobble.appspot.com/api/v1/artwork?hash=9474552211958018425228240237176124193187112784089215',
  playCount: 1,
  loved: false
}
{
  artist: 'Max Richter, KiKi Layne & Robert Ziegler',
  album: 'Voices',
  title: 'Hypocognition: Pt. 1',
  release: { year: 2020, month: 8, day: 1 },
  link: 'https://music.apple.com/us/album/hypocognition-pt-1/1520370274?i=1520371395&uo=4',
  albumLink: 'https://music.apple.com/us/album/hypocognition-pt-1/1520370274',
  artworkURL: 'https://selective-scrobble.appspot.com/api/v1/artwork?hash=9474552211958018425228240237176124193187112784089215',
  playCount: 1,
  loved: false
}
{
  artist: 'Max Richter, Grace Davidson, Mari Samuelsen & Robert Ziegler',
  album: 'Voices',
  title: 'Chorale: Pt. 2',
  release: { year: 2020, month: 8, day: 1 },
  link: 'https://music.apple.com/us/album/chorale-pt-2/1520370274?i=1520371283&uo=4',
  albumLink: 'https://music.apple.com/us/album/chorale-pt-2/1520370274',
  artworkURL: 'https://selective-scrobble.appspot.com/api/v1/artwork?hash=9474552211958018425228240237176124193187112784089215',
  playCount: 1,
  loved: false
}
*/
