import { assertExhaustive } from "./typeutil"

export type Account = {
	apiKey: string
	connection: Connection | null
	settings: Settings
}

export type Connection = (SpotifyConnection | ScrobbleConnection) & {
	error: any
}

type ScrobbleConnection = {
	service: "scrobble"
	username: string
}

type SpotifyConnection = {
	service: "spotify"
	refreshToken: string
}

export type Settings = {
	timeZone: string
	emailsEnabled: boolean
}

export const connectionComplete = (a: Account): boolean => {
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

export type Service = Connection["service"]
