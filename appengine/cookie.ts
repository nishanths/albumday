import { Service } from "shared"
import { Request } from "express"

export const cookieNameIdentity = "albumday:identity"

export const cookieValidityIdentityMs = 30 * 60 * 60 * 1000 // 30 days

export type IdentityCookie = {
	email: string
}

export function currentEmail(req: Request): string | null {
	const idJSON = req.signedCookies[cookieNameIdentity] as string | undefined
	if (idJSON === undefined) {
		return null
	}
	try {
		const { email } = JSON.parse(idJSON) as IdentityCookie
		return email
	} catch {
		return null
	}
}
