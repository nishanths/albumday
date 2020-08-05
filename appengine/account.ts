import { Service, trimPrefix, Account } from "shared"
import * as crypto from "crypto"
import { promisify } from "util"

export const accountKey = (email: string) => `:account:${email}`

export const accountKeysPrefix = ":account:"

export const emailFromAccountKey = (key: string): string => {
	return trimPrefix(key, accountKeysPrefix)
}

export const zeroAccount = (timeZone: string): Account => {
	return {
		apiKey: crypto.randomBytes(12).toString("hex"),
		connection: null,
		settings: {
			timeZone,
			emailsEnabled: true,
			emailFormat: "html",
		},
	}
}

export { Account }
