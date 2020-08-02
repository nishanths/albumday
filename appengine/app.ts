import express from "express"
import { quote } from "shared"
import { env } from "./env"
import { loadConfig } from "./config"
import { newRedis } from "./redis"
import { newEmail } from "./email"
import cookieParser from "cookie-parser"
import { connectSpotifyHandler, authSpotifyHandler } from "./connect"
import { startHandler } from "./apphandlers"
import { passphraseHandler, loginHandler } from "./apihandlers"
import { newDatastore } from "./datastore"

const main = async () => {
	const ds = newDatastore()
	const config = await loadConfig(env(), ds)

	const app = express()
	app.set("view engine", "hbs")
	app.use(express.static("static", { index: false, cacheControl: false }))
	app.use(cookieParser(config.cookieSecret))

	const redis = newRedis(config)
	const emailc = newEmail(env(), config.sendgridAPIKey)

	const mainRouter = express.Router({ caseSensitive: true, strict: true })
	const apiRouter = express.Router({ caseSensitive: true, strict: true })

	mainRouter.get("/", (req, res) => {
		res.render("index", {
			title: "Albumday",
			bootstrapJSON: quote(JSON.stringify({ loggedIn: false }))
		})
	})
	mainRouter.get("/start/?", startHandler)
	mainRouter.get("/connect/spotify", connectSpotifyHandler(config.spotifyClientID))
	mainRouter.get("/auth/spotify", authSpotifyHandler(config.spotifyClientID, config.spotifyClientSecret))

	// 404 handler
	mainRouter.use((req, res) => { res.status(404).send("not found") })

	apiRouter.post("/passphrase", passphraseHandler(redis, emailc))
	apiRouter.post("/login", loginHandler(redis))

	// 404 handler
	apiRouter.use((req, res) => { res.status(404) })

	app.use("/api/v1", apiRouter)
	app.use("/", mainRouter)

	const PORT = process.env.PORT || 8080;
	app.listen(PORT, () => {
		console.log(`app listening on port ${PORT}, env ${env()}`);
		console.log('press ctrl+c to quit');
	});
}

main()

