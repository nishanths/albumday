import express from "express"
import { quote } from "shared"
import { env } from "./env"
import { loadConfig } from "./config"
import { newRedis } from "./redis"
import { newEmail } from "./email"
import cookieParser from "cookie-parser"
import { connectSpotifyHandler, authSpotifyHandler } from "./connect"
import { indexHandler, startHandler, feedHandler, logoutHandler } from "./app-handlers"
import { passphraseHandler, loginHandler, accountHandler } from "./api-handlers"
import { newDatastore } from "./datastore"

const main = async () => {
	const ds = newDatastore()
	const config = await loadConfig(env(), ds)

	const app = express()
	app.set("view engine", "hbs")
	app.use(express.static("static", { index: false }))
	app.use(cookieParser(config.cookieSecret))

	// NOTE: separate redis clients are required if using transaction commands
	const redis = newRedis(config)
	const emailc = newEmail(env(), config.sendgridAPIKey)

	const mainRouter = express.Router({ caseSensitive: true, strict: true })
	const apiRouter = express.Router({ caseSensitive: true, strict: true })

	mainRouter.get("/", indexHandler)
	mainRouter.get("/start/?", startHandler)
	mainRouter.get("/feed/?", feedHandler(redis))
	mainRouter.get("/settings/?", feedHandler(redis)) // TODO
	mainRouter.get("/logout/?", logoutHandler)
	mainRouter.get("/connect/spotify", connectSpotifyHandler(config.spotifyClientID))
	mainRouter.get("/auth/spotify", authSpotifyHandler(config.spotifyClientID, config.spotifyClientSecret))
	// TODO /connect/scrobble/

	apiRouter.post("/passphrase", passphraseHandler(redis, emailc))
	apiRouter.post("/login", loginHandler(redis))
	apiRouter.get("/account", accountHandler(redis))

	// 404 handlers
	mainRouter.use((req, res) => { res.status(404).send("not found") })
	apiRouter.use((req, res) => { res.status(404) })

	app.use("/api/v1", apiRouter)
	app.use("/", mainRouter)

	const PORT = process.env.PORT || 8080;
	app.listen(PORT, () => {
		console.log(`app listening on port ${PORT}, env ${env()}`);
		console.log('press ctrl+c to quit');
	});
}

// TODO currentEmail() logging middleware
// TODO require HTTPS in non-dev

main()

