import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import WikiArticleRenderer from '@/components/admin/WikiArticleRenderer';
import '@/styles/workspace-editor.css';
import { openSharedPage, type SharedPageContent } from '../source/helpArticlesSource';

/** Website reader only. No Atlas capabilities, listing, editor, or admin frame is mounted. */
const SharedPageViewer = () => {
  const { token = '' } = useParams();
  const { user } = useAuth();
  const userId = user?.id;
  const request = useRef<{ key: string; promise: Promise<SharedPageContent | null> } | null>(null);
  const [state, setState] = useState<{ key: string; page?: SharedPageContent | null; failed?: boolean }>({ key: '' });
  const key = `${user?.id ?? ''}:${token}`;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    // A new mount/reload is a new access. No shared Query cache or automatic retries.
    if (request.current?.key !== key) request.current = { key, promise: openSharedPage(token) };
    void request.current.promise.then(
      (page) => { if (active) setState({ key, page }); },
      () => { if (active) setState({ key, failed: true }); },
    );
    return () => { active = false; };
  }, [key, token, userId]);
  const current = state.key === key ? state : undefined;
  useEffect(() => {
    if (!current?.page) return;
    const previous = document.title;
    document.title = current.page.title;
    return () => { document.title = previous; };
  }, [current?.page?.title]);
  if (!current) return <p role="status" className="p-8">Loading page…</p>;
  if (current.failed) return <p role="alert" className="p-8">This page could not be opened. Please try again.</p>;
  if (!current.page) return <p role="status" className="p-8">This page is unavailable or is no longer shared.</p>;
  return (
    <article className={`mx-auto w-full px-6 py-10 sm:px-12 ${current.page.fullWidth ? "max-w-none" : "max-w-[720px]"}`}>
      <h1 className="mb-6 text-3xl font-semibold">{current.page.title}</h1>
      <WikiArticleRenderer bodyJson={current.page.body} legacyContent={current.page.legacyContent}
        className="ws-prose" resolvePageHref={() => undefined} />
      <p className="mt-8 text-sm text-muted-foreground">Page access is recorded for the administrator using your signed-in account.</p>
    </article>
  );
};
export default SharedPageViewer;
