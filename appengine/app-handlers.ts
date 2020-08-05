import { RequestHandler } from "express"
import { quote, Bootstrap } from "shared"
import { currentEmail, cookieNameIdentity } from "./cookie"
import { RedisClient } from "./redis"

export const indexHandler: RequestHandler = (req, res) => {
	const current = currentEmail(req)

	const bootstrap: Bootstrap = {
		loggedIn: current !== null,
		email: current,
	}
	res.render("index", {
		title: "album birthdays",
		bootstrapJSON: quote(JSON.stringify(bootstrap))
	})
}

export const startHandler: RequestHandler = (req, res) => {
	// for hard-visits, clear cookie and show login page
	res.clearCookie(cookieNameIdentity)
	const bootstrap: Bootstrap = {
		loggedIn: false,
		email: null,
	}
	res.render("index", {
		title: "album birthdays",
		bootstrapJSON: quote(JSON.stringify(bootstrap))
	})
}

export const feedHandler = (redis: RedisClient): RequestHandler => (req, res) => {
	const current = currentEmail(req)

	if (current === null) {
		res.redirect("/start")
		return
	}

	const bootstrap: Bootstrap = {
		loggedIn: current !== null,
		email: current,
	}
	res.render("index", {
		title: "album birthdays",
		bootstrapJSON: quote(JSON.stringify(bootstrap))
	})
}

export const logoutHandler: RequestHandler = (req, res) => {
	res.clearCookie(cookieNameIdentity)
	res.redirect("/")
}
