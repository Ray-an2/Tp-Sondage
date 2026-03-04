import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import type { APIResponse } from "../model/api.ts";
import { isAuthResponse } from "../model/auth.ts";
import { useAuth } from "../hooks/useAuth.ts";

const API_URL = "http://localhost:8000";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="page-shell">
      <h1>Connexion</h1>
        <Link className="poll-back-link" to={`/`}>
            Revenir au choix des sondages
        </Link>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/users/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });

            const json = (await res.json()) as APIResponse<unknown>;
            if (!res.ok || !json.success) {
              throw new Error(json.success ? `HTTP ${res.status}` : json.error.message);
            }

            if (!isAuthResponse(json.data)) {
              throw new Error("Format de reponse invalide");
            }

            login(json.data);
            navigate("/me");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de connexion");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label>
          Nom d'utilisateur
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error ? <p className="error-message">{error}</p> : null}
      </form>
    </main>
  );
}
