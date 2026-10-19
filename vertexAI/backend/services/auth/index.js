import "dotenv/config";
import express from "express";
import { connectDb } from "./config/db.js";
import authRouter from "./routes/auth.route.js";
const port = process.env.PORT || 8001;

const app = express();

connectDb();

app.use(express.json());
app.use("/", authRouter);

app.get("/", (req, res) => {
    res.json({ "message": "hello from auth" });
});

app.listen(port, () => {
    console.log(`auth started at ${port}`);
});
