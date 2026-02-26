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
import LegalPage from "./pages/LegalPage";
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
import RolesPermissionsPage from "./pages/admin/RolesPermissionsPage";
import AdminWikiPage from "./pages/admin/AdminWikiPage";
import ContentManagerPage from "./pages/admin/ContentManagerPage";
import ImportCostingsPage from "./pages/admin/costings/ImportCostingsPage";
import ShipmentDetailPage from "./pages/admin/costings/ShipmentDetailPage";
import CostingsReportsPage from "./pages/admin/costings/CostingsReportsPage";
import QuotationsListPage from "./pages/admin/QuotationsListPage";
import QuoteEditorPage from "./pages/admin/QuoteEditorPage";
import CatalogPublisherPage from "./pages/admin/CatalogPublisherPage";
import CatalogEditorPage from "./pages/admin/CatalogEditorPage";
import ContactsPage from "./pages/admin/erp/ContactsPage";
import ContactTagsConfigPage from "./pages/admin/erp/ContactTagsConfigPage";
import IndustriesConfigPage from "./pages/admin/erp/IndustriesConfigPage";
import ErpPlaceholderPage from "./pages/admin/erp/ErpPlaceholderPage";
import PricingSettingsPage from "./pages/admin/PricingSettingsPage";

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
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
              <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/privacy-policy" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
              <Route path="/terms" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
              <Route path="/return-policy" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />

              {/* Admin — all apps share AdminLayout */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<Navigate to="/admin/pricing/catalog" replace />} />

                {/* ═══ Pricing App ═══ */}
                <Route path="pricing" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="pricing/catalog" element={<ProductCatalogPage />} />
                <Route path="pricing/rx-lenses" element={<RxLensPricesPage />} />
                <Route path="pricing/stock-lenses" element={<StockLensPricesPage />} />
                <Route path="pricing/supplies" element={<BuySellPricesPage />} />
                <Route path="pricing/publisher" element={<CatalogPublisherPage />} />
                <Route path="pricing/publisher/:id" element={<CatalogEditorPage />} />
                <Route path="pricing/costings" element={<ImportCostingsPage />} />
                <Route path="pricing/costings/new" element={<ShipmentDetailPage />} />
                <Route path="pricing/costings/:id" element={<ShipmentDetailPage />} />
                <Route path="pricing/costings/reports" element={<CostingsReportsPage />} />
                <Route path="pricing/reference" element={<ReferenceDataPage />} />
                <Route path="pricing/imports" element={<ImportsPage />} />
                <Route path="pricing/settings" element={<PricingSettingsPage />} />
                {/* Legacy pricing route */}
                <Route path="pricing/legacy" element={<LensPricesPage />} />

                {/* ═══ Sales App ═══ */}
                <Route path="sales" element={<Navigate to="/admin/sales/quotations" replace />} />
                <Route path="sales/quotations" element={<QuotationsListPage />} />
                <Route path="sales/quotations/:id" element={<QuoteEditorPage />} />
                <Route path="sales/web-orders" element={<PlaceholderPage />} />
                <Route path="sales/rx-orders" element={<PlaceholderPage />} />

                {/* ═══ Contacts App ═══ */}
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="contacts/config/tags" element={<ContactTagsConfigPage />} />
                <Route path="contacts/config/industries" element={<IndustriesConfigPage />} />

                {/* ═══ Leads App ═══ */}
                <Route path="leads" element={<Navigate to="/admin/leads/finder" replace />} />
                <Route path="leads/finder" element={<PlaceholderPage />} />
                <Route path="leads/campaigns" element={<PlaceholderPage />} />
                <Route path="leads/reports" element={<PlaceholderPage />} />
                <Route path="leads/ai" element={<PlaceholderPage />} />
                <Route path="leads/settings" element={<PlaceholderPage />} />

                {/* ═══ CRM App ═══ */}
                <Route path="crm" element={<Navigate to="/admin/crm/pipeline" replace />} />
                <Route path="crm/pipeline" element={<PlaceholderPage />} />
                <Route path="crm/activities" element={<PlaceholderPage />} />

                {/* ═══ Helpdesk App ═══ */}
                <Route path="helpdesk" element={<Navigate to="/admin/helpdesk/tickets" replace />} />
                <Route path="helpdesk/tickets" element={<PlaceholderPage />} />
                <Route path="helpdesk/teams" element={<PlaceholderPage />} />
                <Route path="helpdesk/sla" element={<PlaceholderPage />} />

                {/* ═══ Website App ═══ */}
                <Route path="website" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="website/content" element={<ContentManagerPage />} />
                <Route path="website/microsites" element={<PlaceholderPage />} />
                <Route path="website/portals" element={<PlaceholderPage />} />
                <Route path="website/store" element={<PlaceholderPage />} />

                {/* ═══ Knowledge App ═══ */}
                <Route path="knowledge" element={<Navigate to="/admin/knowledge/wiki" replace />} />
                <Route path="knowledge/wiki" element={<AdminWikiPage />} />
                <Route path="knowledge/help" element={<PlaceholderPage />} />

                {/* ═══ Settings App ═══ */}
                <Route path="settings" element={<Navigate to="/admin/settings/company" replace />} />
                <Route path="settings/company" element={<CompanySettingsPage />} />
                <Route path="settings/users" element={<UsersPage />} />
                <Route path="settings/roles" element={<RolesPermissionsPage />} />
                <Route path="settings/audit" element={<AuditLogPage />} />
                <Route path="settings/integrations" element={<PlaceholderPage />} />

                {/* ═══ Legacy redirects ═══ */}
                <Route path="catalog" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="reference" element={<Navigate to="/admin/pricing/reference" replace />} />
                <Route path="lenses" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="supplies" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="addons" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="rx-lens-prices" element={<Navigate to="/admin/pricing/rx-lenses" replace />} />
                <Route path="stock-lens-prices" element={<Navigate to="/admin/pricing/stock-lenses" replace />} />
                <Route path="supplies-prices" element={<Navigate to="/admin/pricing/supplies" replace />} />
                <Route path="imports" element={<Navigate to="/admin/pricing/imports" replace />} />
                <Route path="catalog-publisher" element={<Navigate to="/admin/pricing/publisher" replace />} />
                <Route path="catalog-publisher/:id" element={<Navigate to="/admin/pricing/publisher" replace />} />
                <Route path="quotations" element={<Navigate to="/admin/sales/quotations" replace />} />
                <Route path="costings/shipments" element={<Navigate to="/admin/pricing/costings" replace />} />
                <Route path="costings/reports" element={<Navigate to="/admin/pricing/costings/reports" replace />} />
                <Route path="parameters" element={<Navigate to="/admin/settings/company" replace />} />
                <Route path="users" element={<Navigate to="/admin/settings/users" replace />} />
                <Route path="audit" element={<Navigate to="/admin/settings/audit" replace />} />
                <Route path="wiki" element={<Navigate to="/admin/knowledge/wiki" replace />} />
                <Route path="content" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="erp/contacts" element={<Navigate to="/admin/contacts" replace />} />
                <Route path="erp/config/contact-tags" element={<Navigate to="/admin/contacts/config/tags" replace />} />
                <Route path="erp/config/industries" element={<Navigate to="/admin/contacts/config/industries" replace />} />
                <Route path="erp/crm" element={<Navigate to="/admin/crm/pipeline" replace />} />
                <Route path="erp/helpdesk" element={<Navigate to="/admin/helpdesk/tickets" replace />} />
                <Route path="erp/web-orders" element={<Navigate to="/admin/sales/web-orders" replace />} />
                <Route path="erp/rx-orders" element={<Navigate to="/admin/sales/rx-orders" replace />} />
                <Route path="erp/website" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="history" element={<Navigate to="/admin/pricing/catalog" replace />} />
              </Route>

              {/* ZenVue brand microsite */}
              <Route path="/zenvue" element={<ProtectedRoute><ZenvueLayout /></ProtectedRoute>}>
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
