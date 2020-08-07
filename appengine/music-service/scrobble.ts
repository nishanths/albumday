import fetch from "node-fetch"
import { Connection, ConnectionError, ScrobbleConnection, scrobbleAPIBaseURL } from "shared"
import { URLSearchParams, URL } from "url"
import { Temporal } from "proposal-temporal"
import { MusicService, Song } from "./shared"
import { determineReleaseDate } from "./release-date"

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

const scrobbleFetch = async (conn: ScrobbleConnection): Promise<ScrobbleSong[]> => {
	const params = new URLSearchParams()
	params.set("username", conn.username)

	const scrobbleURL = scrobbleAPIBaseURL + "/scrobbled?" + params.toString()

	const rsp = await fetch(scrobbleURL)
	switch (rsp.status) {
		case 200: {
			const r = await rsp.json() as ScrobbleResponse
			return r.songs
		}
		case 403: {
			const err: ConnectionError = {
				type: "connection error",
				reason: "permission",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
			throw err
		}
		case 404: {
			const err: ConnectionError = {
				type: "connection error",
				reason: "not found",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
			throw err
		}
		default: {
			const err: ConnectionError = {
				type: "connection error",
				reason: "generic",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
			throw err
		}
	}
}

const scrobbleTransform = (songs: ScrobbleSong[]): Song[] => {
	return songs.map(s => transformSong(s))
}

const transformSong = (s: ScrobbleSong): Song => {
	return {
		artist: s.artistName || null,
		album: s.albumTitle || null,
		title: s.title || null,
		released: s.releaseDate !== 0 ? determineReleaseDate(s.releaseDate) : null,
		link: s.trackViewURL || null,
		albumLink: trackToAlbumLink(s.trackViewURL),
		artworkURL: `${scrobbleAPIBaseURL}/artwork?hash=${encodeURIComponent(s.artworkHash)}`,
		playCount: s.playCount,
		loved: s.loved,
	}
}

const trackToAlbumLink = (trackViewURL: string): string | null => {
	if (trackViewURL === "") {
		return null
	}
	const u = new URL(trackViewURL)
	u.search = ""
	return u.toString()
}

export const scrobbleService: MusicService<ScrobbleConnection, ScrobbleSong[]> = {
	fetch: scrobbleFetch,
	transform: scrobbleTransform,
}
