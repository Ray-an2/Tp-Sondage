import { useEffect, useState } from "react";
import { EmojiDropdown, type EmojiReaction } from "../components/emojiDropdown.tsx";
import { Link } from "react-router-dom";
import type { APIResponse } from "../model/api.ts";
import { isPoll, type Poll } from "../model/poll.ts";
import { useAuth } from "../hooks/useAuth.ts";


const API_URL = "http://localhost:8000";

export default function Index() {
    const { user, logout } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reaction, setReaction] = useState<EmojiReaction>("fire");

    useEffect(() => {
        (async () => {
            try {
                const response = await fetch(`${API_URL}/polls`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const json = (await response.json()) as APIResponse<unknown>;
                if (!json.success) {
                    throw new Error(json.error.message);
                }

                if (!Array.isArray(json.data) || !json.data.every(isPoll)) {
                    throw new Error("Format de reponse invalide");
                }

                setPolls(json.data);
            } catch (err) {
                const message = err instanceof Error
                    ? err.message
                    : "Erreur lors du chargement des sondages";
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <p className="muted-message">Chargement des sondages...</p>;
    if (error) return <p className="error-message">Erreur : {error}</p>;

    return (
        <main className="home-shell">
            <header className="home-header">
                <h1>Liste des sondages</h1>
                <div className="home-auth">
                    {user ? (
                        <>
                            <span>Connecté: {user.username}</span>{" "}
                            <Link to="/me">Mon profil</Link>{" "}
                            <button onClick={logout}>Se déconnecter</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Connexion</Link>{" "}
                            <Link to="/register">Inscription</Link>
                        </>
                    )}
                </div>
            </header>
            {polls.length === 0 && !user ? (
                <p className="muted-message">Aucun sondage disponible</p>
            ) : (
                <ul className="home-poll-list">
                    {polls.map((poll) => (
                        <li className="home-poll-item" key={poll.id}>
                            <Link to={`/polls/${poll.id}`}>{poll.title}</Link>
                        </li>
                    ))}
                    {user ? (
                        <li className="home-poll-item home-poll-item--add">
                            <Link
                                to="/polls/new"
                                className="home-new-poll-button"
                                aria-label="Créer un nouveau sondage"
                                title="Nouveau sondage"
                            >
                                +
                            </Link>
                        </li>
                    ) : null}
                </ul>
            )}
            <EmojiDropdown
                value={reaction}
                onChange={setReaction}
                label="Reaction"
            />
        </main>
    );
}
