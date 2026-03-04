import { Router } from "@oak/oak";
import { db } from "../main.ts";
import { isPollRow, isPollOptionRow, pollRowToApi } from "../model/db.ts";
import { APIErreurCode, APIException } from "../model/reponse.ts";
import { Poll } from "../model/poll.ts";
import { PollOption } from "../model/option.ts";
import {type AuthContext } from "../model/auth.ts";
import { authMiddleware} from "../middleware/auth.ts";

const router = new Router({ prefix: "/polls" });

/**
 * GET /polls
 * Lister tous les sondages
 */
router.get("/", (ctx) => {
    const rows = db.prepare(`
    SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    FROM polls;`).all();

    const polls: Poll[] = rows
        .filter(isPollRow)
        .map((row) => {
            const optionRows = db.prepare(`
            SELECT id, poll_id, text, vote_count
            FROM poll_options WHERE poll_id = ?;`).all(row.id).filter(isPollOptionRow);
            return pollRowToApi(row, optionRows);
        });

    ctx.response.body = {
        success: true,
        data: polls,
    };
});

/**
 * GET /polls/:id
 * Lister un sondage en particulier
 */
router.get("/:id", (ctx) => {
    const pollId = ctx.params.id!;

    const pollRow = db.prepare(`
    SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    FROM polls WHERE id = ?;`).get(pollId);

    if (!pollRow || !isPollRow(pollRow)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll non trouvé"
        );
    }

    const optionRows = db.prepare(`
    SELECT id, poll_id, text, vote_count
    FROM poll_options WHERE poll_id = ?;`).all(pollId).filter(isPollOptionRow);

    ctx.response.body = {
        success: true,
        data: pollRowToApi(pollRow, optionRows),
    };
});


// Ajoute un nouveau sondage
router.post("/", authMiddleware, async (ctx: AuthContext) => {
    const body = await ctx.request.body.json();

    if (!body.title) {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "Champ 'title' manquant"
        );
    }

    const pollId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
    INSERT INTO polls (
      id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
        pollId,
        body.title,
        body.description ?? null,
        ctx.state.user!.userId,
        createdAt,
        body.expiresAt ?? null,
        body.isActive === false ? 0 : 1,
        body.requiresAuth ? 1 : 0,
    );

    const options = Array.isArray(body.options) ? body.options : [];
    for (const option of options) {
        if (!option?.text) continue;
        const optionId = crypto.randomUUID();
        db.prepare(`
        INSERT INTO poll_options (id, poll_id, text, vote_count)
        VALUES (?, ?, ?, ?);
        `).run(optionId, pollId, option.text, 0);
    }

    ctx.response.status = 201;
    ctx.response.body = {
        success: true,
        data: { id: pollId },
    };
});

// Modifie un sondage en particulier
router.put("/:id", authMiddleware, async (ctx: AuthContext) => {
    const pollId = ctx.params.id!;
    const body = await ctx.request.body.json() as Record<string, unknown>;

    const pollRow = db.prepare(`
    SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    FROM polls WHERE id = ?;`).get(pollId);

    if (!pollRow || !isPollRow(pollRow)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll introuvable"
        );
    }

    const isOwner = pollRow.user_id && pollRow.user_id === ctx.state.user!.userId;
    const isAdmin = ctx.state.user!.isAdmin;
    if (!isOwner && !isAdmin) {
        throw new APIException(
            APIErreurCode.UNAUTHORIZED,
            403,
            "Interdit"
        );
    }

    const hasTitle = Object.hasOwn(body, "title");
    const hasDescription = Object.hasOwn(body, "description");
    const hasExpiresAt = Object.hasOwn(body, "expiresAt");
    const hasIsActive = Object.hasOwn(body, "isActive");
    const hasRequiresAuth = Object.hasOwn(body, "requiresAuth");

    if (hasTitle) {
        if (typeof body.title !== "string" || body.title.trim().length === 0) {
            throw new APIException(
                APIErreurCode.BAD_REQUEST,
                400,
                "Titre invalide"
            );
        }
    }

    if (hasIsActive && typeof body.isActive !== "boolean") {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "isActive invalide"
        );
    }

    if (hasRequiresAuth && typeof body.requiresAuth !== "boolean") {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "requiresAuth invalide"
        );
    }

    if (hasDescription && body.description !== null && typeof body.description !== "string") {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "Description invalide"
        );
    }

    if (hasExpiresAt && body.expiresAt !== null && typeof body.expiresAt !== "string") {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "expiresAt invalide"
        );
    }

    const result = db.prepare(`
  UPDATE polls SET
    title = CASE WHEN ? THEN ? ELSE title END,
    description = CASE WHEN ? THEN ? ELSE description END,
    expires_at = CASE WHEN ? THEN ? ELSE expires_at END,
    is_active = CASE WHEN ? THEN ? ELSE is_active END,
    requires_auth = CASE WHEN ? THEN ? ELSE requires_auth END
  WHERE id = ?;`).run(
        Number(hasTitle),
        hasTitle ? (body.title as string).trim() : null,
        Number(hasDescription),
        hasDescription ? (body.description as string | null) : null,
        Number(hasExpiresAt),
        hasExpiresAt ? (body.expiresAt as string | null) : null,
        Number(hasIsActive),
        hasIsActive ? Number(body.isActive as boolean) : null,
        Number(hasRequiresAuth),
        hasRequiresAuth ? Number(body.requiresAuth as boolean) : null,
        pollId);

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll introuvable"
        );
    }
    ctx.response.body = {
        success : true,
        data : null
    };
});


// Supprime un sondage en particulier
router.delete("/:id", authMiddleware, (ctx: AuthContext) => {
    const pollId = ctx.params.id!;

    const pollRow = db.prepare(`
    SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    FROM polls WHERE id = ?;`).get(pollId);

    if (!pollRow || !isPollRow(pollRow)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll introuvable"
        );
    }

    const isOwner = pollRow.user_id && pollRow.user_id === ctx.state.user!.userId;
    const isAdmin = ctx.state.user!.isAdmin;
    if (!isOwner && !isAdmin) {
        throw new APIException(
            APIErreurCode.UNAUTHORIZED,
            403,
            "Interdit"
        );
    }

    const result = db.prepare(`
    DELETE FROM polls
    WHERE id = ?;
  `).run(pollId);

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll introuvable"
        );
    }
    ctx.response.body = {
        success : true,
        data : null
    };
});

/**
 * GET /polls/:pollId/results
 * Résultats agrégés d'un sondage
 */
router.get("/:pollId/results", (ctx) => {
    const pollId = ctx.params.pollId!;

    const pollRow = db.prepare(`
    SELECT id, title, description, user_id, created_at, expires_at, is_active, requires_auth
    FROM polls WHERE id = ?;`).get(pollId);

    if (!pollRow || !isPollRow(pollRow)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Poll non trouvé"
        );
    }

    const optionRows = db.prepare(`
    SELECT id, poll_id, text, vote_count
    FROM poll_options WHERE poll_id = ?;`).all(pollId).filter(isPollOptionRow);

    const options: PollOption[] = optionRows.map((row) => ({
        id: row.id,
        text: row.text,
        voteCount: row.vote_count,
    }));

    ctx.response.body = {
        success: true,
        data: {
            pollId,
            results: options,
        },
    };
});
export default router;
