import axios, { AxiosError } from "axios"
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

const fetch = async (conn: ScrobbleConnection): Promise<ScrobbleSong[]> => {
	const params = new URLSearchParams()
	params.set("username", conn.username)

	const scrobbleURL = scrobbleAPIBaseURL + "/scrobbled?" + params.toString()

	try {
		const rsp = await axios.get<ScrobbleResponse>(scrobbleURL, { responseType: "json" })
		return rsp.data.songs
	} catch (e) {
		const axiosErr = e as AxiosError
		console.error("get scrobbled", axiosErr.message)

		let err: ConnectionError
		if (axiosErr.response?.status === 403) {
			err = {
				reason: "permission",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
		} else if (axiosErr.response?.status === 404) {
			err = {
				reason: "not found",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
		} else {
			err = {
				reason: "generic",
				timestamp: Temporal.now.absolute().getEpochSeconds(),
			}
		}
		throw err
	}
}

const transform = (songs: ScrobbleSong[]): Song[] => {
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
	fetch,
	transform,
}
