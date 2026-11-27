import { createRoot } from "react-dom/client";
import "@fontsource/plus-jakarta-sans/latin-300.css";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/dm-sans/latin-300.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
// Local, sample-only design bench. Never included in a production render.
if (import.meta.env.DEV && window.location.pathname === "/admin/finance/walk-in-payments" && new URLSearchParams(window.location.search).get("design") === "1") {
  void import("./features/admin/walk-in-payments/WalkInPaymentsPrototype").then(({ default: Preview }) => root.render(<Preview />));
} else {
  root.render(<App />);
}
