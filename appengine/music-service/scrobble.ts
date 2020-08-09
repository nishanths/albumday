import fetch from "node-fetch"
import { Connection, ConnectionError, ScrobbleConnection, scrobbleAPIBaseURL } from "shared"
import { URLSearchParams, URL } from "url"
import { Temporal } from "proposal-temporal"
import type { MusicService, Song } from "./shared"
import { determineReleaseDate } from "./release-date"
import { RateLimiter } from "limiter"

type ScrobbleSong = {
	albumTitle: string
	artistName: string
	title: string
	totalTime: number
	year: number
	releaseDate: number
	lastPlayed: number
	playCount: number
	added: number
	artworkHash: string
	trackViewURL: string
	loved: boolean
	ident: string
}

type ScrobbleResponse = {
	total: number
	songs: ScrobbleSong[]
}

const limiter = new RateLimiter(1, "second")

const scrobbleFetch = async (conn: ScrobbleConnection): Promise<ScrobbleSong[]> => {
	const params = new URLSearchParams()
	params.set("username", conn.username)

	const scrobbleURL = scrobbleAPIBaseURL + "/scrobbled?" + params.toString()

	return new Promise((resolve, reject) => {
		limiter.removeTokens(1, async () => {
			const rsp = await fetch(scrobbleURL)
			switch (rsp.status) {
				case 200: {
					const r = await rsp.json() as ScrobbleResponse
					resolve(r.songs)
					return
				}
				case 403: {
					const err: ConnectionError = {
						type: "connection error",
						reason: "permission",
						timestamp: Temporal.now.absolute().getEpochSeconds(),
					}
					reject(err)
					return
				}
				case 404: {
					const err: ConnectionError = {
						type: "connection error",
						reason: "not found",
						timestamp: Temporal.now.absolute().getEpochSeconds(),
					}
					reject(err)
					return
				}
				default: {
					const err: ConnectionError = {
						type: "connection error",
						reason: "generic",
						timestamp: Temporal.now.absolute().getEpochSeconds(),
					}
					reject(err)
					return
				}
			}
		})
	})
}

const scrobbleTransform = (songs: ScrobbleSong[]): Song[] => {
	const ret: Song[] = []
	for (const s of songs) {
		const r = transformSong(s)
		if (r === undefined) {
			continue
		}
		ret.push(r)
	}
	return ret
}

const transformSong = (s: ScrobbleSong): Song | undefined => {
	if (s.artistName === "" || s.albumTitle === "" || s.title === "" || s.releaseDate === 0) {
		return undefined
	}
	return {
		artist: s.artistName,
		album: s.albumTitle,
		title: s.title,
		release: determineReleaseDate(s.releaseDate),
		link: s.trackViewURL || undefined,
		albumLink: trackToAlbumLink(s.trackViewURL),
		artworkURL: `${scrobbleAPIBaseURL}/artwork?hash=${encodeURIComponent(s.artworkHash)}`,
		playCount: s.playCount,
		loved: s.loved,
		trackNumber: undefined,
	}
}

const trackToAlbumLink = (trackViewURL: string): string | undefined => {
	if (trackViewURL === "") {
		return undefined
	}
	const u = new URL(trackViewURL)
	u.search = ""
	return u.toString()
}

export const scrobbleService: MusicService<ScrobbleConnection, ScrobbleSong[]> = {
	fetch: scrobbleFetch,
	transform: scrobbleTransform,
}