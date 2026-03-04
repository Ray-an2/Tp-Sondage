export interface APIError {
  code: string;
  message: string;
}

export type APIResponse<T> = APISuccess<T> | APIFailure;

export interface APISuccess<T> {
  success: true;
  data: T;
}

export interface APIFailure {
  success: false;
  error: APIError;
}
