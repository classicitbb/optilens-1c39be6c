import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from "react-router-dom";

/** Redirect /admin/moonshot/* → /moonshot/* preserving the subpath */
const LegacyMoonshotRedirect = () => {
  const { pathname } = useLocation();
  const subpath = pathname.replace(/^\/admin\/moonshot\/?/, "");
  return <Navigate to={subpath ? `/moonshot/${subpath}` : "/moonshot"} replace />;
};
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/components/theme-provider";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminOnlyRoute from "./components/admin/AdminOnlyRoute";
import MoonshotProtectedRoute from "./components/MoonshotProtectedRoute";
import GlobalErrorLogger from "./components/GlobalErrorLogger";
import CookieConsentBanner from "./components/CookieConsentBanner";

// Lazy-loaded pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Store = lazy(() => import("./pages/Store"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const Profile = lazy(() => import("./pages/Profile"));
const Orders = lazy(() => import("./pages/Orders"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const LensDesignGuidePage = lazy(() => import("./pages/LensDesignGuidePage"));
const MirrorFinishPage = lazy(() => import("./pages/MirrorFinishPage"));
const UltraClearARPage = lazy(() => import("./pages/coatings/UltraClearARPage"));
const BlueBlockARPage = lazy(() => import("./pages/coatings/BlueBlockARPage"));
const ScratchResistantPage = lazy(() => import("./pages/coatings/ScratchResistantPage"));
const UVShieldPage = lazy(() => import("./pages/coatings/UVShieldPage"));
const HydrophobicOleophobicPage = lazy(() => import("./pages/coatings/HydrophobicOleophobicPage"));
const ProfessionalsPage = lazy(() => import("./pages/ProfessionalsPage"));
const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const ProfessionalsPortalPage = lazy(() => import("./pages/ProfessionalsPortalPage"));
const ProfessionalsChemistriePage = lazy(() => import("./pages/ProfessionalsChemistriePage"));
const DispensingTipsPage = lazy(() => import("./pages/professionals/DispensingTipsPage"));
const TracingCuttingGuidePage = lazy(() => import("./pages/professionals/TracingCuttingGuidePage"));
const LabProcessOverviewPage = lazy(() => import("./pages/professionals/LabProcessOverviewPage"));
const LensOrderingTipsPage = lazy(() => import("./pages/professionals/LensOrderingTipsPage"));
const ProgressivePage = lazy(() => import("./pages/lenses/ProgressivePage"));
const OfficeOccupationalPage = lazy(() => import("./pages/lenses/OfficeOccupationalPage"));
const AntiFatiguePage = lazy(() => import("./pages/lenses/AntiFatiguePage"));
const SingleVisionPage = lazy(() => import("./pages/lenses/SingleVisionPage"));
const BlueFilterPage = lazy(() => import("./pages/lenses/BlueFilterPage"));
const TintsFashionColorsPage = lazy(() => import("./pages/lenses/TintsFashionColorsPage"));
const MaterialsPage = lazy(() => import("./pages/lenses/MaterialsPage"));
const ThicknessChartPage = lazy(() => import("./pages/lenses/ThicknessChartPage"));

// Admin pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminHomeRedirect = lazy(() => import("./components/admin/AdminHomeRedirect"));
const ReferenceDataPage = lazy(() => import("./pages/admin/ReferenceDataPage"));
const PlaceholderPage = lazy(() => import("./pages/admin/PlaceholderPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const ProductCatalogPage = lazy(() => import("./pages/admin/ProductCatalogPage"));

const RxLensPricesPage = lazy(() => import("./pages/admin/RxLensPricesPage"));
const StockLensPricesPage = lazy(() => import("./pages/admin/StockLensPricesPage"));
const BuySellPricesPage = lazy(() => import("./pages/admin/BuySellPricesPage"));
const ImportsPage = lazy(() => import("./pages/admin/ImportsPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const CompanySettingsPage = lazy(() => import("./pages/admin/CompanySettingsPage"));
const RolesPermissionsPage = lazy(() => import("./pages/admin/RolesPermissionsPage"));
const AdminWikiPage = lazy(() => import("./pages/admin/AdminWikiPage"));
const ContentManagerPage = lazy(() => import("./pages/admin/ContentManagerPage"));
const ImportCostingsPage = lazy(() => import("./pages/admin/costings/ImportCostingsPage"));
const ShipmentDetailPage = lazy(() => import("./pages/admin/costings/ShipmentDetailPage"));
const CostingsReportsPage = lazy(() => import("./pages/admin/costings/CostingsReportsPage"));
const QuotationsListPage = lazy(() => import("./pages/admin/QuotationsListPage"));
const QuoteEditorPage = lazy(() => import("./pages/admin/QuoteEditorPage"));
const QuotePrintPreviewPage = lazy(() => import("./pages/admin/QuotePrintPreviewPage"));
const CatalogPublisherPage = lazy(() => import("./pages/admin/CatalogPublisherPage"));
const CatalogPublisherV2Page = lazy(() => import("./pages/admin/CatalogPublisherV2Page"));
const CatalogEditorPage = lazy(() => import("./pages/admin/CatalogEditorPage"));
const ContactsPage = lazy(() => import("./pages/admin/erp/ContactsPage"));
const ContactTagsConfigPage = lazy(() => import("./pages/admin/erp/ContactTagsConfigPage"));
const IndustriesConfigPage = lazy(() => import("./pages/admin/erp/IndustriesConfigPage"));
const PricingSettingsPage = lazy(() => import("./pages/admin/PricingSettingsPage"));
const LeadFinderPage = lazy(() => import("./pages/admin/leads/LeadFinderPage"));
const MyLeadsPage = lazy(() => import("./pages/admin/leads/MyLeadsPage"));
const LeadCampaignsPage = lazy(() => import("./pages/admin/leads/LeadCampaignsPage"));
const LeadAuditReportsPage = lazy(() => import("./pages/admin/leads/LeadAuditReportsPage"));
const LeadsAiAssistantPage = lazy(() => import("./pages/admin/leads/LeadsAiAssistantPage"));
const LeadSettingsPage = lazy(() => import("./pages/admin/leads/LeadSettingsPage"));
const CrmPipelinePage = lazy(() => import("./pages/admin/crm/CrmPipelinePage"));
const CrmActivitiesPage = lazy(() => import("./pages/admin/crm/CrmActivitiesPage"));
const CrmDashboardPage = lazy(() => import("./pages/admin/crm/CrmDashboardPage"));
const RuntimeErrorsPage = lazy(() => import("./pages/admin/RuntimeErrorsPage"));
const IntegrationsPage = lazy(() => import("./pages/admin/settings/IntegrationsPage"));
const HelpdeskTicketsPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskTicketsPage"));
const HelpdeskTeamsPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskTeamsPage"));
const HelpdeskSlaPoliciesPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskSlaPoliciesPage"));
const HelpdeskStagesPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskStagesPage"));
const HelpdeskConfigPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskConfigPage"));
const HelpdeskOverviewPage = lazy(() => import("./pages/admin/helpdesk/HelpdeskOverviewPage"));

// Moonshot
const MoonshotLayout = lazy(() => import("./features/admin/moonshot/MoonshotLayout"));
const MoonshotDashboardPage = lazy(() => import("./pages/admin/moonshot/MoonshotDashboardPage"));
const MoonshotWorkspacePage = lazy(() => import("./pages/admin/moonshot/MoonshotWorkspacePage"));
const MoonshotMeetingsPage = lazy(() => import("./pages/admin/moonshot/MoonshotMeetingsPage"));
const MoonshotNewMeetingPage = lazy(() => import("./pages/admin/moonshot/MoonshotNewMeetingPage"));
const MoonshotMeetingDetailPage = lazy(() => import("./pages/admin/moonshot/MoonshotMeetingDetailPage"));
const MoonshotScorecardsPage = lazy(() => import("./pages/admin/moonshot/MoonshotScorecardsPage"));
const MoonshotRocksPage = lazy(() => import("./pages/admin/moonshot/MoonshotRocksPage"));
const MoonshotTodosPage = lazy(() => import("./pages/admin/moonshot/MoonshotTodosPage"));
const MoonshotIssuesPage = lazy(() => import("./pages/admin/moonshot/MoonshotIssuesPage"));
const MoonshotBusinessPlanPage = lazy(() => import("./pages/admin/moonshot/MoonshotBusinessPlanPage"));
const MoonshotToolsPage = lazy(() => import("./pages/admin/moonshot/MoonshotToolsPage"));
const MoonshotUsersPage = lazy(() => import("./pages/admin/moonshot/MoonshotUsersPage"));
const MoonshotPlaceholderPage = lazy(() => import("./pages/admin/moonshot/MoonshotPlaceholderPage"));
const MoonshotResourcesPage = lazy(() => import("./pages/admin/moonshot/MoonshotResourcesPage"));
const MoonshotSettingsPage = lazy(() => import("./pages/admin/moonshot/MoonshotSettingsPage"));
const MoonshotOrgChartPage = lazy(() => import("./pages/admin/moonshot/MoonshotOrgChartPage"));
const MoonshotOneOnOnesPage = lazy(() => import("./pages/admin/moonshot/MoonshotOneOnOnesPage"));
const MoonshotRightPersonRightSeatPage = lazy(() => import("./pages/admin/moonshot/MoonshotRightPersonRightSeatPage"));
const MoonshotLoginPage = lazy(() => import("./pages/moonshot/MoonshotLoginPage"));

// ZenVue
const ZenvueHome = lazy(() => import("./pages/zenvue/ZenvueHome"));
const ZenvueBrilliance = lazy(() => import("./pages/zenvue/ZenvueBrilliance"));
const ZenvueSingleVision = lazy(() => import("./pages/zenvue/ZenvueSingleVision"));
const ZenvueSunDun = lazy(() => import("./pages/zenvue/ZenvueSunDun"));
const ZenvueDarkun = lazy(() => import("./pages/zenvue/ZenvueDarkun"));
const ZenvueCompare = lazy(() => import("./pages/zenvue/ZenvueCompare"));
const ZenvueWholesale = lazy(() => import("./pages/zenvue/ZenvueWholesale"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="optilens-theme">
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalErrorLogger />
      <BrowserRouter>
        <CookieConsentBanner />
        <AuthProvider>
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
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
              <Route path="/cookie-policy" element={<Navigate to="/legal/cookie-policy" replace />} />
              <Route path="/disclaimer" element={<Navigate to="/legal/disclaimer" replace />} />
              <Route path="/accessibility" element={<Navigate to="/legal/accessibility" replace />} />
              <Route path="/lenses" element={<Navigate to="/lenses/lens-types" replace />} />
              <Route path="/lenses/lens-types" element={<LensDesignGuidePage />} />
              <Route path="/lenses/progressive" element={<ProgressivePage />} />
              <Route path="/lenses/office-occupational" element={<OfficeOccupationalPage />} />
              <Route path="/lenses/anti-fatigue" element={<AntiFatiguePage />} />
              <Route path="/lenses/single-vision" element={<SingleVisionPage />} />
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
              <Route path="/coatings/how-ar-coating-works" element={<Navigate to="/knowledge#how-ar-coating-works" replace />} />
              <Route path="/coatings/caring-for-coated-lenses" element={<Navigate to="/knowledge#caring-for-coated-lenses" replace />} />
              <Route path="/for-professionals" element={<ProfessionalsPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/professionals/chemistrie-lens-system" element={<ProfessionalsChemistriePage />} />
              <Route path="/professionals/dispensing-tips" element={<DispensingTipsPage />} />
              <Route path="/professionals/tracing-cutting-guide" element={<TracingCuttingGuidePage />} />
              <Route path="/professionals/lab-process-overview" element={<LabProcessOverviewPage />} />
              <Route path="/professionals/lens-ordering-tips" element={<LensOrderingTipsPage />} />
              <Route path="/professionals/:slug" element={<ProfessionalsPortalPage />} />
              {/* duplicate /patients removed — line 198 handles it */}
              <Route path="/return-policy" element={<LegalPage />} />

              {/* ZenVue integrated feature pages */}
              <Route path="/zenvue" element={<ProtectedRoute><ZenvueHome /></ProtectedRoute>} />
              <Route path="/zenvue/brilliance" element={<ProtectedRoute><ZenvueBrilliance /></ProtectedRoute>} />
              <Route path="/zenvue/single-vision" element={<ProtectedRoute><ZenvueSingleVision /></ProtectedRoute>} />
              <Route path="/zenvue/sundun" element={<ProtectedRoute><ZenvueSunDun /></ProtectedRoute>} />
              <Route path="/zenvue/darkun" element={<ProtectedRoute><ZenvueDarkun /></ProtectedRoute>} />
              <Route path="/zenvue/compare" element={<ProtectedRoute><ZenvueCompare /></ProtectedRoute>} />
              <Route path="/zenvue/wholesale" element={<ProtectedRoute><ZenvueWholesale /></ProtectedRoute>} />
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
                {/* Legacy pricing redirect */}
                <Route path="pricing/legacy" element={<Navigate to="/admin/pricing/catalog" replace />} />

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
                <Route path="leads/proposals" element={<Navigate to="/admin/sales/proposals" replace />} />
                <Route path="leads/catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />} />

                {/* ═══ CRM App ═══ */}
                <Route path="crm" element={<Navigate to="/admin/crm/dashboard" replace />} />
                <Route path="crm/dashboard" element={<CrmDashboardPage />} />
                <Route path="crm/pipeline" element={<CrmPipelinePage />} />
                <Route path="crm/activities" element={<CrmActivitiesPage />} />
                <Route path="crm/proposals" element={<Navigate to="/admin/sales/proposals" replace />} />
                <Route path="crm/catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />} />

                {/* ═══ Helpdesk App ═══ */}
                <Route path="helpdesk" element={<Navigate to="/admin/helpdesk/overview" replace />} />
                <Route path="helpdesk/overview" element={<HelpdeskOverviewPage />} />
                <Route path="helpdesk/tickets" element={<HelpdeskTicketsPage />} />
                <Route path="helpdesk/teams" element={<HelpdeskTeamsPage />} />
                <Route path="helpdesk/sla" element={<HelpdeskSlaPoliciesPage />} />
                <Route path="helpdesk/stages" element={<HelpdeskStagesPage />} />
                <Route path="helpdesk/config" element={<HelpdeskConfigPage />} />

                {/* ═══ Website App ═══ */}
                <Route path="website" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="website/content" element={<ContentManagerPage />} />
                <Route path="website/microsites" element={<Navigate to="/admin/website/content" replace />} />
                <Route path="website/features" element={<PlaceholderPage />} />
                <Route path="website/portals" element={<PlaceholderPage />} />
                <Route path="website/store" element={<PlaceholderPage />} />

                {/* ═══ Knowledge App ═══ */}
                <Route path="knowledge" element={<Navigate to="/admin/knowledge/wiki" replace />} />
                <Route path="knowledge/wiki" element={<AdminWikiPage />} />
                

                {/* ═══ Settings App ═══ */}
                <Route path="settings" element={<Navigate to="/admin/settings/company" replace />} />
                <Route path="settings/company" element={<CompanySettingsPage />} />
                <Route path="settings/users" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
                <Route path="settings/roles" element={<AdminOnlyRoute><RolesPermissionsPage /></AdminOnlyRoute>} />
                <Route path="settings/audit" element={<AdminOnlyRoute><AuditLogPage /></AdminOnlyRoute>} />
                <Route path="settings/integrations" element={<AdminOnlyRoute><IntegrationsPage /></AdminOnlyRoute>} />
                <Route path="settings/runtime-errors" element={<AdminOnlyRoute><RuntimeErrorsPage /></AdminOnlyRoute>} />

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
                <Route path="catalogpub-old" element={<Navigate to="/admin/pricing/publisher" replace />} />
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

              {/* ═══ Moonshot App (standalone layout) ═══ */}
              <Route path="/moonshot/login" element={<MoonshotLoginPage />} />
              <Route path="/moonshot" element={<MoonshotProtectedRoute><MoonshotLayout /></MoonshotProtectedRoute>}>
                <Route index element={<Navigate to="/moonshot/dashboard" replace />} />
                <Route path="dashboard" element={<MoonshotDashboardPage />} />
                <Route path="workspace" element={<MoonshotWorkspacePage />} />
                <Route path="meetings" element={<MoonshotMeetingsPage />} />
                <Route path="meetings/new" element={<MoonshotNewMeetingPage />} />
                <Route path="meetings/:meetingId" element={<MoonshotMeetingDetailPage />} />
                <Route path="scorecards" element={<MoonshotScorecardsPage />} />
                <Route path="rocks" element={<MoonshotRocksPage />} />
                <Route path="todos" element={<MoonshotTodosPage />} />
                <Route path="issues" element={<MoonshotIssuesPage />} />
                <Route path="business-plan" element={<MoonshotBusinessPlanPage />} />
                <Route path="tools" element={<MoonshotToolsPage />} />
                <Route path="tools/org-chart" element={<MoonshotOrgChartPage />} />
                <Route path="tools/one-on-ones" element={<MoonshotOneOnOnesPage />} />
                <Route path="tools/right-person-right-seat" element={<MoonshotRightPersonRightSeatPage />} />
                <Route path="users" element={<MoonshotUsersPage />} />
                <Route path="resources" element={<MoonshotResourcesPage />} />
                <Route path="settings" element={<MoonshotSettingsPage />} />
                <Route path="feedback" element={<MoonshotPlaceholderPage title="Thanks! Feedback form coming soon" />} />
              </Route>
              <Route path="/admin/moonshot/*" element={<Navigate to="/moonshot" replace />} />

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
