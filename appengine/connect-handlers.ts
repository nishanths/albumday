import * as crypto from "crypto"
import { Service, scrobbleAPIBaseURL } from "shared"
import { URLSearchParams } from "url"
import { RequestHandler, Request } from "express"
import { currentEmail } from "./cookie"
import axios, { AxiosError } from "axios"
import { RedisClient, logRedisError, updateEntity } from "./redis"
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
	p.set("scope", "user-library-read user-top-read")
	p.set("show_dialog", "false")

	res.cookie(cookieNameState, stateJSON, { maxAge: 30 * 60 * 1000, httpOnly: true, signed: true })
	res.redirect("https://accounts.spotify.com/authorize?" + p.toString())
}

type SpotifyCallback = { state: string } & (
	| { code: string, error: undefined | null | "" }
	| { error: string, code: undefined | null | "" }
)

export const authSpotifyHandler = (spotifyClientID: string, spotifyClientSecret: string, redis: RedisClient): RequestHandler => async (req, res) => {
	const errorRedirect = "/birthdays?connect-error=1"
	const successRedirect = "/birthdays?connect-success=1"

	const c = req.query as SpotifyCallback
	if (c.error !== undefined && c.error !== null && c.error !== "") {
		res.clearCookie(cookieNameState)
		res.redirect(errorRedirect)
		return
	}

	// validate state
	const incomingState = JSON.parse(c.state) as StateCookie
	const cookieStateJSON = req.signedCookies[cookieNameState] as string | undefined
	if (cookieStateJSON === undefined) {
		res.clearCookie(cookieNameState)
		res.status(400).send("missing state cookie").end()
		return
	}
	const cookieState = JSON.parse(cookieStateJSON) as StateCookie
	if (cookieState.state !== incomingState.state) {
		res.clearCookie(cookieNameState)
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
		const err = e as AxiosError
		console.error("spotify api token:", err.message)
		res.clearCookie(cookieNameState)
		res.redirect(errorRedirect)
		return
	}

	const accountEmail = cookieState.email

	try {
		await updateEntity<Account>(redis, accountKey(accountEmail), a => {
			return {
				...a,
				connection: {
					service: "spotify",
					refreshToken: tokenRsp.refresh_token,
					error: null,
				},
			}
		})
		res.clearCookie(cookieNameState)
		res.redirect(successRedirect)
	} catch {
		res.clearCookie(cookieNameState)
		res.redirect(errorRedirect)
	}
}

type SpotifyTokenResponse = {
	access_token: string
	token_type: "Bearer"
	scope: string
	expires_in: number
	refresh_token: string
}

const spotifyRedirectURL = (userReq: Request) => userReq.protocol + "://" + userReq.get("host") + "/auth/spotify"

export const connectScrobbleHandler = (redis: RedisClient): RequestHandler => async (req, res) => {
	const email = currentEmail(req)
	if (email === null) {
		// TODO: also support API key header
		res.status(401).end()
		return
	}

	const scrobbleUsername = req.query["username"]
	if (scrobbleUsername === undefined || typeof scrobbleUsername !== "string" || scrobbleUsername === "") {
		res.status(400).end()
		return
	}

	const params = new URLSearchParams()
	params.set("username", scrobbleUsername)
	params.set("limit", "" + 0)
	const scrobbleURL = scrobbleAPIBaseURL + "/scrobbled?" + params.toString()

	try {
		await axios.get(scrobbleURL)
	} catch (e) {
		const err = e as AxiosError
		console.error("get scrobbled", err.message)
		if (err.response?.status === 403) {
			// profile is private
			res.status(409).send("profile appears to be private").end()
			return
		}
		if (err.response?.status === 404) {
			res.status(404).send("profile appears to be missing").end()
			return
		}
		res.status(500).end()
		return
	}

	try {
		await updateEntity<Account>(redis, accountKey(email), a => {
			return {
				...a,
				connection: {
					service: "scrobble",
					username: scrobbleUsername,
					error: null,
				},
			}
		})
		res.status(200).end()
	} catch {
		res.status(500).end()
	}
}


