import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type EmojiReaction = "fire" | "heart" | "thumbsUp" | "thumbsDown";

const EMOJI_OPTIONS: Array<{ value: EmojiReaction; emoji: string; label: string }> = [
    { value: "fire", emoji: "🔥", label: "Flamme" },
    { value: "heart", emoji: "❤️", label: "Coeur" },
    { value: "thumbsUp", emoji: "👍", label: "Pouce vers le ciel" },
    { value: "thumbsDown", emoji: "👎", label: "Pouce vers le bas" },
];

type EmojiDropdownProps = {
    value: EmojiReaction;
    onChange: (value: EmojiReaction) => void;
    label?: string;
};

type FloatingEmoji = {
    id: number;
    emoji: string;
    startX: number;
    endX: number;
};

const FLOAT_DURATION_MS = 3000;

export function EmojiDropdown({
    value,
    onChange,
    label = "Reaction",
}: EmojiDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const timeoutIdsRef = useRef<number[]>([]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current) return;
            if (rootRef.current.contains(event.target as Node)) return;
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        return () => {
            timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        };
    }, []);

    const spawnFloatingEmoji = (emoji: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const startX = Math.floor(Math.random() * 26) - 13;
        const endX = Math.floor(Math.random() * 101) - 50;

        setFloatingEmojis((prev) => [...prev, { id, emoji, startX, endX }]);

        const timeoutId = window.setTimeout(() => {
            setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
            timeoutIdsRef.current = timeoutIdsRef.current.filter((item) => item !== timeoutId);
        }, FLOAT_DURATION_MS);
        timeoutIdsRef.current.push(timeoutId);
    };

    const selectedOption = EMOJI_OPTIONS.find((option) => option.value === value) ?? EMOJI_OPTIONS[0];

    const handleSelectReaction = (reaction: EmojiReaction) => {
        onChange(reaction);
        const option = EMOJI_OPTIONS.find((item) => item.value === reaction);
        spawnFloatingEmoji(option?.emoji ?? "🔥");
    };

    return (
        <>
            <div className="emoji-dropdown" ref={rootRef}>
                <button
                    type="button"
                    className="emoji-dropdown__trigger"
                    aria-label={label}
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((prev) => !prev)}
                >
                    <span className="emoji-dropdown__current">{selectedOption.emoji}</span>
                    <span className="emoji-dropdown__chevron">{isOpen ? "▾" : "▴"}</span>
                </button>
                {isOpen ? (
                    <div className="emoji-dropdown__menu" role="menu" aria-label={label}>
                        {EMOJI_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className="emoji-dropdown__item"
                                onClick={() => handleSelectReaction(option.value)}
                            >
                                <span>{option.emoji}</span>
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="emoji-float-layer" aria-hidden="true">
                {floatingEmojis.map((item) => {
                    const style = {
                        "--emoji-start-x": `${item.startX}px`,
                        "--emoji-end-x": `${item.endX}px`,
                    } as CSSProperties;
                    return (
                        <span key={item.id} className="emoji-float" style={style}>
                            {item.emoji}
                        </span>
                    );
                })}
            </div>
        </>
    );
}
