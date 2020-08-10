import { scrobbleService } from "./scrobble"
import { spotifyService } from "./spotify"
import { Service, assertExhaustive, KnownConnection, isConnectionError } from "shared"
import retry, { Options as RetryOptions, RetryFunction } from "async-retry"

export type Song = {
	artist: string
	album: string
	title: string

	release: ReleaseDate

	link: string | undefined
	albumLink: string | undefined
	artworkURL: string | undefined

	playCount: number | undefined
	loved: boolean | undefined
	trackNumber: number | undefined
}

export type ReleaseDate = {
	year: number
	month: number
	day: number | undefined
}

export function equalReleaseDate(a: ReleaseDate, b: ReleaseDate): boolean {
	return a.year === b.year &&
		a.month === b.month &&
		a.day === b.day
}

export interface MusicService<Conn extends KnownConnection, T> {
	fetch: (conn: Conn) => Promise<T>
	transform: (t: T) => Song[]
}

type AnyMusicService = MusicService<KnownConnection, any>

function musicService(s: Service): AnyMusicService {
	switch (s) {
		case "spotify":
			return spotifyService as AnyMusicService
		case "scrobble":
			return scrobbleService as AnyMusicService
		default:
			assertExhaustive(s)
	}
}

const defaultRetryOptions: RetryOptions = {
	retries: 5,
	minTimeout: 500,
	randomize: true,
}

export async function fetchSongs(conn: KnownConnection, retryOptions: RetryOptions = defaultRetryOptions): Promise<Song[]> {
	const svc = musicService(conn.service)

	const f: RetryFunction<unknown> = async (bail) => {
		try {
			return await svc.fetch(conn)
		} catch (e) {
			if (isConnectionError(e) && (e.reason === "permission" || e.reason === "not found")) {
				bail(e)
			}
		}
	}

	let fetched = await retry(f, retryOptions)
	const songs = svc.transform(fetched)
	fetched = null
	return songs
}
