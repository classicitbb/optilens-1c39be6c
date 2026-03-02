import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Knowledge from "./pages/Knowledge";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import LegalPage from "./pages/LegalPage";
import LensDesignGuidePage from "./pages/LensDesignGuidePage";
import MirrorFinishPage from "./pages/MirrorFinishPage";
import UltraClearARPage from "./pages/coatings/UltraClearARPage";
import BlueBlockARPage from "./pages/coatings/BlueBlockARPage";
import ScratchResistantPage from "./pages/coatings/ScratchResistantPage";
import UVShieldPage from "./pages/coatings/UVShieldPage";
import HydrophobicOleophobicPage from "./pages/coatings/HydrophobicOleophobicPage";
import HowARCoatingWorksPage from "./pages/coatings/HowARCoatingWorksPage";
import CaringForCoatedLensesPage from "./pages/coatings/CaringForCoatedLensesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import PatientsPage from "./pages/PatientsPage";
import OfficeOccupationalPage from "./pages/lenses/OfficeOccupationalPage";
import AntiFatiguePage from "./pages/lenses/AntiFatiguePage";
import BlueFilterPage from "./pages/lenses/BlueFilterPage";
import TintsFashionColorsPage from "./pages/lenses/TintsFashionColorsPage";
import MaterialsPage from "./pages/lenses/MaterialsPage";
import ThicknessChartPage from "./pages/lenses/ThicknessChartPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminHomeRedirect from "./components/admin/AdminHomeRedirect";
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
import QuotePrintPreviewPage from "./pages/admin/QuotePrintPreviewPage";
import CatalogPublisherPage from "./pages/admin/CatalogPublisherPage";
import CatalogPublisherV2Page from "./pages/admin/CatalogPublisherV2Page";
import CatalogEditorPage from "./pages/admin/CatalogEditorPage";
import ContactsPage from "./pages/admin/erp/ContactsPage";
import ContactTagsConfigPage from "./pages/admin/erp/ContactTagsConfigPage";
import IndustriesConfigPage from "./pages/admin/erp/IndustriesConfigPage";
import PricingSettingsPage from "./pages/admin/PricingSettingsPage";
import LeadFinderPage from "./pages/admin/leads/LeadFinderPage";
import MyLeadsPage from "./pages/admin/leads/MyLeadsPage";
import LeadCampaignsPage from "./pages/admin/leads/LeadCampaignsPage";
import LeadAuditReportsPage from "./pages/admin/leads/LeadAuditReportsPage";
import LeadsAiAssistantPage from "./pages/admin/leads/LeadsAiAssistantPage";
import LeadSettingsPage from "./pages/admin/leads/LeadSettingsPage";
import CrmPipelinePage from "./pages/admin/crm/CrmPipelinePage";
import CrmActivitiesPage from "./pages/admin/crm/CrmActivitiesPage";
import CrmDashboardPage from "./pages/admin/crm/CrmDashboardPage";
import AdminOnlyRoute from "./components/admin/AdminOnlyRoute";
import GlobalErrorLogger from "./components/GlobalErrorLogger";
import RuntimeErrorsPage from "./pages/admin/RuntimeErrorsPage";
import IntegrationsPage from "./pages/admin/settings/IntegrationsPage";
import HelpdeskTicketsPage from "./pages/admin/helpdesk/HelpdeskTicketsPage";
import HelpdeskTeamsPage from "./pages/admin/helpdesk/HelpdeskTeamsPage";
import HelpdeskSlaPoliciesPage from "./pages/admin/helpdesk/HelpdeskSlaPoliciesPage";
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

const RedirectToProposals = () => {
  const location = useLocation();
  const target = `/admin/sales/proposals${location.search}${location.hash}`;

  return <Navigate to={target} replace state={location.state} />;
};

