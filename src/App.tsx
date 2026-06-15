import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import RouteLoadingFallback from "@/routes/shared/RouteLoadingFallback";
import RuntimeAnalytics from "@/components/analytics/RuntimeAnalytics";
import ScrollToTop from "@/components/ScrollToTop";
import AdminHostRedirect from "@/components/AdminHostRedirect";
import { CompanionAssistantProvider } from "@/features/assistant/CompanionAssistantContext";
import CompanionAssistant from "@/components/assistant/CompanionAssistant";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PublicRoutes = lazy(() => import("@/routes/public/PublicRoutes"));
const PortalRoutes = lazy(() => import("@/routes/portal/PortalRoutes"));
const OpsRoutes = lazy(() => import("@/routes/ops/OpsRoutes"));
const AdminRoutes = lazy(() => import("@/routes/admin/AdminRoutes"));
const MoonshotRoutes = lazy(() => import("@/routes/moonshot/MoonshotRoutes"));
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Store = lazy(() => import("@/pages/Store"));
const StoreProductPage = lazy(() => import("@/pages/StoreProductPage"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const Toaster = lazy(() => import("@/components/ui/toaster").then((module) => ({ default: module.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));
const GlobalErrorLogger = lazy(() => import("@/components/GlobalErrorLogger"));
// CookieConsentBanner is imported eagerly so it renders immediately on first
// visit — no idle-callback delay — ensuring consent is collected before any
// analytics or tracking code is initialized.
const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));

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
    <CompanionAssistantProvider>
      <Outlet />
      <CompanionAssistant />
    </CompanionAssistantProvider>
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
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <AdminHostRedirect />
            <DeferredGlobalWidgets />
            {/* Cookie consent renders immediately — before idle widgets — so
                consent is collected before any analytics initialization. */}
            <Suspense fallback={null}>
              <CookieConsentBanner />
            </Suspense>
            <RuntimeAnalytics />
            <ErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/ops/*" element={<AdminProtectedRoute><OpsRoutes /></AdminProtectedRoute>} />
                  <Route path="/admin/moonshot/*" element={<AdminProtectedRoute><MoonshotRoutes /></AdminProtectedRoute>} />
                  <Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} />

                  <Route element={<CustomerShell />}>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/store" element={<Store />} />
                    <Route path="/store/product/:productType/:productId" element={<StoreProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/profile/*" element={<PortalRoutes />} />
                    <Route path="/orders" element={<Navigate to="/profile/orders" replace />} />
                    <Route path="/portal" element={<Navigate to="/profile" replace />} />
                    <Route path="/*" element={<PublicRoutes />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
