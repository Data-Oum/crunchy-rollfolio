

## Build Error Fix

**Problem**: Line 1515 `let nextStep = step;` inherits the narrowed type from the `step !== "ready"` guard on line 1500. TypeScript excludes `"ready"` from the inferred type, so assigning `"ready"` on line 1547 fails.

**Fix**: Explicitly annotate `nextStep` as `OnboardStep`:
```typescript
let nextStep: OnboardStep = step;
```

This is a single-line type annotation fix on line 1515 of `SiriOrb.tsx`.

---

## Broader Scope — Full Rework Plan

The user is asking for a massive overhaul across multiple dimensions. Here is what needs to happen, broken into phases:

### Phase 1: Fix Build Error (immediate)
- Line 1515: add `OnboardStep` type annotation to `nextStep`

### Phase 2: Replace localStorage with Zustand Persist
- Install `zustand` package
- Create `src/store/useConversationStore.ts` with `persist` middleware
- Store: user profile, conversation history, session count, daily usage tracking
- Remove all `localStorage`/`getStorage()` calls from SiriOrb

### Phase 3: Context Management and RAG-like Conversation
- Build a proper system prompt that includes full AMIT_CONTEXT and user profile context
- Send complete conversation history to Gemini on every request (not just last message)
- Add feedback extraction — after AI replies, parse sentiment and intent to refine future responses
- Implement daily limit (2 conversations) tracked in Zustand store with date-based reset

### Phase 4: Voice Quality Improvements
- Set speech rate to 0.85-0.9 for slower, more natural cadence
- Select natural-sounding voices (prioritize "Google UK English Male" or similar)
- Add SSML-like pauses using punctuation in responses
- Anime-tone system prompt: speak as "Aura", Amit's anime-styled AI ambassador

### Phase 5: Input Validation
- Zod schemas for all user inputs (name, company, role, intent)
- Sanitize before sending to Gemini
- Rate limiting on send (debounce + daily cap)
- Proper error boundaries and toast notifications

### Phase 6: 3D Cinematic Landing (Three.js)
- Install `@react-three/fiber@^8.18`, `three@^0.133`, `@react-three/drei@^9.122.0`
- Create `src/components/AnimeScene3D.tsx` — a full-screen Three.js canvas with:
  - Shader-based plasma background replacing the 2D canvas
  - Floating 3D particles with post-processing bloom
  - Camera animation on scroll
- Replace `PlasmaCanvas` with the 3D scene in Index.tsx

### Phase 7: Buy Me a Coffee Integration
- Show BMC link after 3+ user messages
- Animated CTA chip in the chat panel
- Link: `https://buymeacoffee.com/amithellmab`

### Technical Details

**Zustand store shape:**
```text
ConversationStore {
  userProfile: UserProfile | null
  messages: Message[]
  dailyConversations: { date: string, count: number }
  sessionCount: number
  // actions
  setProfile, addMessage, resetChat, incrementDaily, canChat
}
```

**System prompt structure:**
```text
[PERSONA] Aura — anime-styled AI voice for Amit Chakraborty
[CONTEXT] Full profile data injected
[USER] Name, company, role, intent from Zustand
[HISTORY] Last N messages for continuity
[RULES] Anime tone, slow speech, end with follow-up suggestion
```

This is a large implementation. I will prioritize in this order:
1. Fix the build error
2. Zustand persistence + context management
3. Voice + validation improvements
4. 3D scene (separate pass due to complexity)

