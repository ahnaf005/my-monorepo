export interface User {
    id: number;
    name: string;
    email: string;
}

export interface Note {
    id: number;
    title: string;
    content: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
}

export interface ProfileResponse {
    user: User;
}

export interface SearchResponse {
    notes: Note[];
}

export interface ApiErrorResponse {
    error: string;
}
