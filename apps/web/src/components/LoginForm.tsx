import { useState } from "react";
import type { User } from "@myapp/shared";
import { login } from "../api";

interface LoginFormProps {
    onLoggedIn: (user: User) => void;
}

export function LoginForm({ onLoggedIn }: LoginFormProps) {
    const [email, setEmail] = useState("ada@example.com");
    const [password, setPassword] = useState("correct-horse-battery-staple");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
            const { user } = await login({ email, password });
            onLoggedIn(user);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="panel">
            <h2>Log in</h2>
            <label>
                Email
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                />
            </label>
            <label>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
            </label>
            <button type="submit" disabled={pending}>
                {pending ? "Logging in..." : "Log in"}
            </button>
            {error && <p className="error">{error}</p>}
            <p className="hint">
                Try the seeded user above, or alan@example.com / hunter2-but-actually-strong
            </p>
        </form>
    );
}
