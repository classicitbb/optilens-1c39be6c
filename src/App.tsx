import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
// Dev-only Rx form bench. The conditional has to wrap the import() itself:
// guarding only the <Route> still leaves a static dynamic-import in the graph,
// and Rollup emits it as a real chunk — which shipped the bench and its test
// fixtures to production even though nothing rendered them. import.meta.env.DEV
// is substituted with a literal false at build time, so this whole branch (and
// the chunk) is dropped instead.
const RxOrderPreview = import.meta.env.DEV
  ? lazyWithRetry(() => import("@/features/rx-order/dev/RxOrderPreview"))
  : () => null;
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import RouteLoadingFallback from "@/routes/shared/RouteLoadingFallback";
import RuntimeAnalytics from "@/components/analytics/RuntimeAnalytics";
import ScrollToTop from "@/components/ScrollToTop";
import { CompanionAssistantProvider } from "@/features/assistant/CompanionAssistantContext";
import CompanionAssistant from "@/components/assistant/CompanionAssistant";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PortalRouteErrorBoundary } from "@/components/PortalRouteErrorBoundary";

const PublicRoutes = lazyWithRetry(() => import("@/routes/public/PublicRoutes"));
const PortalRoutes = lazyWithRetry(() => import("@/routes/portal/PortalRoutes"));
const OpsRoutes = lazyWithRetry(() => import("@/routes/ops/OpsRoutes"));
const AdminRoutes = lazyWithRetry(() => import("@/routes/admin/AdminRoutes"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
const OAuthConsent = lazyWithRetry(() => import("@/pages/OAuthConsent"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const Store = lazyWithRetry(() => import("@/pages/Store"));
const StoreProductPage = lazyWithRetry(() => import("@/pages/StoreProductPage"));
const Unsubscribe = lazyWithRetry(() => import("@/pages/Unsubscribe"));
const CheckoutPage = lazyWithRetry(() => import("@/pages/CheckoutPage"));
const OrderCompletePage = lazyWithRetry(() => import("@/pages/OrderCompletePage"));
const CartPage = lazyWithRetry(() => import("@/pages/CartPage"));
const Toaster = lazyWithRetry(() => import("@/components/ui/toaster").then((module) => ({ default: module.Toaster })));
const Sonner = lazyWithRetry(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));
const GlobalErrorLogger = lazyWithRetry(() => import("@/components/GlobalErrorLogger"));
// CookieConsentBanner is imported eagerly so it renders immediately on first
// visit — no idle-callback delay — ensuring consent is collected before any
// analytics or tracking code is initialized.
const CookieConsentBanner = lazyWithRetry(() => import("@/components/CookieConsentBanner"));
const CopilotWorkspacePage = lazyWithRetry(() => import("@/pages/CopilotWorkspacePage"));

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
            
            <DeferredGlobalWidgets />
            {/* Cookie consent renders immediately — before idle widgets — so
                consent is collected before any analytics initialization. */}
            <Suspense fallback={null}>
              <CookieConsentBanner />
            </Suspense>
            <RuntimeAnalytics />
            {/* Last-resort boundary: any error not caught by a route-level
                boundary falls back to a hard reload for all users. */}
            <ErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  {/* Dev-only Rx form bench. import.meta.env.DEV is statically
                      false in a production build, so the route and its lazy
                      chunk are dropped entirely rather than merely hidden. */}
                  {import.meta.env.DEV && (
                    <Route path="/dev/rx-order" element={<RxOrderPreview />} />
                  )}
                  <Route path="/ops/*" element={<AdminProtectedRoute><ErrorBoundary routeLabel="/ops" homeHref="/admin/dashboard" isStaff><OpsRoutes /></ErrorBoundary></AdminProtectedRoute>} />
                  <Route path="/admin/*" element={<AdminProtectedRoute><ErrorBoundary routeLabel="/admin" homeHref="/admin/dashboard" isStaff><AdminRoutes /></ErrorBoundary></AdminProtectedRoute>} />
                  <Route path="/copilot" element={<AdminProtectedRoute><ErrorBoundary routeLabel="/copilot" homeHref="/admin/dashboard" isStaff><CopilotWorkspacePage /></ErrorBoundary></AdminProtectedRoute>} />

                  <Route element={<CustomerShell />}>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/store" element={<ErrorBoundary routeLabel="/store"><Store /></ErrorBoundary>} />
                    <Route path="/store/product/:productType/:productId" element={<ErrorBoundary routeLabel="/store/product"><StoreProductPage /></ErrorBoundary>} />
                    <Route path="/cart" element={<ErrorBoundary routeLabel="/cart"><CartPage /></ErrorBoundary>} />
                    <Route path="/checkout" element={<ErrorBoundary routeLabel="/checkout"><CheckoutPage /></ErrorBoundary>} />
                    <Route path="/order-complete" element={<ErrorBoundary routeLabel="/order-complete"><OrderCompletePage /></ErrorBoundary>} />
                    <Route path="/order/:orderId" element={<ErrorBoundary routeLabel="/order"><OrderCompletePage /></ErrorBoundary>} />
                    <Route path="/profile/*" element={<PortalRouteErrorBoundary routeLabel="/profile"><PortalRoutes /></PortalRouteErrorBoundary>} />
                    <Route path="/portal" element={<Navigate to="/profile" replace />} />
                    <Route path="/*" element={<ErrorBoundary routeLabel="public"><PublicRoutes /></ErrorBoundary>} />
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
