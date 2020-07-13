import express from "express"

const app = express()

app.use("/", (req, res) => {
	res.status(200).send("hello, world!").end()
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`app listening on port ${PORT}`);
	console.log('press ctrl+c to quit');
});
