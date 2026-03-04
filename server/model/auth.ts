import { Context, State } from "@oak/oak";
import {User} from "./user.ts";

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    isAdmin?: boolean;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface AuthPayload {
    userId: string;
    username: string;
    isAdmin: boolean;
    exp: number;
}

export interface AuthContext extends Context {
    state: AuthState;
    params: Record<string, string>;
}

export interface AuthState extends State {
    user?: AuthPayload;
}

export function isAuthPayload(value: unknown): value is AuthPayload {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as any).userId === "string" &&
        typeof (value as any).username === "string" &&
        typeof (value as any).isAdmin === "boolean" &&
        typeof (value as any).exp === "number"
    );
}
