import { Router } from "@oak/oak";
import { db } from "../main.ts";

import { isUserRow, userRowToApi } from "../model/db.ts";
import { APIErreurCode, APIException, APIResponse } from "../model/reponse.ts";
import { type AuthResponse, type LoginRequest, type RegisterRequest, type AuthContext } from "../model/auth.ts";
import { type User } from "../model/user.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { createJWT, hashPassword, verifyPassword } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/users" });

/**
 * POST /users/register
 */
router.post("/register", async (ctx) => {
    const body = (await ctx.request.body.json()) as RegisterRequest;

    if (!body?.username || !body?.password) {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "Champs manquants",
        );
    }

    const existing = db.prepare(`
    SELECT id, username, password_hash, is_admin, created_at
    FROM users WHERE username = ?;`).get(body.username);

    if (existing && isUserRow(existing)) {
        throw new APIException(
            APIErreurCode.VALIDATION_ERROR,
            409,
            "Nom d'utilisateur deja utilise",
        );
    }

    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = await hashPassword(body.password);

    db.prepare(`
    INSERT INTO users (id, username, password_hash, is_admin, created_at)
    VALUES (?, ?, ?, ?, ?);
    `).run(
        userId,
        body.username,
        passwordHash,
        body.isAdmin ? 1 : 0,
        createdAt,
    );

    const user: User = {
        id: userId,
        username: body.username,
        isAdmin: body.isAdmin ?? false,
        createdAt,
    };

    const response: APIResponse<User> = {
        success: true,
        data: user,
    };

    ctx.response.status = 201;
    ctx.response.body = response;
});

/**
 * POST /users/login
 */
router.post("/login", async (ctx) => {
    const body = (await ctx.request.body.json()) as LoginRequest;

    if (!body?.username || !body?.password) {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "Champs manquants",
        );
    }

    const row = db.prepare(`
    SELECT id, username, password_hash, is_admin, created_at
    FROM users WHERE username = ?;
    `).get(body.username);

    if (!row || !isUserRow(row)) {
        throw new APIException(
            APIErreurCode.UNAUTHORIZED,
            401,
            "Identifiants invalides",
        );
    }

    const ok = await verifyPassword(body.password, row.password_hash);
    if (!ok) {
        throw new APIException(
            APIErreurCode.UNAUTHORIZED,
            401,
            "Mot de passe invalides",
        );
    }

    const token = await createJWT({
        userId: row.id,
        username: row.username,
        isAdmin: row.is_admin === 1,
    });

    const response: APIResponse<AuthResponse> = {
        success: true,
        data: {
            token,
            user: userRowToApi(row),
        },
    };

    ctx.response.body = response;
});

/**
 * GET /users/validate
 */
router.get("/validate", authMiddleware, (ctx: AuthContext) => {
    const userId = ctx.state.user!.userId;
    const row = db.prepare(`
    SELECT id, username, password_hash, is_admin, created_at
    FROM users WHERE id = ?;`).get(userId);

    if (!row || !isUserRow(row)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Utilisateur introuvable",
        );
    }

    const response: APIResponse<{ valid: true; user: User }> = {
        success: true,
        data: {
            valid: true,
            user: userRowToApi(row),
        },
    };
    ctx.response.body = response;
});

/**
 * GET /users/me
 */
router.get("/me", authMiddleware, (ctx: AuthContext) => {
    const userId = ctx.state.user!.userId;

    const row = db.prepare(`
    SELECT id, username, password_hash, is_admin, created_at
    FROM users WHERE id = ?;`).get(userId);

    if (!row || !isUserRow(row)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Utilisateur introuvable",
        );
    }

    const response: APIResponse<User> = {
        success: true,
        data: userRowToApi(row),
    };

    ctx.response.body = response;
});

/**
 * GET /users
 * Lister tous les utilisateurs
 */
router.get("/", (ctx) => {
    const rows = db.prepare(`
    SELECT
      id,
      username,
      password_hash,
      is_admin,
      created_at
    FROM users;
  `).all();

    const users: User[] = rows
        .filter(isUserRow)
        .map(userRowToApi);

    const response: APIResponse<User[]> = {
        success: true,
        data: users,
    };

    ctx.response.body = response;
});

/**
 * GET /users/:id
 */
router.get("/:id", (ctx) => {
    const userId = ctx.params.id!;

    const row = db.prepare(`
    SELECT
      id,
      username,
      password_hash,
      is_admin,
      created_at
    FROM users
    WHERE id = ?;
  `).get(userId);

    if (!row || !isUserRow(row)) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Utilisateur introuvable"
        );
    }

    const response: APIResponse<User> = {
        success: true,
        data: userRowToApi(row),
    };

    ctx.response.body = response;
});

/**
 * POST /users
 */
router.post("/", async (ctx) => {
    const body = (await ctx.request.body.json()) as RegisterRequest;

    if (!body?.username || !body?.password) {
        throw new APIException(
            APIErreurCode.BAD_REQUEST,
            400,
            "Champs manquants",
        );
    }

    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = await hashPassword(body.password);

    db.prepare(`
  INSERT INTO users (
    id, username, password_hash, is_admin, created_at
  ) VALUES (?, ?, ?, ?, ?);
`).run(
        userId,
        body.username,
        passwordHash,
        body.isAdmin ? 1 : 0,
        createdAt,
    );

    const response: APIResponse<{ id: string }> = {
        success: true,
        data: { id: userId },
    };

    ctx.response.status = 201;
    ctx.response.body = response;
});

/**
 * PUT /users/:id
 */
router.put("/:id", async (ctx) => {
    const userId = ctx.params.id!;

    const body = await ctx.request.body.json();

    const result = db.prepare(`
    UPDATE users
    SET
      username = COALESCE(?, username),
      password_hash = COALESCE(?, password_hash),
      is_admin = COALESCE(?, is_admin)
    WHERE id = ?;
  `).run(
        body.username ?? null,
        body.password ? await hashPassword(body.password) : null,
        typeof body.isAdmin === "boolean" ? Number(body.isAdmin) : null,
        userId,
    );

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Utilisateur introuvable"
        );
    }

    const response: APIResponse<null> = {
        success: true,
        data: null,
    };

    ctx.response.body = response;
});

/**
 * DELETE /users/:id
 */
router.delete("/:id", (ctx) => {
    const userId = ctx.params.id!;

    const result = db.prepare(`
    DELETE FROM users
    WHERE id = ?;
  `).run(userId);

    if (result.changes === 0) {
        throw new APIException(
            APIErreurCode.NOT_FOUND,
            404,
            "Utilisateur introuvable"
        );
    }

    ctx.response.body = {
        success: true,
        data: null,
    };
});

export default router;
