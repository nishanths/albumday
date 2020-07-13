"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = express_1.default();
app.use("/", (req, res) => {
    res.status(200).send("hello, world!").end();
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`);
    console.log('press ctrl+c to quit');
});
