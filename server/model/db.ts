import { SQLOutputValue } from "node:sqlite";
import {VoteCastMessage} from "./webSocket.ts";
import {PollOption} from "./option.ts";
import {Poll} from "./poll.ts";
import {User} from "./user.ts";
import {Vote} from "./vote.ts";

/**
 * Database Row Types
 */

// Poll
export interface PollRow {
    id: string;
    title: string;
    description: string | null;
    user_id: string | null;
    created_at: string;
    expires_at: string | null;
    is_active: number;
    requires_auth: number;
    [key: string]: SQLOutputValue; // Index signature
}

// Option
export interface PollOptionRow {
    id: string;
    poll_id: string;
    text: string;
    vote_count: number;
    [key: string]: SQLOutputValue; // Index signature
}

// Utilisateur
export interface UserRow {
    id: string;
    username: string;
    password_hash: string;
    is_admin: number;
    created_at: string;
    [key: string]: SQLOutputValue; // Index signature
}

// Vote
export interface VoteRow {
    id: string;
    poll_id: string;
    option_id: string;
    user_id: string | null;
    created_at: string;
    [key: string]: SQLOutputValue; // Index signature
}

/* Type de garde */
// Poll
export function isPollRow(obj: Record<string, SQLOutputValue>): obj is PollRow {
    return !!obj &&
        typeof obj === "object" &&
        "id" in obj && typeof obj.id === "string" &&
        "title" in obj && typeof obj.title === "string" &&
        "description" in obj &&
        (typeof obj.description === "string" || obj.description === null) &&
        "user_id" in obj &&
        (typeof obj.user_id === "string" || obj.user_id === null) &&
        "created_at" in obj && typeof obj.created_at === "string" &&
        "expires_at" in obj &&
        (typeof obj.expires_at === "string" || obj.expires_at === null) &&
        "is_active" in obj && typeof obj.is_active === "number" &&
        "requires_auth" in obj && typeof obj.requires_auth === "number";
}

// Option
export function isPollOptionRow(
    obj: Record<string, SQLOutputValue>,
): obj is PollOptionRow {
    return !!obj &&
        typeof obj === "object" &&
        "id" in obj && typeof obj.id === "string" &&
        "poll_id" in obj && typeof obj.poll_id === "string" &&
        "text" in obj && typeof obj.text === "string" &&
        "vote_count" in obj && typeof obj.vote_count === "number";
}

// Utilisateur
export function isUserRow(obj: Record<string, SQLOutputValue>): obj is UserRow {
    return !!obj &&
        typeof obj === "object" &&
        "id" in obj && typeof obj.id === "string" &&
        "username" in obj && typeof obj.username === "string" &&
        "password_hash" in obj && typeof obj.password_hash === "string" &&
        "is_admin" in obj && typeof obj.is_admin === "number" &&
        "created_at" in obj && typeof obj.created_at === "string";
}

// Vote
export function isVoteRow(obj: Record<string, SQLOutputValue>): obj is VoteRow {
    return !!obj &&
        typeof obj === "object" &&
        "id" in obj && typeof obj.id === "string" &&
        "poll_id" in obj && typeof obj.poll_id === "string" &&
        "option_id" in obj && typeof obj.option_id === "string" &&
        "user_id" in obj &&
        (typeof obj.user_id === "string" || obj.user_id === null) &&
        "created_at" in obj && typeof obj.created_at === "string";
}

// Message du vote
export function isVoteCastMessage(obj: unknown): obj is VoteCastMessage {
    return (
        typeof obj === "object" &&
        obj !== null &&
        (obj as any).type === "vote_cast" &&
        typeof (obj as any).pollId === "string" &&
        typeof (obj as any).optionId === "string" &&
        (
            (obj as any).userId === undefined ||
            typeof (obj as any).userId === "string"
        )
    );
}

/**
 * Conversion Helpers
 */

// Option vers API
export function pollOptionRowToApi(
    row: PollOptionRow,
): PollOption {
    return {
        id: row.id,
        text: row.text,
        voteCount: row.vote_count,
    };
}

// Poll vers API
export function pollRowToApi(
    row: PollRow,
    optionRows: PollOptionRow[],
): Poll {
    return {
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        userId: row.user_id ?? undefined,
        expiresAt: row.expires_at ?? undefined,
        isActive: row.is_active === 1,
        requiresAuth: row.requires_auth === 1,
        options: optionRows.map(pollOptionRowToApi),
    };
}

// API vers Option
export function pollOptionApiToRow(
    pollId: string,
    option: PollOption,
): PollOptionRow {
    return <PollOptionRow>{
        id: option.id,
        poll_id: pollId,
        text: option.text,
        vote_count: option.voteCount,
    };
}

// API vers Poll
export function pollApiToRow(poll: Poll): [{
    id: string;
    title: string;
    description: string | null;
    user_id: string | null;
    created_at: string;
    expires_at: string | null;
    is_active: number;
    requires_auth: number;
}, PollOptionRow[]] {
    return [
        {
            id: poll.id,
            title: poll.title,
            description: poll.description ?? null,
            user_id: poll.userId ?? null,
            created_at: poll.createdAt,
            expires_at: poll.expiresAt ?? null,
            is_active: Number(poll.isActive),
            requires_auth: Number(poll.requiresAuth),
        },
        poll.options.map((pollOption) => pollOptionApiToRow(poll.id, pollOption)),
    ];
}

// Utilisateur vers API
export function userRowToApi(row: UserRow): User {
    return {
        id: row.id,
        username: row.username,
        isAdmin: row.is_admin === 1,
        createdAt: row.created_at,
    };
}
// Vote vers API
export function voteRowToApi(row: VoteRow): Vote {
    return {
        id: row.id,
        pollId: row.poll_id,
        optionId: row.option_id,
        userId: row.user_id ?? undefined,
        createdAt: row.created_at,
    };
}
