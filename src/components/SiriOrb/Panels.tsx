/**
 * src/components/SiriOrb/Panels.tsx
 * All sub-components memo'd. Re-render only when their own props change.
 */
import { PROFILE } from "@/data/profile";
import type { UserProfile } from "@/store/useConversationStore";
import { DAILY_LIMIT } from "@/store/useConversationStore";
import { memo } from "react";

const BMC_URL = "https://buymeacoffee.com/amithellmab";

// ── AuraIcon ──────────────────────────────────────────────────────────────────
export const AuraIcon = memo(({ size = 30 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
      background: "linear-gradient(135deg,#F47521,#7B2FBE)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 ${Math.round(size * 0.4)}px rgba(244,117,33,.4)`,
    }}
  >
    <svg
      width={Math.round(size * 0.4)}
      height={Math.round(size * 0.4)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  </div>
));
AuraIcon.displayName = "AuraIcon";

// ── UserBadge ─────────────────────────────────────────────────────────────────
export const UserBadge = memo(
  ({ user, convoLeft }: { user: UserProfile | null; convoLeft: number }) => {
    if (!user?.name) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          borderRadius: 99,
          background: "rgba(123,47,190,.1)",
          border: "1px solid rgba(123,47,190,.2)",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg,#7B2FBE,#F47521)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            color: "#fff",
            fontWeight: 800,
          }}
        >
          {user.name[0].toUpperCase()}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,.55)",
            fontWeight: 600,
            maxWidth: 90,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.name}
          {user.company ? ` · ${user.company}` : ""}
        </span>
        <span
          style={{
            fontSize: 8,
            color: convoLeft === 0 ? "#ef4444" : "#F47521",
            background:
              convoLeft === 0 ? "rgba(239,68,68,.14)" : "rgba(244,117,33,.14)",
            padding: "1px 5px",
            borderRadius: 99,
            fontWeight: 700,
          }}
        >
          {convoLeft}/{DAILY_LIMIT}
        </span>
      </div>
    );
  },
);
UserBadge.displayName = "UserBadge";

// ── EndScreen ─────────────────────────────────────────────────────────────────
export const EndScreen = memo(
  ({
    name,
    summary,
    onDismiss,
  }: {
    name: string;
    summary: string;
    onDismiss: () => void;
  }) => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(3,2,8,.96)",
        backdropFilter: "blur(30px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 340,
          width: "90%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: 32,
          textAlign: "center",
          animation: "fadeSlideUp .4s cubic-bezier(.34,1.4,.64,1) forwards",
        }}
      >
        <AuraIcon size={52} />
        <div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              margin: "0 0 5px",
            }}
          >
            {name ? `Thanks, ${name}.` : "Session complete."}
          </p>
          {summary && (
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.45)",
                margin: 0,
                lineHeight: 1.72,
              }}
            >
              {summary}
            </p>
          )}
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          <a
            href={`mailto:${PROFILE.email}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(244,117,33,.12)",
              border: "1px solid rgba(244,117,33,.28)",
              color: "#F47521",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Connect with Amit
          </a>
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(255,213,0,.08)",
              border: "1px solid rgba(255,213,0,.22)",
              color: "rgba(255,213,50,.88)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Buy Amit a Coffee ☕
          </a>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,.25)",
            fontSize: 12,
            padding: "6px 16px",
          }}
        >
          Close
        </button>
      </div>
    </div>
  ),
);
EndScreen.displayName = "EndScreen";

// ── LimitScreen ───────────────────────────────────────────────────────────────
export const LimitScreen = memo(({ onClose }: { onClose: () => void }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 20,
      background: "rgba(3,2,8,.97)",
      backdropFilter: "blur(20px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 28,
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "rgba(244,117,33,.1)",
        border: "1px solid rgba(244,117,33,.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F47521"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 7,
        }}
      >
        Daily limit reached
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,.38)",
          lineHeight: 1.72,
        }}
      >
        {DAILY_LIMIT} conversations per day. Resets at midnight.
      </div>
    </div>
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 20px",
          borderRadius: 14,
          background: "rgba(255,213,0,.09)",
          border: "1px solid rgba(255,213,0,.22)",
          color: "rgba(255,213,50,.88)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Buy Amit a Coffee ☕
      </a>
      <a
        href={`mailto:${PROFILE.email}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 20px",
          borderRadius: 14,
          background: "rgba(244,117,33,.1)",
          border: "1px solid rgba(244,117,33,.22)",
          color: "#F47521",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Contact Amit directly
      </a>
    </div>
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "rgba(255,255,255,.22)",
        fontSize: 12,
      }}
    >
      Dismiss
    </button>
  </div>
));
LimitScreen.displayName = "LimitScreen";
