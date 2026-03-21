import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import RouteLoadingFallback from "@/routes/shared/RouteLoadingFallback";
import Store from "@/pages/Store";

const Toaster = lazy(() => import("@/components/ui/toaster").then((module) => ({ default: module.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));
const GlobalErrorLogger = lazy(() => import("@/components/GlobalErrorLogger"));
const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));

const PublicRoutes = lazy(() => import("@/routes/public/PublicRoutes"));
const PortalRoutes = lazy(() => import("@/routes/portal/PortalRoutes"));
const OpsRoutes = lazy(() => import("@/routes/ops/OpsRoutes"));
const AdminRoutes = lazy(() => import("@/routes/admin/AdminRoutes"));
const MoonshotRoutes = lazy(() => import("@/routes/moonshot/MoonshotRoutes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const CustomerShell = () => (
  <CartProvider>
    <Outlet />
  </CartProvider>
);

const DeferredGlobalWidgets = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let timer: number;
    if (typeof window.requestIdleCallback === "function") {
      timer = window.requestIdleCallback(() => setMounted(true), { timeout: 1200 });
      return () => window.cancelIdleCallback(timer);
    }
    timer = window.setTimeout(() => setMounted(true), 300) as unknown as number;
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
      <GlobalErrorLogger />
      <CookieConsentBanner />
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="optilens-theme">
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <DeferredGlobalWidgets />
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/ops/*" element={<AdminProtectedRoute><OpsRoutes /></AdminProtectedRoute>} />
                <Route path="/admin/moonshot/*" element={<AdminProtectedRoute><MoonshotRoutes /></AdminProtectedRoute>} />
                <Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} />

                <Route element={<CustomerShell />}>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/profile/*" element={<PortalRoutes />} />
                  <Route path="/orders" element={<Navigate to="/profile/orders" replace />} />
                  <Route path="/portal" element={<Navigate to="/profile" replace />} />
                  <Route path="/*" element={<PublicRoutes />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
