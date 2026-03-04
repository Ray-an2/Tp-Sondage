export interface Vote {
    id: string;
    pollId: string;
    optionId: string;
    userId?: string;
    createdAt: string;
}