import { Router } from "express";
import type { ProfileResponse } from "@myapp/shared";
import { requireAuth } from "../auth.js";
import { findUserById } from "../db.js";

export const profileRouter = Router();

profileRouter.get("/profile", requireAuth, (req, res) => {
    // req.userId comes from the verified JWT, never from a query param or
    // body field — a client can never ask for someone else's profile by
    // guessing an id (that would be an IDOR vulnerability; see SECURITY.md).
    const user = findUserById(req.userId!);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ user } satisfies ProfileResponse);
});
