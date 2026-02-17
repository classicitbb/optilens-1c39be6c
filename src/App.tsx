import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Knowledge from "./pages/Knowledge";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import ReferenceDataPage from "./pages/admin/ReferenceDataPage";
import PlaceholderPage from "./pages/admin/PlaceholderPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import ProductCatalogPage from "./pages/admin/ProductCatalogPage";
import LensPricesPage from "./pages/admin/LensPricesPage";
import ImportsPage from "./pages/admin/ImportsPage";
import UsersPage from "./pages/admin/UsersPage";
import CompanySettingsPage from "./pages/admin/CompanySettingsPage";
import AdminWikiPage from "./pages/admin/AdminWikiPage";

// ZenVue microsite
import ZenvueLayout from "./components/zenvue/ZenvueLayout";
import ZenvueHome from "./pages/zenvue/ZenvueHome";
import ZenvueBrilliance from "./pages/zenvue/ZenvueBrilliance";
import ZenvueSingleVision from "./pages/zenvue/ZenvueSingleVision";
import ZenvueSunDun from "./pages/zenvue/ZenvueSunDun";
import ZenvueDarkun from "./pages/zenvue/ZenvueDarkun";
import ZenvueCompare from "./pages/zenvue/ZenvueCompare";
import ZenvueWholesale from "./pages/zenvue/ZenvueWholesale";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — reference data rarely changes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/store" element={<Store />} />
              <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />

              {/* Admin pricing tool */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<Navigate to="/admin/catalog" replace />} />
                <Route path="catalog" element={<ProductCatalogPage />} />
                <Route path="reference" element={<ReferenceDataPage />} />
                {/* Redirects for old bookmarks */}
                <Route path="lenses" element={<Navigate to="/admin/catalog" replace />} />
                <Route path="supplies" element={<Navigate to="/admin/catalog" replace />} />
                <Route path="addons" element={<Navigate to="/admin/catalog" replace />} />
                <Route path="pricing" element={<LensPricesPage />} />
                <Route path="imports" element={<ImportsPage />} />
                <Route path="history" element={<PlaceholderPage />} />
                <Route path="exports" element={<PlaceholderPage />} />
                <Route path="parameters" element={<CompanySettingsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="wiki" element={<AdminWikiPage />} />
              </Route>

              {/* ZenVue brand microsite */}
              <Route path="/zenvue" element={<ZenvueLayout />}>
                <Route index element={<ZenvueHome />} />
                <Route path="brilliance" element={<ZenvueBrilliance />} />
                <Route path="single-vision" element={<ZenvueSingleVision />} />
                <Route path="sundun" element={<ZenvueSunDun />} />
                <Route path="darkun" element={<ZenvueDarkun />} />
                <Route path="compare" element={<ZenvueCompare />} />
                <Route path="wholesale" element={<ZenvueWholesale />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
