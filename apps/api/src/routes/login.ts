import bcrypt from "bcryptjs";
import { Router } from "express";
import type { LoginResponse } from "@myapp/shared";
import { AUTH_COOKIE_NAME, signToken } from "../auth.js";
import { findUserByEmail } from "../db.js";
import { env } from "../env.js";
import { loginSchema } from "../validation.js";

export const loginRouter = Router();

loginRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid email or password format" });
        return;
    }
    const { email, password } = parsed.data;

    const user = findUserByEmail(email);

    // Compare against a real hash even on a miss, so a nonexistent-email
    // request and a wrong-password request take roughly the same time.
    // Otherwise the response latency itself leaks which emails are
    // registered (a timing side-channel).
    const passwordHash = user?.passwordHash ?? "$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsal";
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordMatches) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }

    const token = signToken(user.id);

    // httpOnly: client-side JS (and therefore any XSS payload) can never
    // read this cookie. secure: only sent over HTTPS once deployed.
    // sameSite=lax: not attached to cross-site requests, which is most of
    // what CSRF protection needs for a cookie-based session like this.
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
    });

    const { passwordHash: _unused, ...publicUser } = user;
    res.json({ user: publicUser } satisfies LoginResponse);
});
