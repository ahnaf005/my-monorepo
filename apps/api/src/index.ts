import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./env.js";
import { loginRouter } from "./routes/login.js";
import { profileRouter } from "./routes/profile.js";
import { searchRouter } from "./routes/search.js";

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: env.WEB_ORIGIN, // an explicit allowlist, not '*' — required for cookies to work anyway
        credentials: true,
    }),
);
app.use(express.json({ limit: "10kb" })); // caps body size against trivial memory-exhaustion payloads
app.use(cookieParser());

// Brute-force protection on the one endpoint where an attacker gets to guess
// a secret (the password). Doesn't fully stop credential stuffing, but stops
// naive scripted guessing.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api", loginLimiter, loginRouter);
app.use("/api", profileRouter);
app.use("/api", searchRouter);

app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Centralized error handler: never forward err.message/stack to the client.
// A thrown error (bad JSON body, a bug, whatever) could otherwise leak
// internal file paths or stack traces to whoever sent the request.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
});
