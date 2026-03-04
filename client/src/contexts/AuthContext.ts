import { createContext } from "react";
import { type AuthResponse } from "../model/auth.ts";

export interface AuthContextValue {
  authResponse: AuthResponse | null;
  setAuthResponse: (authResponse: AuthResponse | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  authResponse: null,
  setAuthResponse: () => {},
});