const CustomerShell = () => (
  <CartProvider>
    <Outlet />
  </CartProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="optilens-theme">
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalErrorLogger />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<CustomerShell />}>
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
              <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/privacy-policy" element={<Navigate to="/legal/privacy-policy" replace />} />
              <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
              <Route path="/terms-of-use" element={<Navigate to="/legal/terms" replace />} />
              <Route path="/lenses" element={<Navigate to="/lenses/lens-types" replace />} />
              <Route path="/lenses/lens-types" element={<LensDesignGuidePage />} />
              <Route path="/lenses/office-occupational" element={<OfficeOccupationalPage />} />
              <Route path="/lenses/anti-fatigue" element={<AntiFatiguePage />} />
              <Route path="/lenses/blue-filter" element={<BlueFilterPage />} />
              <Route path="/lenses/tints-fashion-colors" element={<TintsFashionColorsPage />} />
              <Route path="/lenses/materials" element={<MaterialsPage />} />
              <Route path="/lenses/thickness-chart" element={<ThicknessChartPage />} />
              <Route path="/coatings/mirror" element={<MirrorFinishPage />} />
              <Route path="/coatings/mirrors" element={<Navigate to="/coatings/mirror" replace />} />
              <Route path="/mirror-finish-guide" element={<Navigate to="/coatings/mirror" replace />} />
              <Route path="/coatings/ultraclear-ar" element={<UltraClearARPage />} />
              <Route path="/coatings/blueblock-ar" element={<BlueBlockARPage />} />
              <Route path="/coatings/scratch-resistant" element={<ScratchResistantPage />} />
              <Route path="/coatings/uv-shield" element={<UVShieldPage />} />
              <Route path="/coatings/hydrophobic-oleophobic" element={<HydrophobicOleophobicPage />} />
              <Route path="/coatings/how-ar-coating-works" element={<HowARCoatingWorksPage />} />
              <Route path="/coatings/caring-for-coated-lenses" element={<CaringForCoatedLensesPage />} />
              <Route path="/for-professionals" element={<ProfessionalsPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/return-policy" element={<Navigate to="/legal/return-policy" replace />} />


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
            </Route>

              {/* Admin — all apps share AdminLayout */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<AdminHomeRedirect />} />

                {/* ═══ Pricing App ═══ */}
                <Route path="pricing" element={<Navigate to="/admin/pricing/catalog" replace />} />
                <Route path="pricing/catalog" element={<ProductCatalogPage />} />
                <Route path="pricing/rx-lenses" element={<RxLensPricesPage />} />
                <Route path="pricing/stock-lenses" element={<StockLensPricesPage />} />
                <Route path="pricing/supplies" element={<BuySellPricesPage />} />
                <Route path="pricing/publisher" element={<AdminOnlyRoute><CatalogPublisherPage /></AdminOnlyRoute>} />
                <Route path="pricing/publisher-old" element={<Navigate to="/admin/pricing/publisher" replace />} />
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
                <Route path="sales" element={<Navigate to="/admin/sales/proposals" replace />} />
                <Route path="sales/proposals" element={<CatalogPublisherV2Page />} />
                <Route path="sales/quotations" element={<QuotationsListPage />} />
                <Route path="sales/quotations/:id" element={<QuoteEditorPage />} />
                <Route path="sales/quotations/:id/print-preview" element={<QuotePrintPreviewPage />} />
                <Route path="sales/web-orders" element={<PlaceholderPage />} />
                <Route path="sales/rx-orders" element={<PlaceholderPage />} />

                {/* ═══ Contacts App ═══ */}
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="contacts/config/tags" element={<ContactTagsConfigPage />} />
                <Route path="contacts/config/industries" element={<IndustriesConfigPage />} />

                {/* ═══ Leads App ═══ */}
                <Route path="leads" element={<MyLeadsPage />} />
                <Route path="leads/finder" element={<LeadFinderPage />} />
                <Route path="leads/campaigns" element={<LeadCampaignsPage />} />
                <Route path="leads/reports" element={<LeadAuditReportsPage />} />
                <Route path="leads/ai" element={<LeadsAiAssistantPage />} />
                <Route path="leads/settings" element={<LeadSettingsPage />} />
                <Route path="leads/proposals" element={<RedirectToProposals />} />
                <Route path="leads/catalog-publisher" element={<RedirectToProposals />} />

                {/* ═══ CRM App ═══ */}
                <Route path="crm" element={<Navigate to="/admin/crm/dashboard" replace />} />
                <Route path="crm/dashboard" element={<CrmDashboardPage />} />
                <Route path="crm/pipeline" element={<CrmPipelinePage />} />
                <Route path="crm/activities" element={<CrmActivitiesPage />} />
                <Route path="crm/proposals" element={<RedirectToProposals />} />
                <Route path="crm/catalog-publisher" element={<RedirectToProposals />} />

                {/* ═══ Helpdesk App ═══ */}
                <Route path="helpdesk" element={<Navigate to="/admin/helpdesk/tickets" replace />} />
                <Route path="helpdesk/tickets" element={<HelpdeskTicketsPage />} />
                <Route path="helpdesk/teams" element={<HelpdeskTeamsPage />} />
                <Route path="helpdesk/sla" element={<HelpdeskSlaPoliciesPage />} />

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
                <Route path="settings/integrations" element={<AdminOnlyRoute><IntegrationsPage /></AdminOnlyRoute>} />
                <Route path="settings/runtime-errors" element={<RuntimeErrorsPage />} />

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
                <Route path="catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />} />
                <Route path="catalogpub-old" element={<Navigate to="/admin/pricing/publisher-old" replace />} />
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
                <Route path="erp/crm" element={<Navigate to="/admin/crm/dashboard" replace />} />
                <Route path="erp/helpdesk" element={<Navigate to="/admin/helpdesk/tickets" replace />} />
                <Route path="erp/web-orders" element={<Navigate to="/admin/sales/web-orders" replace />} />
                <Route path="erp/rx-orders" element={<Navigate to="/admin/sales/rx-orders" replace />} />
                <Route path="erp/website" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="history" element={<Navigate to="/admin/pricing/catalog" replace />} />
              </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
