import {PollOption} from "./option.ts";
export interface Poll {
    id: string;
    title: string;
    description?: string;
    options: PollOption[];
    userId?: string;
    createdAt: string;
    expiresAt?: string;
    isActive: boolean;
    requiresAuth: boolean;
}
