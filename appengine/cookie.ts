import { Service } from "shared"
import { Request } from "express"

export const cookieNameIdentitiy = "albumday:identity"

type IdentityCookie = {
	accountID: string
}

export function currentAccountID(req: Request): string | null {
	const idJSON = req.signedCookies[cookieNameIdentitiy] as string | undefined
	if (idJSON === undefined) {
		return null
	}
	const { accountID } = JSON.parse(idJSON) as IdentityCookie
	return accountID
}
