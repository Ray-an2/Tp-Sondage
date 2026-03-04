import type { APIError } from "./api.ts";

export interface VoteCastMessage {
  type: "vote_cast";
  pollId: string;
  optionId: string;
  userId?: string;
}

export interface VoteAckMessageFailure {
  type: "vote_ack";
  pollId?: string;
  optionId?: string;
  success: false;
  error: APIError;
}

export interface VoteAckMessageSuccess {
  type: "vote_ack";
  pollId?: string;
  optionId?: string;
  success: true;
  error?: never;
}

export type VoteAckMessage = VoteAckMessageFailure | VoteAckMessageSuccess;

export interface VotesUpdateMessage {
  type: "votes_update";
  pollId: string;
  optionId: string;
  voteCount: number;
}

export function isVoteAckMessage(value: unknown): value is VoteAckMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as any).type !== "vote_ack" ||
    typeof (value as any).success !== "boolean"
  ) {
    return false;
  }
  if ((value as any).success === false) {
    return (
      typeof (value as any).error === "object" &&
      (value as any).error !== null &&
      typeof (value as any).error.code === "string" &&
      typeof (value as any).error.message === "string"
    );
  }
  return true;
}

export function isVotesUpdateMessage(
  value: unknown,
): value is VotesUpdateMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as any).type === "votes_update" &&
    typeof (value as any).pollId === "string" &&
    typeof (value as any).optionId === "string" &&
    typeof (value as any).voteCount === "number"
  );
}
