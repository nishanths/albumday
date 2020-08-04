import * as crypto from "crypto"
import { Service } from "shared"
import { URLSearchParams } from "url"
import { RequestHandler, Request } from "express"
import { currentEmail } from "./cookie"
import axios from "axios"
import { RedisClient, logRedisError } from "./redis"
import { accountKey, Account } from "./account"

const cookieNameState = "albumday:state"

type StateCookie = {
	state: string
	email: string
	service: Service
}

function stateParam(): string {
	return crypto.randomBytes(32).toString("hex")
}

export const connectSpotifyHandler = (spotifyClientID: string): RequestHandler => (req, res) => {
	const email = currentEmail(req)
	if (email === null) {
		res.status(400).send("no account ID").end()
		return
	}

	const state: StateCookie = {
		state: stateParam(),
		email,
		service: "spotify",
	}
	const stateJSON = JSON.stringify(state)

	const p = new URLSearchParams()
	p.set("client_id", spotifyClientID)
	p.set("response_type", "code")
	p.set("redirect_uri", spotifyRedirectURL(req))
	p.set("state", stateJSON)
	p.set("scope", "user-read-email user-library-read user-top-read")
	p.set("show_dialog", "false")

	res.cookie(cookieNameState, stateJSON, { maxAge: 30 * 60 * 1000, httpOnly: true, signed: true })
	res.redirect("https://accounts.spotify.com/authorize?" + p.toString())
}

type SpotifyCallback = { state: string } & (
	| { code: string, error: undefined | null | "" }
	| { error: string, code: undefined | null | "" }
)

export const authSpotifyHandler = (spotifyClientID: string, spotifyClientSecret: string, redis: RedisClient): RequestHandler => async (req, res) => {
	const c = req.query as SpotifyCallback

	if (c.error !== undefined && c.error !== null && c.error !== "") {
		res.redirect("/feed")
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

	let tokenRsp: SpotifyTokenResponse
	try {
		const r = await axios.post<SpotifyTokenResponse>("https://accounts.spotify.com/api/token", p.toString(), { responseType: "json" })
		tokenRsp = r.data
	} catch (e) {
		console.error("spotify api token:", e)
		res.redirect("/feed")
		return
	}

	const accountEmail = cookieState.email

	// XXX: requires transaction
	redis.GET(accountKey(accountEmail), (err, reply) => {
		if (err) {
			logRedisError(err, "get account")
			res.redirect("/feed")
			return
		}
		if (reply === null) {
			console.error("unexpected null reply for account: " + accountEmail)
			res.redirect("/feed")
			return
		}

		const account = JSON.parse(reply) as Account
		account.connection = {
			service: "spotify" as const,
			refreshToken: tokenRsp.refresh_token,
			error: null,
		}

		redis.SET(accountKey(accountEmail), JSON.stringify(account), err => {
			if (err) {
				logRedisError(err, "set account")
				res.redirect("/feed")
				return
			}

			res.redirect("/feed")
		})
	})
}

type SpotifyTokenResponse = {
	access_token: string
	token_type: "Bearer"
	scope: string
	expires_in: number
	refresh_token: string
}

const spotifyRedirectURL = (userReq: Request) => userReq.protocol + "://" + userReq.hostname + "/auth/spotify"
