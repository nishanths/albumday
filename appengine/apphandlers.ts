import { RequestHandler } from "express"
import { quote } from "shared"

export const startHandler: RequestHandler = (req, res) => {
	res.render("index", {
		title: "albumday",
		bootstrapJSON: quote(JSON.stringify({ loggedIn: false }))
	})
}
