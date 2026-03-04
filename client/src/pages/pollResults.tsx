import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { APIResponse } from "../model/api.ts";
import { isPoll, type Poll } from "../model/poll.ts";
import "../css/pollResults.css";

const API_URL = "http://localhost:8000";

type PollState = { status: "loading" } |{ status: "error"; error: string } | { status: "loaded"; poll: Poll };

const PODIUM_LABELS = ["1er", "2e", "3e"];
const PODIUM_CLASSES = ["podium-card podium-card--first", "podium-card podium-card--second", "podium-card podium-card--third"];

export default function PollResults() {
    const { selectedPoll } = useParams<{ selectedPoll: string }>();
    const [pollState, setPollState] = useState<PollState>({ status: "loading" });

    useEffect(() => {
        (async () => {
            if (!selectedPoll) {
                setPollState({ status: "error", error: "Sondage manquant" });
                return;
            }

            setPollState({ status: "loading" });
            try {
                const response = await fetch(`${API_URL}/polls/${selectedPoll}`);
                if (!response.ok) {
                    const json = await response.json().catch(() => null);
                    const message = json?.error?.message || `HTTP ${response.status}`;
                    throw new Error(message);
                }

                const json = (await response.json()) as APIResponse<unknown>;
                if (!json.success) {
                    throw new Error(json.error.message);
                }

                if (!isPoll(json.data)) {
                    throw new Error("Format de reponse invalide");
                }

                setPollState({ status: "loaded", poll: json.data });
            } catch (err) {
                const message = err instanceof Error
                    ? err.message
                    : "Erreur lors du chargement des resultats";
                setPollState({ status: "error", error: message });
            }
        })();
    }, [selectedPoll]);

    const rankedOptions = useMemo(() => {
        if (pollState.status !== "loaded") return [];
        return [...pollState.poll.options]
            .sort((a, b) => b.voteCount - a.voteCount).slice(0, 3);
    }, [pollState]);

    if (pollState.status === "loading") {
        return <p className="muted-message">Chargement des resultats...</p>;
    }

    if (pollState.status === "error") {
        return <p className="error-message">Erreur : {pollState.error}</p>;
    }

    const poll = pollState.poll;

    return (
        <main className="page-shell results-shell">
            <Link className="poll-back-link" to={`/polls/${poll.id}`}>
                Retour au sondage
            </Link>
            <h1>🏆 Resultats: {poll.title}</h1>

            {rankedOptions.length === 0 ? (
                <p className="muted-message">Aucun vote enregistre pour le moment.</p>
            ) : (
                <section className="podium-grid" aria-label="Podium du sondage">
                    {rankedOptions.map((option, index) => (
                        <article key={option.id} className={PODIUM_CLASSES[index]}>
                            <p className="podium-rank">{PODIUM_LABELS[index]}</p>
                            <h2 className="podium-text">{option.text}</h2>
                            <p className="podium-votes">{option.voteCount} votes</p>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}
