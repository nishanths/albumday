import { assertExhaustive } from "./typeutil"

export type Account = {
	apiKey: string
	connection: Connection | null
	settings: Settings
}

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
	timeZone: string
	emailsEnabled: boolean
	emailFormat: "html" | "plain-text"
}

export function connectionComplete(a: Account): boolean {
	if (a.connection === null) {
		return false
	}
	switch (a.connection.service) {
		case "spotify":
			return a.connection.refreshToken !== ""
		case "scrobble":
			return a.connection.username !== ""
		default:
			assertExhaustive(a.connection)
	}
}

export type Bootstrap = {
	loggedIn: boolean
	email: string | null
}

