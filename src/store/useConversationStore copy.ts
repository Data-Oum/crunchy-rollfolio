/**
 * src/store/useConversationStore.ts
 * Zustand store for conversation state. Persisted to localStorage.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface UserProfile {
  name: string;
  company: string;
  role: string;
  intent: string;
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  totalMessages: number;
  interests: string[];
}

export interface Message {
  role: "user" | "ai";
  text: string;
  ts: number;
}

export interface StoredConversation {
  id: string;
  date: string;
  messages: Message[];
  summary: string;
}

interface DailyUsage {
  date: string;
  count: number;
}

interface ConversationState {
  userProfile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  resetMessages: () => void;
  conversations: StoredConversation[];
  saveConversation: (c: StoredConversation) => void;
  getRecentConversationMessages: (limit?: number) => Message[];
  dailyUsage: DailyUsage;
  incrementDaily: () => void;
  canChat: () => boolean;
  getRemainingChats: () => number;
  sessionCount: number;
  incrementSession: () => void;
}

export const DAILY_LIMIT = 100;
const getToday = () => new Date().toISOString().slice(0, 10);

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      userProfile: null,
      setProfile: (p) => set({ userProfile: p }),
      updateProfile: (partial) =>
        set((s) => ({
          userProfile: s.userProfile ? { ...s.userProfile, ...partial } : null,
        })),
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setMessages: (msgs) => set({ messages: msgs }),
      resetMessages: () => set({ messages: [] }),
      conversations: [],
      saveConversation: (c) =>
        set((s) => ({ conversations: [...s.conversations, c] })),
      getRecentConversationMessages: (limit = 8) => {
        const convos = get().conversations;
        return convos.length
          ? convos[convos.length - 1].messages.slice(-limit)
          : [];
      },
      dailyUsage: { date: getToday(), count: 0 },
      incrementDaily: () =>
        set((s) => {
          const today = getToday();
          return {
            dailyUsage:
              s.dailyUsage.date === today
                ? { date: today, count: s.dailyUsage.count + 1 }
                : { date: today, count: 1 },
          };
        }),
      canChat: () => {
        const s = get();
        const today = getToday();
        return s.dailyUsage.date !== today || s.dailyUsage.count < DAILY_LIMIT;
      },
      getRemainingChats: () => {
        const s = get();
        const today = getToday();
        return s.dailyUsage.date !== today
          ? DAILY_LIMIT
          : Math.max(0, DAILY_LIMIT - s.dailyUsage.count);
      },
      sessionCount: 0,
      incrementSession: () =>
        set((s) => ({ sessionCount: s.sessionCount + 1 })),
    }),
    {
      name: "aura-conversation-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
