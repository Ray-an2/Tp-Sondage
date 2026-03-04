import { Application } from "@oak/oak";
import { oakCors } from "@tajpouria/cors";
import { DatabaseSync } from "node:sqlite";

import routeUser from "./routes/user.ts";
import routePoll from "./routes/poll.ts";
import routeVote from "./routes/vote.ts";
import routeOption from "./routes/option.ts";
import {errorMiddleware} from "./middleware/error.ts";

// ---------- Database -----------------------------------

export const db = new DatabaseSync("polls.db");

// ---------- WebSocket Management -----------------------

const clients = new Set<WebSocket>();

// --------------- TP2 -----------------------------------
/*
function sayHello(ctx: any) {
  ctx.response.body = "Hello world!"
}
router.get("/", sayHello);

// Gestion CRUD du serveur

let values = {1: {"foo": 42, "bar": 13.37 },
  2: {"foo": 23, "bar": 21.00 }
};

const sucessResponse : APIResponse<typeof values> = {
  success: true,
  data: values,
};

// Lister les données
router.get("/poll", (ctx) => {
  ctx.response.body = sucessResponse;
});

// Lister les détails d'une donnée
router.get("/poll/:id", (ctx) => {
  const valueId = ctx.params.id;
  if (!(valueId in values)) {
    const response: APIResponse<never> = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Valeur "${valueId}" non trouvé`,
      },
    };
    ctx.response.status = 404;
    ctx.response.body = response;
    return;
  }
  const response: APIResponse<Poll> = {
    success: true,
    data: values[valueId],
  };
  ctx.response.body = response;
});

// Créer une nouvelle donnée
router.post("/poll", async (ctx) => {
  let body: Record<string, number>;
  try {
    body = await ctx.request.body.json();
  } catch (err) {
    console.error(err);
    const response : APIResponse<never> = {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de lire la requête",
      },
    };

    ctx.response.status = 500;
    ctx.response.body = response
  }

  // Attention !
  // Il faut ici valider les données envoyées par l'utilisateur
  values = {...values, ...body};
  ctx.response.status = 201;
  ctx.response.body = sucessResponse;
});

router.get("/poll/:id", (ctx) => {
  const pollId = ctx.params.id;
  // Enregistrement unique d'un sondage
  const pollRow = db.prepare(  `SELECT id, titre, date, created_at, expires_at, is_active
FROM poll WHERE id = ?;`,).get(pollId);
  if (!pollRow || !isPollRow(pollRow)) {
    ctx.throw(404, "Poll not found");
  }

// Enregistrement en liste d'option
  const pollOptionRows = db.prepare(
      `SELECT id, text, vote_count FROM poll_options WHERE poll_id = ?;`,
  ).all(pollId);

  const optionRows = optionRows.filter(isPollOptionRow);

  const poll = pollRowToApi(pollRow, optionRows);

  ctx.response.body = {
    success: true,
    data: poll,
  };
});
*/

// ---------- Application --------------------------------

const PROTOCOL = "http";
const HOSTNAME = "localhost";
const PORT = 8000;
const ADDRESS = `${PROTOCOL}://${HOSTNAME}:${PORT}`;

const app = new Application();

app.use(oakCors());
app.use(errorMiddleware);

app.use(routeUser.routes(), routeUser.allowedMethods());
app.use(routePoll.routes(), routePoll.allowedMethods());
app.use(routeVote.routes(), routeVote.allowedMethods());
app.use(routeOption.routes(), routeOption.allowedMethods());

app.addEventListener(
    "listen",
    () => console.log(`Server listening on ${ADDRESS}`),
);

if (import.meta.main) {
  await app.listen({ hostname: HOSTNAME, port: PORT });
}

export { app };
