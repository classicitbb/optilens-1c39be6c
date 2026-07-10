import { ImgHTMLAttributes } from "react";
import { useSignedDataFileUrl, extractDataFilePath } from "@/hooks/useSignedDataFileUrl";

interface StorageImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: string;
}

/**
 * Renders an <img> for a stored URL, resolving private data-files bucket
 * paths to short-lived signed URLs. Non-data-files URLs pass through.
 */
const StorageImage = ({ src, fallback, alt, ...rest }: StorageImageProps) => {
  const isDataFile = !!src && extractDataFilePath(src) !== null;
  const signed = useSignedDataFileUrl(isDataFile ? src : null);
  const resolved = isDataFile ? signed : src;
  if (!resolved) {
    if (fallback) return <img src={fallback} alt={alt} {...rest} />;
    return null;
  }
  return <img src={resolved} alt={alt} {...rest} />;
};

export default StorageImage;
