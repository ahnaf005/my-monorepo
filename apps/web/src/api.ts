import type {
    ApiErrorResponse,
    LoginRequest,
    LoginResponse,
    ProfileResponse,
    SearchResponse,
} from "@myapp/shared";

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`/api${path}`, {
        ...init,
        // Send the httpOnly auth cookie with every request. The app never
        // reads or stores the token itself — it lives only in the cookie.
        credentials: "include",
        headers: { "Content-Type": "application/json", ...init?.headers },
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new ApiError(body?.error ?? `Request failed (${res.status})`);
    }

    return res.json() as Promise<T>;
}

export function login(body: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>("/login", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function getProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>("/profile");
}

export function searchNotes(q: string): Promise<SearchResponse> {
    return request<SearchResponse>(`/notes/search?q=${encodeURIComponent(q)}`);
}
