import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const AUTH_COOKIE_NAME = "token";

interface TokenPayload {
    userId: number;
}

export function signToken(userId: number): string {
    return jwt.sign({ userId } satisfies TokenPayload, env.JWT_SECRET, {
        expiresIn: "15m",
    });
}

// Augment Express's Request type rather than using `any` — this is the
// type-safe way to attach the authenticated user id, and it means a route
// that forgets to check req.userId gets a compile error, not a silent bug.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== "string") {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (typeof decoded !== "object" || typeof decoded.userId !== "number") {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
        req.userId = decoded.userId;
        next();
    } catch {
        // Don't leak *why* verification failed (expired vs. tampered vs.
        // malformed) — that detail only helps an attacker.
        res.status(401).json({ error: "Not authenticated" });
    }
}
