import express from "express"
import { quote } from "shared"
import { env } from "./env"
import { loadConfig } from "./config"
import { Datastore } from "@google-cloud/datastore"

const main = async () => {
	const app = express()
	app.set("view engine", "hbs")
	app.use(express.static("static", { index: false, cacheControl: false }))

	const ds = new Datastore()
	const config = await loadConfig(ds)

	const mainRouter = express.Router({
		caseSensitive: true,
		strict: true,
	})

	mainRouter.get("/", (req, res) => {
		res.render("index", {
			title: "Albumday",
			bootstrapJSON: quote(JSON.stringify({ loggedIn: false }))
		})
	})

	mainRouter.use((req, res) => {
		res.status(404).send("not found")
	})

	app.use("/", mainRouter)

	const PORT = process.env.PORT || 8080;
	app.listen(PORT, () => {
		console.log(`app listening on port ${PORT}, env ${env()}`);
		console.log("REMOVE ME", config.redisHost)
		console.log('press ctrl+c to quit');
	});
}

main()
