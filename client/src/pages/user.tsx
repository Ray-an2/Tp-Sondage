import { useEffect, useState } from "react";
import type { APIResponse } from "../model/api.ts";
import { isUser, type User } from "../model/auth.ts";
import { useAuth } from "../hooks/useAuth.ts";
import {Link} from "react-router-dom";

const API_URL = "http://localhost:8000";

export default function UserPage() {
  const { authFetch, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/users/me`);
        const json = (await res.json()) as APIResponse<unknown>;
        if (!res.ok || !json.success) {
          throw new Error(json.success ? `HTTP ${res.status}` : json.error.message);
        }
        if (!isUser(json.data)) {
          throw new Error("Format de reponse invalide");
        }
        setUser(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch]);

  if (loading) return <p className="muted-message">Chargement...</p>;
  if (error) return <p className="error-message">Erreur : {error}</p>;
  if (!user) return <p className="muted-message">Aucun utilisateur</p>;
  const formattedCreatedAt = (() => {
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return user.createdAt;
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  })();

  return (
    <main className="page-shell">
      <Link className="poll-back-link" to={`/`}>
        Revenir au choix des sondages
      </Link>
      <h1>Profil</h1>
      <p>Nom d'utilisateur: {user.username}</p>
      <p>Role: {user.isAdmin ? "Administrateur" : "Utilisateur"}</p>
      <p>Creation: {formattedCreatedAt}</p>
      <button onClick={logout}>Se deconnecter</button>
    </main>
  );
}
