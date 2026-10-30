import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AtlasPage, AtlasSource, PersonalShare } from "../source/types";

interface Props {
  page: AtlasPage;
  source: AtlasSource;
}

/** Share a personal page with specific people. Only the owner can change this (row-level security enforces it). */
const PersonalSharing = ({ page, source }: Props) => {
  const { user } = useAuth();
  const isOwner = Boolean(user?.id && page.ownerId === user.id);
  const [shares, setShares] = useState<PersonalShare[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const list = await source.listPersonalShares(page.id);
    setShares(list);
    const entries = await Promise.all(list.map(async (share) => [share.userId, (await source.personName(share.userId)) ?? "Unknown person"] as const));
    setNames(Object.fromEntries(entries));
  }, [page.id, source]);

  useEffect(() => {
    if (!isOwner) return;
    load().catch(() => setMessage("Could not load who this page is shared with."));
  }, [isOwner, load]);

  useEffect(() => {
    const q = query.trim();
    if (!isOwner || q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      source.searchPeople(q, { staffOnly: true }).then(
        (found) => active && setResults(found.filter((person) => person.id !== user?.id && !shares.some((share) => share.userId === person.id)).slice(0, 6)),
        () => active && setResults([]),
      );
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOwner, query, shares, source, user?.id]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
    } catch (error) {
      const detail = (error as { message?: unknown } | null)?.message;
      setMessage(typeof detail === "string" && detail ? detail : "Could not change sharing.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">This page is private. Only its owner can see who it is shared with or change that.</p>;
  }

  return (
    <div className="space-y-3">
      <p>This page is private to you. Share it with specific people below. Public links are not available for personal pages.</p>
      {message ? <p role="alert">{message}</p> : null}
      <div className="space-y-1">
        <label htmlFor="personal-share-search" className="text-sm font-medium">Add people</label>
        <input id="personal-share-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" className="w-full rounded border p-2" autoComplete="off" />
        {results.length > 0 ? (
          <ul className="rounded border">
            {results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="w-full px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
                  onClick={() => void run(async () => { await source.setPersonalShare(page.id, person.id, false); setQuery(""); })}
                >
                  {person.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <ul className="divide-y rounded border" aria-label="People with access">
        {shares.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">Not shared with anyone.</li> : null}
        {shares.map((share) => (
          <li key={share.userId} className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 truncate">{names[share.userId] ?? "…"}</span>
            <select
              aria-label={`Access for ${names[share.userId] ?? "person"}`}
              value={share.canEdit ? "edit" : "view"}
              disabled={busy}
              onChange={(event) => void run(() => source.setPersonalShare(page.id, share.userId, event.target.value === "edit"))}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>
            <button type="button" disabled={busy} aria-label={`Stop sharing with ${names[share.userId] ?? "person"}`} onClick={() => void run(() => source.removePersonalShare(page.id, share.userId))} className="rounded p-1 hover:bg-accent disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PersonalSharing;
