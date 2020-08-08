import { Song, ReleaseDate, equalReleaseDate } from "./music-service"
import { Temporal } from "proposal-temporal"
import { secondsToNano, MapDefault, assertExhaustive, OmitStrict } from "shared"

type BirthdayItem = {}

type FullDate = {
	year: number,
	month: number,
	day: number
}

type ReleaseMatch = "day" | "month" | "none"

type SuccessReleaseMatch = Exclude<ReleaseMatch, "none">

function matchRelease(target: FullDate, d: ReleaseDate): ReleaseMatch {
	if (d.day !== undefined) {
		if (target.day === d.day && target.month === d.month) {
			return "day"
		}
		return "none"
	}

	if (target.month === d.month && target.day === 1) {
		return "month"
	}
	return "none"
}

type Album = {
	artist: string
	album: string
	release: ReleaseDate
	albumLink: string | undefined
	releaseMatch: SuccessReleaseMatch
}

function releaseDateHash(d: ReleaseDate): string {
	return `${d.year}-${d.month}-${d.day || ""}`
}

function albumHash(a: Album): string {
	return a.artist + " | " + a.album + " | " + releaseDateHash(a.release)
}

export function computeBirthdays(timestamp: number, timeZoneName: string, songs: Song[]): BirthdayItem[] {
	const abs = new Temporal.Absolute(secondsToNano(BigInt(timestamp)))
	const d = abs.toDateTime(timeZoneName)
	const targetDate: FullDate = {
		year: d.year,
		month: d.month,
		day: d.day,
	}
	console.log(targetDate)

	const m = new MapDefault<string, Song[], Album>(() => [])

	for (const s of songs) {
		const rm = matchRelease(targetDate, s.release)
		switch (rm) {
			case "day":
			case "month":
				const album: Album = {
					artist: s.artist,
					album: s.album,
					release: s.release,
					albumLink: s.album,
					releaseMatch: rm,
				}
				const k = albumHash(album)
				m.set(k, [...m.getOrDefault(k), s], album)
				break
			case "none":
				// skip
				break
			default:
				assertExhaustive(rm)
		}
	}

	console.log(m)

	const as = new AlbumExceptMultipleArtists_Set()
	for (const [key, album] of m.backingStoreEntries()) {
		const songs = m.getOrDefault(key)
		as.add(album, songs)
	}

	for (const a of as.albums()) {
		console.log(a)
	}

	// sort by play count and year

	const result: BirthdayItem[] = []
	return result
}

type AlbumAndSongs = {
	album: Album
	songs: Song[]
}

class AlbumExceptMultipleArtists_Set {
	private readonly arr: AlbumAndSongs[] = []

	add(newAlbum: Album, newSongs: Song[]): void {
		for (let i = 0; i < this.arr.length; i++) {
			const { album, songs } = this.arr[i]
			const [eq, smaller] = equalExceptMultipleArtists(album, newAlbum)
			if (eq) {
				this.arr[i] = { album: smaller!, songs: [...songs, ...newSongs] }
				return
			}
		}
		// nothing found; add new entry
		this.arr.push({ album: newAlbum, songs: newSongs })
	}

	albums(): Readonly<AlbumAndSongs[]> {
		return this.arr
	}
}

// Returns whether the songs are the same, but for the artists, where there are
// multiple artists with a shared primary artist. Returns the artist with the
// smaller artist name.
//
// For an example, see block comment at end of file.
export function equalExceptMultipleArtists(a: Album, b: Album): [boolean, Album | undefined] {
	let smaller: Album | undefined = undefined
	if (a.artist.startsWith(b.artist)) {
		smaller = b
	}
	if (b.artist.startsWith(a.artist)) {
		smaller = a
	}

	const result = smaller !== undefined &&
		a.album === b.album &&
		equalReleaseDate(a.release, b.release) &&
		a.albumLink === b.albumLink

	return [result, smaller]
}

/*
equalExceptMultipleArtists() example

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

