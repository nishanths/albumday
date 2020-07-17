import express from "express"
import { quote } from "shared/string"
import { env } from "./env"
import { config } from "./config"

const app = express()
app.set("view engine", "hbs")
app.use(express.static("static", { index: false, cacheControl: false }))

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
	console.log(`app listening on port ${PORT}, env ${env()}, config ${config}`);
	console.log('press ctrl+c to quit');
});
