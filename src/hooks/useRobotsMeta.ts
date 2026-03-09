import { useEffect } from "react";

export const useRobotsMeta = (content: string) => {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const meta = existing ?? document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", content);
    if (!existing) {
      document.head.appendChild(meta);
    }

    return () => {
      if (existing) {
        existing.setAttribute("content", "index,follow");
      } else {
        meta.remove();
      }
    };
  }, [content]);
};
