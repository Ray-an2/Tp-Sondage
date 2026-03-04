export type APIResponse <T> = APISuccess<T> | APIFailure;
interface APISuccess<T> {
    success : true;
    error ?: never;
    data : T;
}
export interface APIError {
    code : APIErreurCode;
    message : string;
}

export interface APIFailure{
    success : false;
    error : APIError;
    data ?: never;
}

export enum APIErreurCode {
    NOT_FOUND = "NOT_FOUND",
    SERVER_ERROR = "SERVER_ERROR",
    TIMEOUT = "TIMEOUT",
    UNAUTHORIZED = "UNAUTHORIZED",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    BAD_REQUEST = "BAD_REQUEST"
}

export class APIException extends Error {
    readonly code: APIErreurCode;
    readonly status: number;

    constructor(code: APIErreurCode, status: number, message: string) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
