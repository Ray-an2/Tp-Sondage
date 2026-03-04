import { Router } from "@oak/oak";
import { db } from "../main.ts";

import { isPollOptionRow, pollOptionRowToApi } from "../model/db.ts";
import { APIErreurCode, APIException, APIResponse } from "../model/reponse.ts";
import { PollOption } from "../model/option.ts";

const router = new Router({ prefix: "/options" });

/**
 * GET /options
 * Lister toutes les options
 */
router.get("/", (ctx) => {
    const rows = db.prepare(`
    SELECT id, poll_id, text, vote_count FROM poll_options`).all();
    const options: PollOption[] = rows
        .filter(isPollOptionRow)
        .map(pollOptionRowToApi);

    const response: APIResponse<PollOption[]> = {
        success: true,
        data: options,
    };

    ctx.response.body = response;
});

/**
 * GET /options/:id
 */
router.get("/:id", (ctx) => {
    const optionId = ctx.params.id!;

    const row = db.prepare(`
        SELECT id, poll_id, text, vote_count FROM poll_options WHERE id = ?;`).get(optionId);

    if (!row || !isPollOptionRow(row)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Option non trouvé"
        );
    }

    ctx.response.body = {
        success: true,
        data: pollOptionRowToApi(row),
    };
});

/**
 * POST /options
 * Ajouter une option à un sondage
 */
router.post("/", async (ctx) => {
        const body = await ctx.request.body.json();

        if (!body.text || !body.pollId) {
            throw new APIException(
                APIErreurCode.BAD_REQUEST,
                400,
                "Champ 'text' ou 'pollId' manquant"
            );
        }

        const optionId = crypto.randomUUID();

        db.prepare(`INSERT INTO poll_options (id, text, poll_id) VALUES (?, ?, ?);`).run(
            optionId,
            body.text,
            body.pollId,
        );

        const response: APIResponse<{ id: string }> = {
            success: true,
            data: { id: optionId },
        };
        ctx.response.status = 201;
        ctx.response.body = response;
});

/**
 * PUT /options/:id
 */
router.put("/:id", async (ctx) => {
    const optionId = ctx.params.id!;
    const body = await ctx.request.body.json();

    const result = db.prepare(`
    UPDATE poll_options
    SET
        text = COALESCE(?, text),
        poll_id = COALESCE(?, poll_id)
    WHERE id = ?;`).run(
        body.text ?? null,
        body.pollId ?? null,
        optionId,
    );

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Option introuvable"
        );
    }

    ctx.response.body = {
        success : true,
        data : null
    };
});

/**
 * DELETE /options/:id
 */
router.delete("/:id", (ctx) => {
    const optionId = ctx.params.id!;

    const result = db.prepare(`
    DELETE FROM poll_options WHERE id = ?;`).run(optionId);

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Option introuvable"
        );
    }

    ctx.response.body = {
        success : true,
        data : null
    };
});

export default router;
