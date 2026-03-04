import { useCallback, useEffect, useState } from "react";
import { EmojiDropdown, type EmojiReaction } from "../components/emojiDropdown.tsx";
import type { APIResponse } from "../model/api.ts";
import { isPoll, type Poll } from "../model/poll.ts";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useVoteSocket } from "../hooks/useVoteSocket.ts";
import type {
    VoteAckMessage,
    VotesUpdateMessage,
} from "../model/websocket.ts";
import { useAuth } from "../hooks/useAuth.ts";
import "../css/poll.css";


const API_URL = "http://localhost:8000";
const COUNTDOWN_TICK_MS = 30_000;

function isoToLocalDateTime(isoDate?: string): string {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
}

function localDateTimeToIso(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function formatRemainingTime(expiresAt: string | undefined, nowMs: number): string {
    if (!expiresAt) return "Sans date d'expiration";
    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return "Date d'expiration invalide";

    const remainingMs = expiresMs - nowMs;
    if (remainingMs <= 0) return "Termine";

    const totalMinutes = Math.ceil(remainingMs / 60_000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const minutesAfterDays = totalMinutes % (24 * 60);
    const hours = Math.floor(minutesAfterDays / 60);
    const minutes = minutesAfterDays % 60;

    if (days > 0 && hours > 0 && minutes > 0) return `${days} j ${hours} h ${minutes} min restantes`;
    if (days > 0 && hours > 0) return `${days} j ${hours} h restantes`;
    if (days > 0 && minutes > 0) return `${days} j ${minutes} min restantes`;
    if (days > 0) return `${days} j restantes`;
    if (hours === 0) return `${minutes} min restantes`;
    if (minutes === 0) return `${hours} h restantes`;
    return `${hours} h ${minutes} min restantes`;
}

function isPollExpired(expiresAt: string | undefined, nowMs: number): boolean {
    if (!expiresAt) return false;
    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= nowMs;
}

export default function Poll() {
    type PollState =
        | { status: "loading" }
        | { status: "error"; error: string }
        | { status: "loaded"; poll: Poll };

    const { selectedPoll } = useParams<{ selectedPoll: string }>();
    const navigate = useNavigate();
    const [pollState, setPollState] = useState<PollState>({ status: "loading" });
    const [voteError, setVoteError] = useState<string | null>(null);
    const [animatingOptionId, setAnimatingOptionId] = useState<string | null>(
        null,
    );
    const [manageError, setManageError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editExpiresAt, setEditExpiresAt] = useState("");
    const [editIsActive, setEditIsActive] = useState(true);
    const [editRequiresAuth, setEditRequiresAuth] = useState(false);
    const [reaction, setReaction] = useState<EmojiReaction>("fire");
    const [countdownNow, setCountdownNow] = useState(Date.now());
    const { token, user, authFetch } = useAuth();

    const loadPoll = useCallback(async () => {
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
                : "Sondage introuvable";
            setPollState({ status: "error", error: message });
        }
    }, [selectedPoll]);

    useEffect(() => {
        void loadPoll();
    }, [loadPoll]);

    const handleUpdate = useCallback((update: VotesUpdateMessage) => {
        setPollState((prev) => {
            if (prev.status !== "loaded") return prev;
            return {
                ...prev,
                poll: {
                    ...prev.poll,
                    options: prev.poll.options.map((opt) =>
                        opt.id === update.optionId
                            ? { ...opt, voteCount: update.voteCount }
                            : opt
                    ),
                },
            };
        });
        setAnimatingOptionId(update.optionId);
    }, []);

    const handleAck = useCallback((ack: VoteAckMessage) => {
        if (!ack.success) {
            setVoteError(ack.error.message);
        }
    }, []);

    const { vote, status, lastError } = useVoteSocket(selectedPoll, token, {
        onUpdate: handleUpdate,
        onAck: handleAck,
    });

    useEffect(() => {
        if (!animatingOptionId) return;
        const timer = setTimeout(() => setAnimatingOptionId(null), 500);
        return () => clearTimeout(timer);
    }, [animatingOptionId]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setCountdownNow(Date.now());
        }, COUNTDOWN_TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    if (pollState.status === "loading") return <p>Chargement du sondage...</p>;
    if (pollState.status === "error") return <p>Erreur : {pollState.error}</p>;

    const poll = pollState.poll;
    const voteRequiresAuth = poll.requiresAuth && !token;
    const canManage = !!user && (user.isAdmin || poll.userId === user.id);
    const hasEnded = isPollExpired(poll.expiresAt, countdownNow);

    const startEdit = () => {
        setManageError(null);
        setIsEditMode(true);
        setEditTitle(poll.title);
        setEditDescription(poll.description ?? "");
        setEditExpiresAt(isoToLocalDateTime(poll.expiresAt));
        setEditIsActive(poll.isActive);
        setEditRequiresAuth(poll.requiresAuth);
    };

    return (
        <div className="poll-container">
            <Link className="poll-back-link" to={`/`}>
                Revenir au choix des sondages
            </Link>
            {canManage ? (
                <div>
                    {!isEditMode ? (
                        <button type="button" onClick={startEdit}>
                            Modifier le sondage
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={async () => {
                            setManageError(null);
                            if (!selectedPoll) return;
                            if (!confirm("Supprimer ce sondage ?")) return;
                            setIsDeleting(true);
                            try {
                                const res = await authFetch(`${API_URL}/polls/${selectedPoll}`, {
                                    method: "DELETE",
                                });
                                const json = (await res.json()) as APIResponse<unknown>;
                                if (!res.ok || !json.success) {
                                    throw new Error(
                                        json.success
                                            ? `HTTP ${res.status}`
                                            : json.error.message,
                                    );
                                }
                                navigate("/");
                            } catch (err) {
                                setManageError(
                                    err instanceof Error ? err.message : "Suppression impossible",
                                );
                            } finally {
                                setIsDeleting(false);
                            }
                        }}
                        disabled={isDeleting || isSaving}
                    >
                        {isDeleting ? "Suppression..." : "Supprimer"}
                    </button>
                </div>
            ) : null}
            <EmojiDropdown
                value={reaction}
                onChange={setReaction}
                label="Reaction"
            />
            <div className="poll-ws-status">
                WebSocket: {status}
                {lastError ? ` (${lastError})` : ""}
            </div>
            <p className="poll-ws-status">
                Temps restant: {formatRemainingTime(poll.expiresAt, countdownNow)}
            </p>
            {hasEnded ? (
                <Link className="poll-results-link" to={`/polls/${poll.id}/results`}>
                    🏆 Voir les resultats
                </Link>
            ) : null}
            {voteError ? <p className="poll-vote-error">{voteError}</p> : null}
            {manageError ? <p className="poll-vote-error">{manageError}</p> : null}
            {isEditMode ? (
                <form
                    onSubmit={async (event) => {
                        event.preventDefault();
                        if (!selectedPoll) return;
                        setManageError(null);

                        if (editTitle.trim().length === 0) {
                            setManageError("Le titre est obligatoire");
                            return;
                        }

                        setIsSaving(true);
                        try {
                            const payload = {
                                title: editTitle.trim(),
                                description: editDescription.trim().length > 0
                                    ? editDescription.trim()
                                    : null,
                                expiresAt: localDateTimeToIso(editExpiresAt),
                                isActive: editIsActive,
                                requiresAuth: editRequiresAuth,
                            };

                            const res = await authFetch(`${API_URL}/polls/${selectedPoll}`, {
                                method: "PUT",
                                body: JSON.stringify(payload),
                            });
                            const json = (await res.json()) as APIResponse<unknown>;
                            if (!res.ok || !json.success) {
                                throw new Error(
                                    json.success ? `HTTP ${res.status}` : json.error.message,
                                );
                            }

                            await loadPoll();
                            setIsEditMode(false);
                        } catch (err) {
                            setManageError(
                                err instanceof Error ? err.message : "Mise a jour impossible",
                            );
                        } finally {
                            setIsSaving(false);
                        }
                    }}
                >
                    <h1>Modifier le sondage</h1>
                    <label>
                        Titre
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Description (optionnel)
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                        />
                    </label>
                    <label>
                        Date d'expiration (optionnel)
                        <input
                            type="datetime-local"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                        />
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                        />
                        Sondage actif
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={editRequiresAuth}
                            onChange={(e) => setEditRequiresAuth(e.target.checked)}
                        />
                        Vote reserve aux connectes
                    </label>
                    <div>
                        <button type="submit" disabled={isSaving || isDeleting}>
                            {isSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditMode(false);
                                setManageError(null);
                            }}
                            disabled={isSaving || isDeleting}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            ) : (
                <h1>{poll.title}</h1>
            )}
            {voteRequiresAuth ? (
                <p className="poll-vote-error">
                    Connexion requise pour voter sur ce sondage.
                </p>
            ) : null}

            <ul className="poll-options">
                {poll.options.map((opt) => (
                    <li
                        key={opt.id}
                        className={`poll-option${
                            animatingOptionId === opt.id ? " poll-option--pulse" : ""
                        }`}
                    >
                        <p className="poll-option-text">{opt.text}</p>
                        <div className="poll-option-actions">
                            <p className="poll-option-votes">
                                {opt.voteCount} votes
                            </p>
                            <button
                                className="poll-option-vote-button"
                                onClick={() => {
                                    setVoteError(null);
                                    if (voteRequiresAuth) {
                                        setVoteError("Connexion requise");
                                        return;
                                    }
                                    const result = vote(opt.id);
                                    if (!result.success) {
                                        setVoteError(result.error || "Vote echoue");
                                    }
                                }}
                                disabled={voteRequiresAuth}
                            >
                                Voter
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/*
{voteError ? <p className="poll-vote-error">{voteError}</p> : null}
{manageError ? <p className="poll-vote-error">{manageError}</p> : null}
<ul className="poll-options">
 */
