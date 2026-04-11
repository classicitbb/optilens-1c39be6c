import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import AdminOnlyRoute from "@/components/admin/AdminOnlyRoute";

const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminDocsLayout = lazy(() => import("@/components/admin/AdminDocsLayout"));
const AdminHomeRedirect = lazy(() => import("@/components/admin/AdminHomeRedirect"));
const AdminDashboardHomePage = lazy(() => import("@/pages/admin/AdminDashboardHomePage"));
const ReferenceDataPage = lazy(() => import("@/pages/admin/ReferenceDataPage"));
const PlaceholderPage = lazy(() => import("@/pages/admin/PlaceholderPage"));
const AuditLogPage = lazy(() => import("@/pages/admin/AuditLogPage"));
const ProductCatalogPage = lazy(() => import("@/pages/admin/ProductCatalogPage"));
const RxLensPricesPage = lazy(() => import("@/pages/admin/RxLensPricesPage"));
const StockLensPricesPage = lazy(() => import("@/pages/admin/StockLensPricesPage"));
const BuySellPricesPage = lazy(() => import("@/pages/admin/BuySellPricesPage"));
const PricingComparePage = lazy(() => import("@/pages/admin/PricingComparePage"));
const ImportsPage = lazy(() => import("@/pages/admin/ImportsPage"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const CompanySettingsPage = lazy(() => import("@/pages/admin/CompanySettingsPage"));
const RolesPermissionsPage = lazy(() => import("@/pages/admin/RolesPermissionsPage"));
const AdminWikiPage = lazy(() => import("@/pages/admin/AdminWikiPage"));
const ContentManagerPage = lazy(() => import("@/pages/admin/ContentManagerPage"));
const ImportCostingsPage = lazy(() => import("@/pages/admin/costings/ImportCostingsPage"));
const ShipmentDetailPage = lazy(() => import("@/pages/admin/costings/ShipmentDetailPage"));
const CostingsReportsPage = lazy(() => import("@/pages/admin/costings/CostingsReportsPage"));
const QuotationsListPage = lazy(() => import("@/pages/admin/QuotationsListPage"));
const QuoteEditorPage = lazy(() => import("@/pages/admin/QuoteEditorPage"));
const QuotePrintPreviewPage = lazy(() => import("@/pages/admin/QuotePrintPreviewPage"));
const CatalogPublisherPage = lazy(() => import("@/pages/admin/CatalogPublisherPage"));
const CatalogPublisherV2Page = lazy(() => import("@/pages/admin/CatalogPublisherV2Page"));
const CatalogEditorPage = lazy(() => import("@/pages/admin/CatalogEditorPage"));
const CanvasEditorPage = lazy(() => import("@/pages/admin/CanvasEditorPage"));
const ContactsPage = lazy(() => import("@/pages/admin/erp/ContactsPage"));
const ContactTagsConfigPage = lazy(() => import("@/pages/admin/erp/ContactTagsConfigPage"));
const IndustriesConfigPage = lazy(() => import("@/pages/admin/erp/IndustriesConfigPage"));
const PricingSettingsPage = lazy(() => import("@/pages/admin/PricingSettingsPage"));
const LeadFinderPage = lazy(() => import("@/pages/admin/leads/LeadFinderPage"));
const MyLeadsPage = lazy(() => import("@/pages/admin/leads/MyLeadsPage"));
const LeadCampaignsPage = lazy(() => import("@/pages/admin/leads/LeadCampaignsPage"));
const LeadAuditReportsPage = lazy(() => import("@/pages/admin/leads/LeadAuditReportsPage"));
const LeadsAiAssistantPage = lazy(() => import("@/pages/admin/leads/LeadsAiAssistantPage"));
const LeadSettingsPage = lazy(() => import("@/pages/admin/leads/LeadSettingsPage"));
const CrmPipelinePage = lazy(() => import("@/pages/admin/crm/CrmPipelinePage"));
const CrmActivitiesPage = lazy(() => import("@/pages/admin/crm/CrmActivitiesPage"));
const CrmDashboardPage = lazy(() => import("@/pages/admin/crm/CrmDashboardPage"));
const RuntimeErrorsPage = lazy(() => import("@/pages/admin/RuntimeErrorsPage"));
const IntegrationsPage = lazy(() => import("@/pages/admin/settings/IntegrationsPage"));
const ReleasesPage = lazy(() => import("@/pages/admin/settings/ReleasesPage"));
const HelpdeskTicketsPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskTicketsPage"));
const HelpdeskTeamsPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskTeamsPage"));
const HelpdeskSlaPoliciesPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskSlaPoliciesPage"));
const HelpdeskStagesPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskStagesPage"));
const HelpdeskConfigPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskConfigPage"));
const HelpdeskOverviewPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskOverviewPage"));
const HelpdeskTicketDetailPage = lazy(() => import("@/pages/admin/helpdesk/HelpdeskTicketDetailPage"));
const WebsitePortalsPage = lazy(() => import("@/pages/admin/WebsitePortalsPage"));
const WebsiteStorePage = lazy(() => import("@/pages/admin/WebsiteStorePage"));
const WebsiteStoreVariantManagerPage = lazy(() => import("@/pages/admin/WebsiteStoreVariantManagerPage"));

const AdminRoutes = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminHomeRedirect />} />
      <Route path="dashboard" element={<AdminDashboardHomePage />} />
      <Route path="pricing" element={<Navigate to="pricing/catalog" replace />} />
      <Route path="pricing/catalog" element={<ProductCatalogPage />} />
      <Route path="pricing/rx-lenses" element={<RxLensPricesPage />} />
      <Route path="pricing/stock-lenses" element={<StockLensPricesPage />} />
      <Route path="pricing/supplies" element={<BuySellPricesPage />} />
      <Route path="pricing/compare" element={<PricingComparePage />} />
      <Route path="pricing/publisher" element={<AdminOnlyRoute><CatalogPublisherPage /></AdminOnlyRoute>} />
      <Route path="pricing/publisher-old" element={<Navigate to="/admin/pricing/publisher" replace />} />
      <Route path="pricing/publisher/:id" element={<CatalogEditorPage />} />
      <Route path="pricing/publisher/:id/canvas" element={<CanvasEditorPage />} />
      <Route path="pricing/costings" element={<ImportCostingsPage />} />
      <Route path="pricing/costings/new" element={<ShipmentDetailPage />} />
      <Route path="pricing/costings/:id" element={<ShipmentDetailPage />} />
      <Route path="pricing/costings/reports" element={<CostingsReportsPage />} />
      <Route path="pricing/reference" element={<ReferenceDataPage />} />
      <Route path="pricing/imports" element={<ImportsPage />} />
      <Route path="pricing/settings" element={<PricingSettingsPage />} />
      <Route path="pricing/legacy" element={<Navigate to="/admin/pricing/catalog" replace />} />

      <Route path="sales" element={<Navigate to="/admin/sales/quotations" replace />} />
      <Route path="sales/proposals" element={<CatalogPublisherV2Page />} />
      <Route path="sales/quotations" element={<QuotationsListPage />} />
      <Route path="sales/quotations/:id" element={<QuoteEditorPage />} />
      <Route path="sales/quotations/:id/print-preview" element={<QuotePrintPreviewPage />} />
      <Route path="sales/web-orders" element={<PlaceholderPage />} />
      <Route path="sales/rx-orders" element={<PlaceholderPage />} />

      <Route path="contacts" element={<ContactsPage />} />
      <Route path="contacts/config/tags" element={<ContactTagsConfigPage />} />
      <Route path="contacts/config/industries" element={<IndustriesConfigPage />} />

      <Route path="leads" element={<MyLeadsPage />} />
      <Route path="leads/finder" element={<LeadFinderPage />} />
      <Route path="leads/campaigns" element={<LeadCampaignsPage />} />
      <Route path="leads/reports" element={<LeadAuditReportsPage />} />
      <Route path="leads/ai" element={<LeadsAiAssistantPage />} />
      <Route path="leads/settings" element={<LeadSettingsPage />} />
      <Route path="leads/proposals" element={<Navigate to="/admin/sales/proposals" replace />} />
      <Route path="leads/catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />} />

      <Route path="crm" element={<Navigate to="/admin/crm/dashboard" replace />} />
      <Route path="crm/dashboard" element={<CrmDashboardPage />} />
      <Route path="crm/pipeline" element={<CrmPipelinePage />} />
      <Route path="crm/activities" element={<CrmActivitiesPage />} />
      <Route path="crm/proposals" element={<Navigate to="/admin/sales/proposals" replace />} />
      <Route path="crm/catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />} />

      <Route path="helpdesk" element={<Navigate to="/admin/helpdesk/overview" replace />} />
      <Route path="helpdesk/overview" element={<HelpdeskOverviewPage />} />
      <Route path="helpdesk/tickets" element={<HelpdeskTicketsPage />} />
      <Route path="helpdesk/tickets/:id" element={<HelpdeskTicketDetailPage />} />
      <Route path="helpdesk/teams" element={<HelpdeskTeamsPage />} />
      <Route path="helpdesk/sla" element={<HelpdeskSlaPoliciesPage />} />
      <Route path="helpdesk/stages" element={<HelpdeskStagesPage />} />
      <Route path="helpdesk/config" element={<HelpdeskConfigPage />} />

      <Route path="website" element={<Navigate to="/admin/website/content" replace />} />
      <Route path="website/content" element={<ContentManagerPage />} />
      <Route path="website/microsites" element={<Navigate to="/admin/website/content" replace />} />
      <Route path="website/features" element={<PlaceholderPage />} />
      <Route path="website/portals" element={<WebsitePortalsPage />} />
      <Route path="website/store" element={<WebsiteStorePage />} />
      <Route path="website/store/variants/:productType/:productId" element={<WebsiteStoreVariantManagerPage />} />

      <Route path="knowledge" element={<Navigate to="/admin/knowledge/wiki" replace />} />
      <Route path="knowledge/wiki" element={<AdminWikiPage />} />
      <Route path="knowledge/wiki/:articleSlug" element={<AdminWikiPage />} />
  </Routes>
);

export default AdminRoutes;
