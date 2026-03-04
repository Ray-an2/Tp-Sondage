import { useCallback, useEffect, useRef, useState } from "react";
import {
  isVoteAckMessage,
  isVotesUpdateMessage,
  type VoteCastMessage,
  type VoteAckMessage,
  type VotesUpdateMessage,
} from "../model/websocket.ts";

const WS_BASE_URL = "ws://localhost:8000";

type VoteSocketHandlers = {
  onUpdate?: (update: VotesUpdateMessage) => void;
  onAck?: (ack: VoteAckMessage) => void;
};

export function useVoteSocket(
  pollId: string | undefined,
  token: string | null,
  handlers: VoteSocketHandlers,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">(
    "idle",
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const handlersRef = useRef<VoteSocketHandlers>(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!pollId) return;

    setStatus("connecting");
    setLastError(null);
    let isCurrent = true;

    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${WS_BASE_URL}/votes/${pollId}${tokenParam}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isCurrent) return;
      setStatus("open");
      setLastError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (isVotesUpdateMessage(msg)) {
          handlersRef.current.onUpdate?.(msg);
          return;
        }
        if (isVoteAckMessage(msg)) {
          handlersRef.current.onAck?.(msg);
        }
      } catch {
        // Ignore malformed payloads
      }
    };

    ws.onerror = () => {
      if (!isCurrent) return;
      setStatus("error");
      setLastError("WebSocket error");
      handlersRef.current.onAck?.({
        type: "vote_ack",
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "WebSocket error",
        },
      });
    };

    ws.onclose = () => {
      if (!isCurrent) return;
      setStatus("closed");
    };

    return () => {
      isCurrent = false;
      ws.close();
      wsRef.current = null;
    };
  }, [pollId, token]);

  const vote = useCallback(
    (optionId: string, userId?: string): { success: boolean; error?: string } => {
      if (!pollId) {
        return { success: false, error: "Sondage manquant" };
      }
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return { success: false, error: "WebSocket non connecte" };
      }

      const payload: VoteCastMessage = {
        type: "vote_cast",
        pollId,
        optionId,
        userId,
      };

      ws.send(JSON.stringify(payload));
      return { success: true };
    },
    [pollId],
  );

  return { vote, status, lastError };
}
