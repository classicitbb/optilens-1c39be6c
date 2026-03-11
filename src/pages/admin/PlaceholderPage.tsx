import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const name = pathname.split("/").pop() ?? "Module";
  const title = name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">Coming in a future phase.</p>
    </div>
  );
};

export default PlaceholderPage;
