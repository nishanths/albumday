import express from "express"

const app = express()
app.set("view engine", "hbs")
app.use(express.static("static", { index: false }))

const mainRouter = express.Router({
	caseSensitive: true,
	strict: true,
})

mainRouter.get("/", (req, res) => {
	res.render("index", { title: "Albumday" })
})

mainRouter.use((req, res) => {
	res.status(404).send("not found")
})

app.use("/", mainRouter)

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`app listening on port ${PORT}, env ${process.env.NODE_ENV}`);
	console.log('press ctrl+c to quit');
});
