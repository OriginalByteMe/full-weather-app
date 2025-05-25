import "dotenv/config";
import { RPCHandler } from "@orpc/server/node";
import cors from "cors";
import express from "express";
import { appRouter, weatherRouter } from "./routers";

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "",
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(express.json());

app.use("/weather", weatherRouter);

const orpcHandler = new RPCHandler(appRouter);
app.use("/{*path}", async (req, res, next) => {
	const { matched } = await orpcHandler.handle(req, res, {
		prefix: "/", 
		context: { session: null },
	});
	if (matched) return;
	next();
});


app.get("/healthcheck", (_req, res) => {
	res.status(200).send("Server is OK.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
