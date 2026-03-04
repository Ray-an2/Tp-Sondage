import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { APIResponse } from "../model/api.ts";
import { useAuth } from "../hooks/useAuth.ts";

const API_URL = "http://localhost:8000";

type NewOption = { id: string; text: string };

export default function CreatePoll() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [options, setOptions] = useState<NewOption[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  return (
    <main className="page-shell">
      <h1>Creer un sondage</h1>
      <Link className="poll-back-link" to={`/`}>
        Revenir au choix des sondages
      </Link>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const payload = {
              title,
              description: description || undefined,
              expiresAt: expiresAt || undefined,
              isActive: true,
              requiresAuth,
              options: options
                .map((opt) => opt.text.trim())
                .filter((text) => text.length > 0)
                .map((text) => ({ text })),
            };

            if (!payload.title.trim()) {
              throw new Error("Le titre est obligatoire");
            }
            if (payload.options.length === 0) {
              throw new Error("Ajoute au moins une option");
            }

            const res = await authFetch(`${API_URL}/polls`, {
              method: "POST",
              body: JSON.stringify(payload),
            });

            const json = (await res.json()) as APIResponse<unknown>;
            if (!res.ok || !json.success) {
              throw new Error(json.success ? `HTTP ${res.status}` : json.error.message);
            }

            const pollId = (json.data as any)?.id;
            if (typeof pollId === "string") {
              navigate(`/polls/${pollId}`);
            } else {
              navigate("/");
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de creation");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label>
          Titre
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Description (optionnel)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Date d'expiration (optionnel)
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={requiresAuth}
            onChange={(e) => setRequiresAuth(e.target.checked)}
          />
          Vote reserve aux connectes
        </label>
        <fieldset>
          <legend>Options</legend>
          {options.map((opt, index) => (
            <div key={opt.id}>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 1 ? (
                <button type="button" onClick={() => removeOption(opt.id)}>
                  Supprimer
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" onClick={addOption}>
            Ajouter une option
          </button>
        </fieldset>
        <button type="submit" disabled={loading}>
          {loading ? "Creation..." : "Creer"}
        </button>
        {error ? <p className="error-message">{error}</p> : null}
      </form>
    </main>
  );
}
