import { Service } from "shared"

export type Account = {
	apiKey: string | undefined
	connection: Connection | undefined
	settings: Settings | undefined
}

export const accountKey = (email: string) => `:account:${email}`

export const zeroAccount = (): Account => {
	return {
		apiKey: "",
		connection: undefined,
		settings: {
			emailsEnabled: true,
		},
	}
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
	email: string
}

export type Settings = {
	emailsEnabled: boolean
}
