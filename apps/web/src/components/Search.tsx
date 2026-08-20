import { useState } from "react";
import type { Note } from "@myapp/shared";
import { searchNotes } from "../api";

export function Search() {
    const [q, setQ] = useState("");
    const [notes, setNotes] = useState<Note[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            const result = await searchNotes(q);
            setNotes(result.notes);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed");
        }
    }

    return (
        <div className="panel">
            <h2>Search my notes</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. engine"
                />
                <button type="submit">Search</button>
            </form>
            {error && <p className="error">{error}</p>}
            {notes && (
                <ul>
                    {notes.length === 0 && <li>No matches</li>}
                    {notes.map((note) => (
                        <li key={note.id}>
                            <strong>{note.title}</strong>: {note.content}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
