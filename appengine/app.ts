import express, { RequestHandler } from "express"
import bodyParser from "body-parser"
import { quote } from "shared"
import { env, devPort } from "./env"
import { loadConfig } from "./config"
import { newRedis } from "./redis"
import { newEmail } from "./email"
import cookieParser from "cookie-parser"
import { connectSpotifyHandler, authSpotifyHandler } from "./connect"
import { indexHandler, startHandler, feedHandler, logoutHandler } from "./app-handlers"
import { passphraseHandler, loginHandler, accountHandler } from "./api-handlers"
import { cronDailyEmailHandler, taskDailyEmailHandler } from "./internal-handlers"
import { newDatastore } from "./datastore"
import { currentEmail } from "./cookie"
import { requireTasksSecret, newTasksClient } from "./cloud-tasks"

const main = async () => {
	const ds = newDatastore()
	const tasks = newTasksClient()
	const config = await loadConfig(env(), ds)
	// NOTE: separate redis clients are required if using transaction commands
	const redis = newRedis(config)
	const emailc = newEmail(env(), config.sendgridAPIKey)

	const app = express()
	app.set("view engine", "hbs")
	app.use(express.static("static", { index: false }))
	app.use(cookieParser(config.cookieSecret))
	const jsonParser = bodyParser.json()

	const mainRouter = express.Router({ caseSensitive: true, strict: true })
	const apiRouter = express.Router({ caseSensitive: true, strict: true })

	mainRouter.use(logRequestAuthentication)
	apiRouter.use(logRequestAuthentication)

	// routes
	mainRouter.get("/", indexHandler)
	mainRouter.get("/start/?", startHandler)
	mainRouter.get("/feed/?", feedHandler(redis))
	mainRouter.get("/settings/?", feedHandler(redis)) // TODO
	mainRouter.get("/logout/?", logoutHandler)
	mainRouter.get("/connect/spotify", connectSpotifyHandler(config.spotifyClientID))
	mainRouter.get("/auth/spotify", authSpotifyHandler(config.spotifyClientID, config.spotifyClientSecret, redis))
	// TODO /connect/scrobble/
	mainRouter.post("/internal/cron/daily-email", requireCronHeader, cronDailyEmailHandler(redis, tasks, config.tasksSecret))
	mainRouter.post("/internal/task/daily-email", requireTasksSecret(config.tasksSecret), jsonParser, taskDailyEmailHandler(redis))

	apiRouter.post("/passphrase", passphraseHandler(redis, emailc))
	apiRouter.post("/login", loginHandler(redis))
	apiRouter.get("/account", accountHandler(redis))

	// 404 handlers
	mainRouter.use((req, res) => { res.status(404).send("not found") })
	apiRouter.use((req, res) => { res.status(404) })

	app.use("/api/v1", apiRouter)
	app.use("/", mainRouter)

	const PORT = process.env.PORT || devPort;
	app.listen(PORT, () => {
		console.log(`app listening on port ${PORT}, env ${env()}`);
		console.log('press ctrl+c to quit');
	});
}

const logRequestAuthentication: RequestHandler = (req, res, next) => {
	// TODO also support API key
	const email = currentEmail(req)
	const s = email === null ? "unauthenticated user" : email
	console.log(`request from ${s}`)
	next()
}

const requireCronHeader: RequestHandler = (req, res, next) => {
	if (req.headers["x-appengine-cron"] === "true") {
		next()
		return
	}
	res.status(403).send("bad header").end()
}

main()

