import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import type { APIResponse } from "../model/api.ts";
import { isUser } from "../model/auth.ts";

const API_URL = "http://localhost:8000";

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="page-shell">
      <h1>Inscription</h1>
        <Link className="poll-back-link" to={`/`}>
            Revenir au choix des sondages
        </Link>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/users/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });

            const json = (await res.json()) as APIResponse<unknown>;
            if (!res.ok || !json.success) {
              throw new Error(json.success ? `HTTP ${res.status}` : json.error.message);
            }

            if (!isUser(json.data)) {
              throw new Error("Format de reponse invalide");
            }

            navigate("/login");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur d'inscription");
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
          {loading ? "Creation..." : "Creer un compte"}
        </button>
        {error ? <p className="error-message">{error}</p> : null}
      </form>
    </main>
  );
}
