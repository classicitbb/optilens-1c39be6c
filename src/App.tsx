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
import ResetPassword from "./pages/ResetPassword";
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
import RxLensPricesPage from "./pages/admin/RxLensPricesPage";
import StockLensPricesPage from "./pages/admin/StockLensPricesPage";
import BuySellPricesPage from "./pages/admin/BuySellPricesPage";
import ImportsPage from "./pages/admin/ImportsPage";
import UsersPage from "./pages/admin/UsersPage";
import CompanySettingsPage from "./pages/admin/CompanySettingsPage";
import AdminWikiPage from "./pages/admin/AdminWikiPage";
import ShipmentListPage from "./pages/admin/costings/ShipmentListPage";
import ShipmentDetailPage from "./pages/admin/costings/ShipmentDetailPage";
import CostingsReportsPage from "./pages/admin/costings/CostingsReportsPage";
import QuotationsListPage from "./pages/admin/QuotationsListPage";
import QuoteEditorPage from "./pages/admin/QuoteEditorPage";

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
      staleTime: 5 * 60 * 1000,
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
              <Route path="/reset-password" element={<ResetPassword />} />
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
                {/* New dedicated price modules */}
                <Route path="rx-lens-prices" element={<RxLensPricesPage />} />
                <Route path="stock-lens-prices" element={<StockLensPricesPage />} />
                <Route path="buy-sell-prices" element={<BuySellPricesPage />} />
                <Route path="imports" element={<ImportsPage />} />
                <Route path="history" element={<PlaceholderPage />} />
                <Route path="exports" element={<PlaceholderPage />} />
                <Route path="parameters" element={<CompanySettingsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit" element={<Navigate to="/admin/parameters" replace />} />
                <Route path="wiki" element={<AdminWikiPage />} />
                <Route path="quotations" element={<QuotationsListPage />} />
                <Route path="quotations/:id" element={<QuoteEditorPage />} />
                {/* Import Costings */}
                <Route path="costings/shipments" element={<ShipmentListPage title="All Shipments" />} />
                <Route path="costings/shipments/new" element={<ShipmentDetailPage />} />
                <Route path="costings/shipments/:id" element={<ShipmentDetailPage />} />
                <Route path="costings/lens-shipments" element={<ShipmentListPage typeFilter="lens" title="Lens Shipments" />} />
                <Route path="costings/non-lens-shipments" element={<ShipmentListPage typeFilter="non-lens" title="Non-Lens Shipments" />} />
                <Route path="costings/reports" element={<CostingsReportsPage />} />
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
