// server/src/services/session.service.ts

export type ChatState =
    | "INIT"
    | "WAITING_GENDER"
    | "WAITING_INTENT"
    | "WAITING_STYLE"
    | "WAITING_CATEGORY"
    | "WAITING_SIZE_CONFIRM"
    | "WAITING_BODY_INFO"
    | "DONE"
    | "PRODUCT_WAITING_INTENT"
    | "PRODUCT_WAITING_BODY_INFO"
    | "PRODUCT_STYLING";

export interface ChatSession {
    state: ChatState;
    context: {
        gender?: string;
        selectedStyle?: string;
        selectedCategory?: string;
        selectedKeyword?: string;
        productId?: number | null;
    };
    updatedAt: Date;
}

const sessions = new Map<string, ChatSession>();

export const getSession = (sessionId: string): ChatSession => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            state: "INIT",
            context: {},
            updatedAt: new Date(),
        });
    }

    return sessions.get(sessionId)!;
};

export const updateSession = (
    sessionId: string,
    newData: Partial<ChatSession>
) => {
    const current = getSession(sessionId);

    sessions.set(sessionId, {
        ...current,
        ...newData,
        context: {
            ...current.context,
            ...newData.context,
        },
        updatedAt: new Date(),
    });
};

export const clearSession = (sessionId: string) => {
    sessions.delete(sessionId);
};