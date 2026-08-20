import { Router } from "express";
import type { SearchResponse } from "@myapp/shared";
import { requireAuth } from "../auth.js";
import { searchNotesForUser } from "../db.js";
import { searchQuerySchema } from "../validation.js";

export const searchRouter = Router();

searchRouter.get("/notes/search", requireAuth, (req, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: "Missing or invalid 'q' query parameter" });
        return;
    }

    // Scoped to req.userId (from the verified token), not a client-supplied
    // id — and matched with a plain array filter, not a hand-built SQL
    // string, so there's no injection surface here at all. See SECURITY.md
    // for what the vulnerable version of this line looks like.
    const notes = searchNotesForUser(req.userId!, parsed.data.q);
    res.json({ notes } satisfies SearchResponse);
});
