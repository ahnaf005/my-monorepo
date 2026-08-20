import "dotenv/config";
import { z } from "zod";

// Runtime validation matters here because TypeScript's types vanish once the
// code compiles — process.env is `Record<string, string | undefined>` no
// matter what, and nothing stops a missing/malformed .env from reaching the
// server. Fail loudly at startup instead of failing weirdly at request time.
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    WEB_ORIGIN: z.url().default("http://localhost:5173"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters long")
        .optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:", z.treeifyError(parsed.error));
    process.exit(1);
}

const isProduction = parsed.data.NODE_ENV === "production";

if (!parsed.data.JWT_SECRET && isProduction) {
    console.error("JWT_SECRET is required in production.");
    process.exit(1);
}

if (!parsed.data.JWT_SECRET) {
    console.warn(
        "JWT_SECRET not set — using an insecure development-only default. " +
            "Never do this in production; see .env.example.",
    );
}

export const env = {
    ...parsed.data,
    isProduction,
    // The fallback below only ever runs in local dev (guarded above), so
    // tokens signed with it aren't a real-world risk — but this exact
    // shortcut, if it survived to production, is the "hardcoded secret"
    // vulnerability documented in SECURITY.md.
    JWT_SECRET: parsed.data.JWT_SECRET ?? "dev-only-insecure-secret-do-not-ship-this",
};
