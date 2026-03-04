// Poll ID vers Websocket
import { DatabaseSync } from "node:sqlite";
import {VoteCastMessage, VotesUpdateMessage} from "../model/webSocket.ts";
import {APIErreurCode, APIException} from "../model/reponse.ts";

const subscriptions = new Map<string, Set<WebSocket>>();
function castVote(
    db: DatabaseSync,
    pollId: string,
    optionId: string,
    userId?: string,
): number {
    const voteId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const optionRow = db.prepare(`
        SELECT poll_id FROM poll_options
        WHERE id = ?;
    `).get(optionId);

    if (!optionRow || optionRow.poll_id !== pollId) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Option pas trouvée pour ce sondage"
        );
    }

    db.prepare(`INSERT INTO votes (id, poll_id, user_id, option_id, created_at)
        VALUES (?, ?, ?, ?, ?);`).run(
        voteId,
        pollId,
        userId ?? null,
        optionId,
        createdAt,
    );

    db.prepare(`UPDATE poll_options SET vote_count = vote_count + 1
                WHERE id = ?;`).run(optionId);

    const row = db.prepare(`SELECT vote_count FROM poll_options
        WHERE id = ?;`).get(optionId);

    if (!row) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Option pas trouvée"
        );
    }
    return row.vote_count as number;
}

export function subscribe(ws: WebSocket, pollId: string): void {
    if (!subscriptions.has(pollId)) {
        subscriptions.set(pollId, new Set());
    }
    subscriptions.get(pollId)!.add(ws);

    ws.onclose = () => {
        subscriptions.get(pollId)?.delete(ws);

        if (subscriptions.get(pollId)?.size === 0) {
            subscriptions.delete(pollId);
        }
    };
}

export function broadcast(pollId: string, message: VotesUpdateMessage): void {
    const clients = subscriptions.get(pollId);
    if (!clients) return;

    const payload = JSON.stringify(message);

    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

export function handleVoteMessage(
    db: DatabaseSync,
    ws: WebSocket,
    msg: VoteCastMessage,
    userId?: string,
): void {
    try {
        const voteCount = castVote(
            db,
            msg.pollId,
            msg.optionId,
            userId ?? msg.userId,
        );

        ws.send(JSON.stringify({
            type: "vote_ack",
            pollId: msg.pollId,
            optionId: msg.optionId,
            success: true,
        }));

        broadcast(msg.pollId, {
            type: "votes_update",
            pollId: msg.pollId,
            optionId: msg.optionId,
            voteCount,
        });

    } catch (e) {
        sendError(ws, e as APIException);
    }
}

export function sendError(ws: WebSocket, exception: APIException): void {
    ws.send(JSON.stringify({
        type: "vote_ack",
        success: false,
        error: {
            code: exception.code,
            message: exception.message,
        },
    }));
}
