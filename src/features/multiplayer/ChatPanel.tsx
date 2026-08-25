import { useEffect, useRef, useState } from "react";
import { MessagesSquare, SendHorizontal } from "lucide-react";
import type { ChatMessage, PlayerId } from "./protocol";

const MAX_CHAT_LENGTH = 300;

/**
 * Room chat, used both in the lobby and while a round is running.
 *
 * It is deliberately available during a race as well as before one: the people
 * most likely to want to talk are the ones who have already finished and are
 * watching everyone else, and making them wait for the lobby would be the
 * quietest possible moment to switch it off.
 */
export function ChatPanel({
  messages,
  selfId,
  onSend,
  compact = false,
}: {
  messages: readonly ChatMessage[];
  selfId: PlayerId | null;
  onSend: (text: string) => void;
  /** The in-race variant, which sits in a narrower column. */
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow new messages, but stop fighting someone who has scrolled up to read
  // back through the history.
  useEffect(() => {
    const list = listRef.current;
    if (list && pinnedToBottom.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  return (
    <section className={`mp-chat ${compact ? "mp-chat-compact" : ""}`} aria-label="Room chat">
      <h2>
        <MessagesSquare size={17} aria-hidden="true" />
        Chat
      </h2>
      <ol
        className="mp-chat-log"
        ref={listRef}
        aria-live="polite"
        onScroll={(event) => {
          const list = event.currentTarget;
          pinnedToBottom.current =
            list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        }}
      >
        {messages.length === 0 ? (
          <li className="mp-chat-empty">Say something while you wait.</li>
        ) : (
          messages.map((message, index) => (
            <li
              key={`${message.at}-${message.playerId}-${index}`}
              data-self={message.playerId === selfId ? "true" : undefined}
            >
              <strong>{message.nickname}</strong>
              <span>{message.text}</span>
            </li>
          ))
        )}
      </ol>
      <form
        className="mp-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSend(draft);
          setDraft("");
        }}
      >
        <input
          type="text"
          value={draft}
          maxLength={MAX_CHAT_LENGTH}
          placeholder="Message"
          aria-label="Chat message"
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          // The race view binds the arrow keys to switching spectator target,
          // so keystrokes typed here must not escape into it.
          onKeyDown={(event) => event.stopPropagation()}
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim()}>
          <SendHorizontal size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
