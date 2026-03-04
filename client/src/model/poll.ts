import { isPollOption, type PollOption } from "./option.ts";

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

export function isPoll(value: unknown): value is Poll {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).id === "string" &&
    typeof (value as any).title === "string" &&
    (typeof (value as any).description === "string" ||
      typeof (value as any).description === "undefined") &&
    Array.isArray((value as any).options) &&
    (value as any).options.every(isPollOption) &&
    (typeof (value as any).userId === "string" ||
      typeof (value as any).userId === "undefined") &&
    typeof (value as any).createdAt === "string" &&
    (typeof (value as any).expiresAt === "string" ||
      typeof (value as any).expiresAt === "undefined") &&
    typeof (value as any).isActive === "boolean" &&
    typeof (value as any).requiresAuth === "boolean"
  );
}
