export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export function isPollOption(value: unknown): value is PollOption {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).id === "string" &&
    typeof (value as any).text === "string" &&
    typeof (value as any).voteCount === "number"
  );
}
