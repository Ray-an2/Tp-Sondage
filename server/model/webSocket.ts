/**
 * WebSockets
 */
import {APIError} from "./reponse.ts";

// Requêtes
export interface VoteCastMessage {
    type: "vote_cast";
    pollId: string;
    optionId: string;
    userId?: string;
}

// Response: acknowledge
export interface VoteAckMessage {
    type: "vote_ack";
    pollId: string;
    optionId: string;
    success: boolean;
    error?: APIError;
}

// Response: Mise à jour du vote
export interface VotesUpdateMessage {
    type: "votes_update";
    pollId: string;
    optionId: string;
    voteCount: number;
}