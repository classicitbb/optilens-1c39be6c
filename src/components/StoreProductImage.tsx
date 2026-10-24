import { useState } from "react";
import { extractDataFilePath, useSignedDataFileUrl } from "@/hooks/useSignedDataFileUrl";
import { cn } from "@/lib/utils";

interface Props {
  imageUrl?: string | null;
  name: string;
  productType: string;
  category?: string;
  className?: string;
  showCaption?: boolean;
  eager?: boolean;
}

export function getGenericProductImage(productType: string, category = "") {
  const illustration = productType === "lens" ? "lenses"
    : productType === "addon" ? "services"
    : /accessor|eyewear|frame|case/i.test(category) ? "eyewear" : "supplies";
  return `/images/store/${illustration}.svg`;
}

/** Real product photos win; missing, private-unavailable and broken images have a local fallback. */
export default function StoreProductImage({ imageUrl, name, productType, category, className, showCaption = true, eager = false }: Props) {
  const privateImage = !!imageUrl && extractDataFilePath(imageUrl) !== null;
  const signedUrl = useSignedDataFileUrl(privateImage ? imageUrl : null);
  const resolved = privateImage ? signedUrl : imageUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const generic = !resolved || failedUrl === resolved;
  return (
    <div className={cn("relative overflow-hidden bg-[#e7f0f2]", className)}>
      <img
        src={generic ? getGenericProductImage(productType, category) : resolved}
        alt={generic ? `Generic category illustration for ${name}` : name}
        width={720} height={480}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={generic ? undefined : () => setFailedUrl(resolved!)}
        className="h-full w-full object-contain"
      />
      {generic && showCaption && <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-600">Category illustration</span>}
    </div>
  );
}
