import * as crypto from "crypto"
import { Service } from "shared"
import { URLSearchParams } from "url"
import { RequestHandler, Request } from "express"
import { currentAccountID } from "./cookie"
import axios from "axios"

const cookieNameState = "albumday:state"

type StateCookie = {
	state: string
	accountID: string
	service: Service
}

function stateParam(): string {
	return crypto.randomBytes(32).toString("hex")
}

export const connectSpotifyHandler = (spotifyClientID: string): RequestHandler => (req, res) => {
	const accountID = currentAccountID(req)
	if (accountID === null) {
		res.status(400).send("no account ID").end()
		return
	}

	const state: StateCookie = {
		state: stateParam(),
		accountID,
		service: "spotify",
	}
	const stateJSON = JSON.stringify(state)

	const p = new URLSearchParams()
	p.set("client_id", spotifyClientID)
	p.set("response_type", "code")
	p.set("redirect_uri", spotifyRedirectURL(req))
	p.set("state", stateJSON)
	p.set("scope", "user-library-read user-top-read")
	p.set("show_dialog", "false")

	res.cookie(cookieNameState, stateJSON, { maxAge: 30 * 60 * 1000, httpOnly: true, signed: true })
	res.redirect("https://accounts.spotify.com/authorize?" + p.toString())
}

type SpotifyCallback = { state: string } & (
	| { code: string, error: undefined | null | "" }
	| { error: string, code: undefined | null | "" }
)

export const authSpotifyHandler = (spotifyClientID: string, spotifyClientSecret: string): RequestHandler => async (req, res) => {
	const c = req.query as SpotifyCallback

	if (c.error !== undefined && c.error !== null && c.error !== "") {
		res.redirect("/configure")
		return
	}

	// validate state
	const incomingState = JSON.parse(c.state) as StateCookie
	const cookieStateJSON = req.signedCookies[cookieNameState] as string | undefined
	if (cookieStateJSON === undefined) {
		res.status(400).send("missing state cookie").end()
		return
	}
	const cookieState = JSON.parse(cookieStateJSON) as StateCookie
	if (cookieState.state !== incomingState.state) {
		res.status(500).send("state mismatch").end()
		return
	}

	// fetch tokens
	const p = new URLSearchParams()
	p.set("grant_type", "authorization_code")
	p.set("code", c.code!)
	p.set("redirect_uri", spotifyRedirectURL(req))
	p.set("client_id", spotifyClientID)
	p.set("client_secret", spotifyClientSecret)
	const tokenRsp = await axios.post<SpotifyTokenResponse>("https://accounts.spotify.com/api/token", p.toString(), { responseType: "json" })

	// update redis for accountID
	console.log(tokenRsp.data.refresh_token)

	res.redirect("/configure")
}

type SpotifyTokenResponse = {
	access_token: string
	token_type: "Bearer"
	scope: string
	expires_in: number
	refresh_token: string
}

const spotifyRedirectURL = (req: Request) => req.protocol + "://" + req.get("host") + "/auth/spotify"
