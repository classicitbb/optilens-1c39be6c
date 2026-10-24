import { useState } from "react";
import { Lock } from "lucide-react";
import type { PageLock } from "@/components/blog/BlogPostRenderer";
import { checkPassword } from "../lock";

interface PageLockGateProps {
  lock: PageLock;
  onUnlock: () => void;
}

/** Stands in for the page body until the page's password is entered. */
const PageLockGate = ({ lock, onUnlock }: PageLockGateProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!password || checking) return;
    setChecking(true);
    try {
      if (await checkPassword(lock, password)) {
        onUnlock();
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <form
      className="mx-auto flex max-w-[360px] flex-col items-start gap-3 border border-ws-line bg-ws-paper p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2 text-ws-ink">
        <Lock className="h-4 w-4" aria-hidden />
        <p className="text-[15px] font-semibold">This page is password protected</p>
      </div>
      <input
        autoFocus
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(false);
        }}
        placeholder="Password"
        aria-label="Page password"
        aria-invalid={error}
        autoComplete="off"
        className="h-9 w-full border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent"
      />
      {error ? (
        <p role="alert" className="text-[13px] text-red-600">
          That password is not right.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!password || checking}
        className="h-9 rounded-[6px] bg-ws-accent px-4 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] disabled:opacity-40"
      >
        Unlock
      </button>
    </form>
  );
};

export default PageLockGate;
