import express from "express";

const app = express();

app.get("/", (_req, res) => {
    res.json({ message: "Hello from API" });
});

app.listen(3000, () => {
    console.log("API running on port 3000");
});