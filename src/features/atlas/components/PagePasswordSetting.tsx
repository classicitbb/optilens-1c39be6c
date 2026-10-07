import { useState } from "react";
import type { AtlasDoc } from "../source/types";
import { createLock, lockPage, unlockPage, usePageUnlocked } from "../lock";

interface PagePasswordSettingProps {
  pageId: string;
  doc: AtlasDoc;
  disabled?: boolean;
  onDocChange: (update: (doc: AtlasDoc) => AtlasDoc) => void;
}

const inputClass = "h-9 w-full border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent disabled:opacity-50";
const buttonClass = "h-8 rounded-[6px] px-3 text-[13px] hover:bg-[var(--ws-hover)] disabled:opacity-40";

/** Set, change, remove or re-lock a page's password. Changing it needs the page unlocked first. */
const PagePasswordSetting = ({ pageId, doc, disabled, onDocChange }: PagePasswordSettingProps) => {
  const { lock } = doc;
  const unlocked = usePageUnlocked(pageId, lock);
  const [password, setPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!password || busy) return;
    setBusy(true);
    try {
      const next = await createLock(password);
      onDocChange((current) => ({ ...current, lock: next }));
      unlockPage(pageId, next);
      setPassword("");
      setChanging(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    onDocChange(({ lock: _removed, ...rest }) => rest);
    setChanging(false);
  };

  return (
    <div className="space-y-1.5">
      <p className="ws-label block text-ws-ink-3">Password</p>
      {lock && !unlocked ? (
        <p className="text-[13px] text-ws-ink-3">Unlock this page to change or remove its password.</p>
      ) : lock && !changing ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[13px] text-ws-ink-2">Protected</span>
          <button type="button" disabled={disabled} className={buttonClass} onClick={() => setChanging(true)}>
            Change
          </button>
          <button type="button" disabled={disabled} className={buttonClass} onClick={remove}>
            Remove
          </button>
          <button type="button" className={buttonClass} onClick={() => lockPage(pageId, lock)}>
            Lock now
          </button>
        </div>
      ) : (
        <form
          className="flex gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <input
            type="password"
            value={password}
            disabled={disabled}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={lock ? "New password" : "Set a password"}
            aria-label={lock ? "New page password" : "Page password"}
            autoComplete="new-password"
            className={inputClass}
          />
          <button type="submit" disabled={disabled || !password || busy} className={`${buttonClass} bg-ws-accent font-semibold text-[hsl(var(--ws-accent-fg))]`}>
            {lock ? "Save" : "Protect"}
          </button>
        </form>
      )}
      {!lock ? (
        <p className="text-[12px] text-ws-ink-3">Hides the page until the password is entered. The text is not encrypted, so keep truly sensitive data off the page.</p>
      ) : null}
    </div>
  );
};

export default PagePasswordSetting;
