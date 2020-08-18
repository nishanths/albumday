import { assertExhaustive } from "./shared"

export type Account = {
	connection: Connection | null
	settings: Settings
}

// NOTE: keep this in sync with the Service type.
export const services: Service[] = ["spotify", "scrobble"]

export type Service = Connection["service"]

export type KnownConnection = SpotifyConnection | ScrobbleConnection

export type Connection = KnownConnection & {
	error: ConnectionError | null
}

export type ConnectionError = {
	reason: ConnectionErrReason
	timestamp: number
}

type ConnectionErrReason =
	| "generic" // generic error
	| "permission" // insuffcient permissions, likely that profile is private
	| "not found" // no such profile

export type ScrobbleConnection = {
	service: "scrobble"
	username: string
}

export type SpotifyConnection = {
	service: "spotify"
	refreshToken: string
}

export type Settings = {
	emailsEnabled: boolean
	emailFormat: "html" | "plain text"
}

export function connectionComplete(a: Account): boolean {
	return a.connection !== null
}

export type Bootstrap = {
	loggedIn: boolean
	email: string | null
}

export type CacheParam = "off" | "on"

export type SuccessReleaseMatch = "day" | "month"

export type ReleaseDate = {
	year: number
	month: number
	day: number | undefined
}

export type BirthdayItem = {
	artist: string
	album: string
	release: ReleaseDate
	link: string | undefined
	releaseMatch: SuccessReleaseMatch
	artworkURL: string | undefined

	songs: {
		title: string
		link: string | undefined
	}[]
}

export type BirthdayResponse = { [t: number]: BirthdayItem[] }
