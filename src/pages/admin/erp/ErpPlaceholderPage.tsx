import { useLocation } from "react-router";

const ErpPlaceholderPage = () => {
  const { pathname } = useLocation();
  const name = pathname.split("/").pop() ?? "Module";

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "hsl(168 76% 42% / 0.1)" }}>
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-lg font-bold capitalize" style={{ color: "hsl(215 30% 15%)" }}>
        {name.replace(/-/g, " ")}
      </h2>
      <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
        This module is coming soon.
      </p>
    </div>
  );
};

export default ErpPlaceholderPage;
