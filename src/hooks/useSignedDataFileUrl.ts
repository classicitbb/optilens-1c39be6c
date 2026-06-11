import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "data-files";
const PUBLIC_MARKER = "/storage/v1/object/public/data-files/";
const SIGNED_MARKER = "/storage/v1/object/sign/data-files/";
const EXPIRES_IN = 60 * 60; // 1 hour

/** Extracts the bucket path from a stored public/signed Supabase Storage URL. */
export function extractDataFilePath(url?: string | null): string | null {
  if (!url) return null;
  for (const marker of [PUBLIC_MARKER, SIGNED_MARKER]) {
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const tail = url.slice(idx + marker.length);
      // strip query string from signed URLs
      const q = tail.indexOf("?");
      return q === -1 ? tail : tail.slice(0, q);
    }
  }
  return null;
}

/**
 * Resolves a stored data-files URL (legacy public URL or a path) into a
 * short-lived signed URL. Bucket is private; direct public URLs no longer work.
 */
export function useSignedDataFileUrl(storedUrl?: string | null): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    if (!storedUrl) return;

    const path = extractDataFilePath(storedUrl) ?? storedUrl;
    if (!path) return;

    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, EXPIRES_IN);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setSignedUrl(null);
        return;
      }
      setSignedUrl(data.signedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [storedUrl]);

  return signedUrl;
}
