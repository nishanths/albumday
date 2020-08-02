import { Service } from "shared"

export type Account = {
	connection: Connection | undefined
	config: Config | undefined
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

export type Config = {
	timezone: string
	emailEnabled: boolean
}
