import { Router } from "@oak/oak";
import { db } from "../main.ts";

import { APIErreurCode, APIException, APIResponse } from "../model/reponse.ts";
import { Vote } from "../model/vote.ts";
import { isVoteRow, isVoteCastMessage, voteRowToApi } from "../model/db.ts";
import { handleVoteMessage, sendError, subscribe } from "../services/vote-service.ts";
import { VoteCastMessage } from "../model/webSocket.ts";
import { verifyJWT } from "../middleware/jwt.ts";
import { isPollRow } from "../model/db.ts";

const router = new Router({ prefix: "/votes" });
async function getUserIdFromAuthHeader(ctx: any): Promise<string | null> {
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    return payload?.userId ?? null;
}

function getTokenFromQuery(ctx: any): string | null {
    const url = new URL(ctx.request.url);
    const token = url.searchParams.get("token");
    return token ?? null;
}

function getPollById(pollId: string) {
    const row = db.prepare(`
        SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
        FROM polls WHERE id = ?;
    `).get(pollId);
    return row && isPollRow(row) ? row : null;
}

/**
 * GET /votes
 */
router.get("/", (ctx) => {
    const rows = db.prepare(`
        SELECT
            id,
            poll_id,
            user_id,
            option_id,
            created_at
        FROM votes;`).all();

    const votes: Vote[] = rows
        .filter(isVoteRow)
        .map(voteRowToApi);

    const response: APIResponse<Vote[]> = {
        success: true,
        data: votes,
    };

    ctx.response.body = response;
});

/**
 * GET /votes/:id
 * Si upgrade WebSocket: traite l'id comme pollId.
 */
router.get("/:id", async (ctx) => {
    const id = ctx.params.id;
    if (!id) {
        throw new APIException(APIErreurCode.NOT_FOUND, 404, "Identifiant manquant");
    }

    if (ctx.isUpgradable) {
        const pollId = id;
        const pollRow = getPollById(pollId);
        if (!pollRow) {
            throw new APIException(APIErreurCode.NOT_FOUND, 404, "Poll non trouvé");
        }

        let userId: string | null = null;
        if (pollRow.requires_auth === 1) {
            const token = getTokenFromQuery(ctx);
            if (!token) {
                throw new APIException(
                    APIErreurCode.UNAUTHORIZED,
                    401,
                    "Token manquant",
                );
            }
            const payload = await verifyJWT(token);
            if (!payload) {
                throw new APIException(
                    APIErreurCode.UNAUTHORIZED,
                    401,
                    "Token invalide",
                );
            }
            userId = payload.userId;
        }

        const ws = ctx.upgrade();

        ws.onopen = () => {
            subscribe(ws, pollId);
        };

        ws.onmessage = (e) => {
            try {
            const msg = JSON.parse(e.data) as VoteCastMessage;

            if (!isVoteCastMessage(msg)) {
                    throw new APIException(
                        APIErreurCode.BAD_REQUEST,
                        400,
                        "Message de type inconnu"
                    );
            }

            handleVoteMessage(db, ws, msg, userId ?? undefined);

        } catch (e) {
            sendError(ws, e as APIException);
        }
        };

        ws.onerror = (e) => {
            console.error("WebSocket erreur:", e);
        };
        return;
    }

    const row = db.prepare(`
        SELECT
            id,
            poll_id,
            user_id,
            option_id,
            created_at
        FROM votes
        WHERE id = ?;`).get(id);

    if (!row || !isVoteRow(row)) {
        throw new APIException(APIErreurCode.NOT_FOUND, 404, "Vote introuvable");
    }

    const response: APIResponse<Vote> = {
        success: true,
        data: voteRowToApi(row),
    };

    ctx.response.body = response;
});

/**
 * POST /votes
 */
router.post("/", async (ctx) => {
    const body = await ctx.request.body.json();

    if (!body.pollId || !body.optionId) {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "pollId ou optionId manquant"
        );
    }

    const pollRow = getPollById(body.pollId);
    if (!pollRow) {
        throw new APIException(APIErreurCode.NOT_FOUND, 404, "Poll non trouvé");
    }

    let userId: string | null = null;
    if (pollRow.requires_auth === 1) {
        userId = await getUserIdFromAuthHeader(ctx);
        if (!userId) {
            throw new APIException(
                APIErreurCode.UNAUTHORIZED,
                401,
                "Authentification requise",
            );
        }
    }

    const voteId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
        INSERT INTO votes (
            id, poll_id, user_id, option_id, created_at
        ) VALUES (?, ?, ?, ?, ?);
    `).run(
        voteId,
        body.pollId,
        userId ?? body.userId ?? null,
        body.optionId,
        createdAt,
    );

    const response: APIResponse<{ id: string }> = {
        success: true,
        data: { id: voteId },
    };

    ctx.response.status = 201;
    ctx.response.body = response;
});

/**
 * PUT /votes/:id
 */
router.put("/:id", async (ctx) => {
    const voteId = ctx.params.id!;
    const body = await ctx.request.body.json();

    const result = db.prepare(`
        UPDATE votes
        SET
            poll_id = COALESCE(?, poll_id),
            user_id = COALESCE(?, user_id),
            option_id = COALESCE(?, option_id)
        WHERE id = ?;
    `).run(
        body.pollId ?? null,
        body.userId ?? null,
        body.optionId ?? null,
        voteId,
    );

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Vote introuvable"
        );
    }

    ctx.response.body = { success: true, data: null };
});

/**
 * DELETE /votes/:id
 */
router.delete("/:id", (ctx) => {
    const voteId = ctx.params.id!;

    const result = db.prepare(`
        DELETE FROM votes
        WHERE id = ?;
    `).run(voteId);

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Vote introuvable"
        );
    }
    ctx.response.body = { success: true, data: null };
});

export default router;
