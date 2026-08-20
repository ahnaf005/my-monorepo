import bcrypt from "bcryptjs";
import type { Note, User } from "@myapp/shared";

// In-memory "database" for demo purposes only. The two things worth noticing:
//  1. Passwords are never stored in plaintext — only a bcrypt hash.
//  2. Notes are looked up by ownership (userId), never by trusting a client-
//     supplied id. That's what keeps /notes/search IDOR-safe (see SECURITY.md).

interface StoredUser extends User {
    passwordHash: string;
}

const users: StoredUser[] = [
    {
        id: 1,
        name: "Ada Lovelace",
        email: "ada@example.com",
        passwordHash: bcrypt.hashSync("correct-horse-battery-staple", 10),
    },
    {
        id: 2,
        name: "Alan Turing",
        email: "alan@example.com",
        passwordHash: bcrypt.hashSync("hunter2-but-actually-strong", 10),
    },
];

const notes: (Note & { userId: number })[] = [
    { id: 1, userId: 1, title: "Shopping list", content: "Punch cards, tea" },
    { id: 2, userId: 1, title: "Analytical Engine", content: "Loop iteration notes" },
    { id: 3, userId: 2, title: "Enigma", content: "Bombe design ideas" },
    { id: 4, userId: 2, title: "Reading list", content: "Computable numbers paper" },
];

export function findUserByEmail(email: string): StoredUser | undefined {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: number): User | undefined {
    const user = users.find((u) => u.id === id);
    if (!user) return undefined;
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
}

export function searchNotesForUser(userId: number, query: string): Note[] {
    const needle = query.toLowerCase();
    return notes
        .filter((n) => n.userId === userId) // ownership check — never trust a client-supplied userId
        .filter(
            (n) =>
                n.title.toLowerCase().includes(needle) ||
                n.content.toLowerCase().includes(needle),
        )
        .map(({ id, title, content }) => ({ id, title, content }));
}
