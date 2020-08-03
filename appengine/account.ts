import { Service, trimPrefix } from "shared"
import * as crypto from "crypto"
import { promisify } from "util"

export type Account = {
	apiKey: string
	connection: Connection | undefined
	settings: Settings
}

export const accountKey = (email: string) => `:account:${email}`

export const accountKeysPrefix = ":account:"

export const emailFromAccountKey = (key: string): string => {
	return trimPrefix(key, accountKeysPrefix)
}

export const zeroAccount = (): Account => {
	return {
		apiKey: crypto.randomBytes(12).toString("hex"),
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
