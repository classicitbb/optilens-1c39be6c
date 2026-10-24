import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AtlasPage, AtlasSource } from '../source/types';

interface Props { page: AtlasPage; source: AtlasSource; open: boolean; onOpenChange: (open: boolean) => void }
const PageSharingDialog = ({ page, source, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [share, setShare] = useState<{ token: string; enabled: boolean } | null>(null);
  const [accesses, setAccesses] = useState<Awaited<ReturnType<AtlasSource['listPageAccesses']>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setShare(null); setAccesses([]); setMessage(''); setLoadFailed(false);
    void Promise.all([source.getPageSharing(page.id), source.listPageAccesses(page.id)]).then(
      ([saved, history]) => { if (active) { setShare(saved); setAccesses(history); setLoading(false); } },
      () => { if (active) { setMessage('Sharing is unavailable. The required database migration may not be installed.'); setLoadFailed(true); setLoading(false); } },
    );
    return () => { active = false; };
  }, [open, page.id, source, user?.id]);
  const toggle = async () => {
    setBusy(true); setMessage('');
    try { setShare(await source.setPageSharing(page.id, !share?.enabled)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change sharing.'); }
    finally { setBusy(false); }
  };
  const url = share ? `${window.location.origin}/shared/pages/${share.token}` : '';
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl">
    <DialogHeader><DialogTitle>Share published page</DialogTitle></DialogHeader>
    <p>Anyone with this link can read the published page after signing in or creating a website account. They may forward the link. Draft edits stay private.</p>
    <p className="text-sm text-muted-foreground">Only share information intended for every signed-in link holder. Disabling sharing stops future access; it cannot recall copies already saved.</p>
    {message ? <p role="alert">{message}</p> : null}
    {loading ? <p role="status">Loading sharing settings…</p> : <>
      <button type="button" disabled={busy || (!share?.enabled && page.status !== 'published') || loadFailed} onClick={() => void toggle()}
        className="rounded border px-3 py-2 disabled:opacity-50">{share?.enabled ? 'Disable sharing' : 'Enable sharing'}</button>
      {share?.enabled ? <div className="space-y-2"><label htmlFor="shared-page-link">Read-only page link</label>
        <input id="shared-page-link" readOnly value={url} className="w-full rounded border p-2" />
        <button type="button" onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage('Link copied.'), () => setMessage('Select the link above to copy it.'))}>Copy link</button>
      </div> : null}
      <h2 className="font-semibold">Recent access</h2>
      <p className="text-sm text-muted-foreground">Latest 100 page opens. Accounts identify the signed-in user, not a verified individual. Reloads may add another entry.</p>
      <div className="max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Account</th><th>Page / version</th><th>Opened</th></tr></thead><tbody>
        {accesses.map((entry) => <tr key={entry.id}><td className="py-2">{entry.email ?? entry.userId ?? 'Deleted account'}</td><td>{entry.title} / {entry.version}</td><td>{new Date(entry.accessedAt).toLocaleString()}</td></tr>)}
      </tbody></table>{accesses.length === 0 ? <p>No recorded access.</p> : null}</div>
    </>}
  </DialogContent></Dialog>;
};
export default PageSharingDialog;
