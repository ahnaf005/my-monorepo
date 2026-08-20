import { z } from "zod";

// Every value coming from the network is `unknown` at runtime no matter what
// the TypeScript types on req.body claim — TS types are erased at compile
// time and enforce nothing once the server is running. These schemas are the
// actual runtime boundary; the inferred types below just let the rest of the
// app stay type-safe after that boundary is crossed.

export const loginSchema = z.object({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const searchQuerySchema = z.object({
    q: z.string().trim().min(1).max(100),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
