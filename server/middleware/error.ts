import { Context, Next } from "@oak/oak";
import { APIErreurCode, APIException, APIFailure } from "../model/reponse.ts";

export async function errorMiddleware(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err) {
        if (err instanceof APIException) {
            const responseBody: APIFailure = {
                success: false,
                error: {
                    code: err.code,
                    message: err.message,
                }
            };

            ctx.response.status = err.status;
            ctx.response.body = responseBody;

            console.log(responseBody);
        } else {
            console.error(err);

            const responseBody: APIFailure = {
                success: false,
                error: {
                    code: APIErreurCode.SERVER_ERROR,
                    message: "Unexpected server error",
                }
            };

            ctx.response.status = 500;
            ctx.response.body = responseBody;
        }
    }
}