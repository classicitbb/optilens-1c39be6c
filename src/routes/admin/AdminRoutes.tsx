import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import AdminOnlyRoute from "@/components/admin/AdminOnlyRoute";

const AdminLayout = lazyWithRetry(() => import("@/components/admin/AdminLayout"));

const AdminHomeRedirect = lazyWithRetry(() => import("@/components/admin/AdminHomeRedirect"),
);
const AdminDashboardHomePage = lazyWithRetry(() => import("@/pages/admin/AdminDashboardHomePage"),
);

const ReferenceDataPage = lazyWithRetry(() => import("@/pages/admin/ReferenceDataPage"));
const AuditLogPage = lazyWithRetry(() => import("@/pages/admin/AuditLogPage"));
const ProductCatalogPage = lazyWithRetry(() => import("@/pages/admin/ProductCatalogPage"),
);
const RxLensPricesPage = lazyWithRetry(() => import("@/pages/admin/RxLensPricesPage"));
const StockLensPricesPage = lazyWithRetry(() => import("@/pages/admin/StockLensPricesPage"),
);
const BuySellPricesPage = lazyWithRetry(() => import("@/pages/admin/BuySellPricesPage"));
const PricingComparePage = lazyWithRetry(() => import("@/pages/admin/PricingComparePage"),
);
const LensClassificationPage = lazyWithRetry(() => import("@/pages/admin/LensClassificationPage"),
);
const ImportsPage = lazyWithRetry(() => import("@/pages/admin/ImportsPage"));
const UsersPage = lazyWithRetry(() => import("@/pages/admin/UsersPage"));
const CompanySettingsPage = lazyWithRetry(() => import("@/pages/admin/CompanySettingsPage"),
);
const RolesPermissionsPage = lazyWithRetry(() => import("@/pages/admin/RolesPermissionsPage"),
);
const AdminWikiPage = lazyWithRetry(() => import("@/pages/admin/AdminWikiPage"));
const ContentManagerPage = lazyWithRetry(() => import("@/pages/admin/ContentManagerPage"),
);
const ImportCostingsPage = lazyWithRetry(() => import("@/pages/admin/costings/ImportCostingsPage"),
);
const ShipmentDetailPage = lazyWithRetry(() => import("@/pages/admin/costings/ShipmentDetailPage"),
);
const CostingsReportsPage = lazyWithRetry(() => import("@/pages/admin/costings/CostingsReportsPage"),
);
const QuotationsListPage = lazyWithRetry(() => import("@/pages/admin/QuotationsListPage"),
);
const RxOrderFormPage = lazyWithRetry(() => import("@/pages/admin/RxOrderFormPage"));
const StockOrderBuilderPage = lazyWithRetry(() => import("@/pages/admin/StockOrderBuilderPage"),
);
const RxSubmissionsPage = lazyWithRetry(() => import("@/pages/admin/RxSubmissionsPage"));
const AliasMappingPage = lazyWithRetry(() => import("@/pages/admin/AliasMappingPage"));
const QuoteEditorPage = lazyWithRetry(() => import("@/pages/admin/QuoteEditorPage"));
const QuotePrintPreviewPage = lazyWithRetry(() => import("@/pages/admin/QuotePrintPreviewPage"),
);
const CatalogPublisherPage = lazyWithRetry(() => import("@/pages/admin/CatalogPublisherPage"),
);
const CatalogPublisherV2Page = lazyWithRetry(() => import("@/pages/admin/CatalogPublisherV2Page"),
);
const CatalogEditorPage = lazyWithRetry(() => import("@/pages/admin/CatalogEditorPage"));
const ContactsPage = lazyWithRetry(() => import("@/pages/admin/erp/ContactsPage"));
const ContactTagsConfigPage = lazyWithRetry(() => import("@/pages/admin/erp/ContactTagsConfigPage"),
);
const IndustriesConfigPage = lazyWithRetry(() => import("@/pages/admin/erp/IndustriesConfigPage"),
);
const PricingSettingsPage = lazyWithRetry(() => import("@/pages/admin/PricingSettingsPage"),
);
const LeadFinderPage = lazyWithRetry(() => import("@/pages/admin/leads/LeadFinderPage"));
const MyLeadsPage = lazyWithRetry(() => import("@/pages/admin/leads/MyLeadsPage"));
const LeadCampaignsPage = lazyWithRetry(() => import("@/pages/admin/leads/LeadCampaignsPage"),
);
const LeadAuditReportsPage = lazyWithRetry(() => import("@/pages/admin/leads/LeadAuditReportsPage"),
);
const LeadsAiAssistantPage = lazyWithRetry(() => import("@/pages/admin/leads/LeadsAiAssistantPage"),
);
const LeadSettingsPage = lazyWithRetry(() => import("@/pages/admin/leads/LeadSettingsPage"),
);
const CrmPipelinePage = lazyWithRetry(() => import("@/pages/admin/crm/CrmPipelinePage"));
const CrmActivitiesPage = lazyWithRetry(() => import("@/pages/admin/crm/CrmActivitiesPage"),
);
const CrmOutboxPage = lazyWithRetry(() => import("@/pages/admin/crm/CrmOutboxPage"));
const CrmDashboardPage = lazyWithRetry(() => import("@/pages/admin/crm/CrmDashboardPage"),
);
const RuntimeErrorsPage = lazyWithRetry(() => import("@/pages/admin/RuntimeErrorsPage"));
const IntegrationsPage = lazyWithRetry(() => import("@/pages/admin/settings/IntegrationsPage"),
);
const ApiKeysPage = lazyWithRetry(() => import("@/pages/admin/settings/ApiKeysPage"));
const BankPaymentPortalsPage = lazyWithRetry(() => import("@/pages/admin/settings/BankPaymentPortalsPage"),
);
const PaymentActivityPage = lazyWithRetry(() => import("@/pages/admin/settings/PaymentActivityPage"));
const WalkInPaymentsPage = lazyWithRetry(() => import("@/pages/admin/WalkInPaymentsPage"));
const ReleasesPage = lazyWithRetry(() => import("@/pages/admin/settings/ReleasesPage"));
const EmailPreviewsPage = lazyWithRetry(() => import("@/pages/admin/settings/EmailPreviewsPage"),
);
const EdgeFunctionStatusPage = lazyWithRetry(() => import("@/pages/admin/settings/EdgeFunctionStatusPage"),
);
const HelpdeskTicketsPage = lazyWithRetry(() => import("@/pages/admin/helpdesk/HelpdeskTicketsPage"),
);
const HelpdeskConfigPage = lazyWithRetry(() => import("@/pages/admin/helpdesk/HelpdeskConfigPage"),
);
const HelpdeskOverviewPage = lazyWithRetry(() => import("@/pages/admin/helpdesk/HelpdeskOverviewPage"),
);
const HelpdeskTicketDetailPage = lazyWithRetry(() => import("@/pages/admin/helpdesk/HelpdeskTicketDetailPage"),
);
const WebsitePortalsPage = lazyWithRetry(() => import("@/pages/admin/WebsitePortalsPage"),
);
const NpsDashboardPage = lazyWithRetry(() => import("@/pages/admin/NpsDashboardPage"));
const DocStudioPage = lazyWithRetry(() => import("@/pages/admin/website/DocStudioPage"));
const FeatureBoardPage = lazyWithRetry(() => import("@/pages/admin/website/FeatureBoardPage"),
);
const WebsiteStorePage = lazyWithRetry(() => import("@/pages/admin/WebsiteStorePage"));
const WebsiteStoreVariantManagerPage = lazyWithRetry(() => import("@/pages/admin/WebsiteStoreVariantManagerPage"),
);
const OrdersPage = lazyWithRetry(() => import("@/pages/admin/OrdersPage"));
const ProductHubPage = lazyWithRetry(() => import("@/pages/admin/ProductHubPage"));
const AssistantQualityPage = lazyWithRetry(() => import("@/pages/admin/assistant/AssistantQualityPage"),
);

const AdminRoutes = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminHomeRedirect />} />
      <Route path="dashboard" element={<AdminDashboardHomePage />} />
      <Route path="copilot" element={<Navigate to="/copilot" replace />} />
      <Route
        path="pricing"
        element={<Navigate to="pricing/catalog" replace />}
      />
      <Route path="pricing/catalog" element={<ProductCatalogPage />} />
      <Route path="pricing/rx-lenses" element={<RxLensPricesPage />} />
      <Route path="pricing/stock-lenses" element={<StockLensPricesPage />} />
      <Route path="pricing/supplies" element={<BuySellPricesPage />} />
      <Route path="pricing/compare" element={<PricingComparePage />} />
      <Route
        path="pricing/classification"
        element={<LensClassificationPage />}
      />
      <Route
        path="pricing/publisher"
        element={
          <AdminOnlyRoute>
            <CatalogPublisherPage />
          </AdminOnlyRoute>
        }
      />
      <Route path="pricing/publisher/:id" element={<CatalogEditorPage />} />
      <Route path="pricing/costings" element={<ImportCostingsPage />} />
      <Route path="pricing/costings/new" element={<ShipmentDetailPage />} />
      <Route path="pricing/costings/:id" element={<ShipmentDetailPage />} />
      <Route
        path="pricing/costings/reports"
        element={<CostingsReportsPage />}
      />
      <Route path="pricing/reference" element={<ReferenceDataPage />} />
      <Route path="pricing/alias-mapping" element={<AliasMappingPage />} />
      <Route path="pricing/imports" element={<ImportsPage />} />
      <Route path="pricing/settings" element={<PricingSettingsPage />} />
      <Route path="contacts" element={<ContactsPage />} />
      <Route path="contacts/config/tags" element={<ContactTagsConfigPage />} />
      <Route
        path="contacts/config/industries"
        element={<IndustriesConfigPage />}
      />

      <Route path="leads" element={<MyLeadsPage />} />
      <Route path="leads/finder" element={<LeadFinderPage />} />
      <Route path="leads/campaigns" element={<LeadCampaignsPage />} />
      <Route path="leads/reports" element={<LeadAuditReportsPage />} />
      <Route path="leads/ai" element={<LeadsAiAssistantPage />} />
      <Route path="leads/settings" element={<LeadSettingsPage />} />

      <Route
        path="crm"
        element={<Navigate to="/admin/crm/dashboard" replace />}
      />
      <Route path="crm/dashboard" element={<CrmDashboardPage />} />
      <Route path="crm/pipeline" element={<CrmPipelinePage />} />
      <Route path="crm/proposals" element={<CatalogPublisherV2Page />} />
      <Route path="crm/outbox" element={<CrmOutboxPage />} />
      <Route path="crm/activities" element={<CrmActivitiesPage />} />
      <Route
        path="helpdesk"
        element={<Navigate to="/admin/helpdesk/overview" replace />}
      />
      <Route path="helpdesk/overview" element={<HelpdeskOverviewPage />} />
      <Route path="helpdesk/tickets" element={<HelpdeskTicketsPage />} />
      <Route
        path="helpdesk/tickets/:id"
        element={<HelpdeskTicketDetailPage />}
      />
      <Route
        path="helpdesk/teams"
        element={<Navigate to="/admin/helpdesk/config?section=teams" replace />}
      />
      <Route
        path="helpdesk/stages"
        element={
          <Navigate to="/admin/helpdesk/config?section=stages" replace />
        }
      />
      <Route path="helpdesk/config" element={<HelpdeskConfigPage />} />
      <Route
        path="website/assistant/quality"
        element={<AssistantQualityPage />}
      />

      <Route
        path="website"
        element={<Navigate to="/admin/website/portals" replace />}
      />
      <Route path="website/content" element={<ContentManagerPage />} />
      <Route
        path="website/microsites"
        element={<Navigate to="/admin/website/content" replace />}
      />
      <Route path="website/portals" element={<WebsitePortalsPage />} />
      <Route path="website/nps" element={<NpsDashboardPage />} />
      <Route
        path="website/documents"
        element={<Navigate to="/admin/docs/studio" replace />}
      />
      <Route path="website/features" element={<FeatureBoardPage />} />
      <Route path="website/quotations" element={<QuotationsListPage />} />
      <Route path="website/stock-orders" element={<StockOrderBuilderPage />} />
      <Route path="website/quotations/new-rx" element={<RxOrderFormPage />} />
      <Route path="website/quotations/rx/:id" element={<RxOrderFormPage />} />
      <Route path="website/quotations/:id" element={<QuoteEditorPage />} />
      <Route
        path="website/quotations/:id/print-preview"
        element={<QuotePrintPreviewPage />}
      />
      <Route path="website/rx-submissions" element={<RxSubmissionsPage />} />
      <Route path="website/orders" element={<OrdersPage />} />
      <Route
        path="docs"
        element={<Navigate to="/admin/docs/studio" replace />}
      />
      <Route path="docs/studio" element={<DocStudioPage />} />
      <Route
        path="docs/studio-native"
        element={<Navigate to="/admin/docs/studio" replace />}
      />
      <Route
        path="docs/studio-legacy"
        element={<Navigate to="/ds/studio.html?embedded=1" replace />}
      />
      <Route path="website/store" element={<WebsiteStorePage />} />
      <Route
        path="website/store/variants/:productType/:productId"
        element={<WebsiteStoreVariantManagerPage />}
      />
      <Route
        path="products/:productType/:productId"
        element={<ProductHubPage />}
      />

      <Route
        path="knowledge"
        element={<Navigate to="/admin/knowledge/wiki" replace />}
      />
      <Route path="knowledge/wiki" element={<AdminWikiPage />} />
      <Route path="knowledge/wiki/:articleSlug" element={<AdminWikiPage />} />

      <Route
        path="settings"
        element={<Navigate to="/admin/settings/company" replace />}
      />
      <Route path="settings/company" element={<CompanySettingsPage />} />
      <Route path="settings/users" element={<UsersPage />} />
      <Route path="settings/roles" element={<RolesPermissionsPage />} />
      <Route path="settings/audit" element={<AuditLogPage />} />
      <Route
        path="settings/integrations"
        element={
          <AdminOnlyRoute>
            <IntegrationsPage />
          </AdminOnlyRoute>
        }
      />
      <Route
        path="settings/api-keys"
        element={
          <AdminOnlyRoute>
            <ApiKeysPage />
          </AdminOnlyRoute>
        }
      />
      <Route
        path="settings/bank-payment-portals"
        element={
          <AdminOnlyRoute>
            <BankPaymentPortalsPage />
          </AdminOnlyRoute>
        }
      />
      <Route
        path="settings/payment-activity"
        element={
          <AdminOnlyRoute>
            <PaymentActivityPage />
          </AdminOnlyRoute>
        }
      />
      <Route path="settings/walk-in-payments" element={<WalkInPaymentsPage />} />
      <Route path="settings/runtime-errors" element={<RuntimeErrorsPage />} />
      <Route path="settings/releases" element={<ReleasesPage />} />
      <Route path="settings/email-previews" element={<EmailPreviewsPage />} />
      <Route
        path="settings/edge-functions"
        element={<EdgeFunctionStatusPage />}
      />

      <Route
        path="catalog"
        element={<Navigate to="/admin/pricing/catalog" replace />}
      />
      <Route
        path="reference"
        element={<Navigate to="/admin/pricing/reference" replace />}
      />
      <Route
        path="lenses"
        element={<Navigate to="/admin/pricing/catalog" replace />}
      />
      <Route
        path="supplies"
        element={<Navigate to="/admin/pricing/catalog" replace />}
      />
      <Route
        path="addons"
        element={<Navigate to="/admin/pricing/catalog" replace />}
      />
      <Route
        path="rx-lens-prices"
        element={<Navigate to="/admin/pricing/rx-lenses" replace />}
      />
      <Route
        path="stock-lens-prices"
        element={<Navigate to="/admin/pricing/stock-lenses" replace />}
      />
      <Route
        path="supplies-prices"
        element={<Navigate to="/admin/pricing/supplies" replace />}
      />
      <Route
        path="imports"
        element={<Navigate to="/admin/pricing/imports" replace />}
      />
      <Route
        path="catalog-publisher"
        element={<Navigate to="/admin/crm/proposals" replace />}
      />
      <Route
        path="catalogpub-old"
        element={<Navigate to="/admin/pricing/publisher" replace />}
      />
      <Route
        path="catalog-publisher/:id"
        element={<Navigate to="/admin/pricing/publisher" replace />}
      />
      <Route
        path="quotations"
        element={<Navigate to="/admin/website/quotations" replace />}
      />
      <Route
        path="costings/shipments"
        element={<Navigate to="/admin/pricing/costings" replace />}
      />
      <Route
        path="costings/reports"
        element={<Navigate to="/admin/pricing/costings/reports" replace />}
      />
      <Route
        path="parameters"
        element={<Navigate to="/admin/settings/company" replace />}
      />
      <Route
        path="users"
        element={<Navigate to="/admin/settings/users" replace />}
      />
      <Route
        path="audit"
        element={<Navigate to="/admin/settings/audit" replace />}
      />
      <Route
        path="wiki"
        element={<Navigate to="/admin/knowledge/wiki" replace />}
      />
      <Route
        path="content"
        element={<Navigate to="/admin/website/content" replace />}
      />
      <Route
        path="erp/contacts"
        element={<Navigate to="/admin/contacts" replace />}
      />
      <Route
        path="erp/config/contact-tags"
        element={<Navigate to="/admin/contacts/config/tags" replace />}
      />
      <Route
        path="erp/config/industries"
        element={<Navigate to="/admin/contacts/config/industries" replace />}
      />
      <Route
        path="erp/crm"
        element={<Navigate to="/admin/crm/dashboard" replace />}
      />
      <Route
        path="erp/helpdesk"
        element={<Navigate to="/admin/helpdesk/tickets" replace />}
      />
      <Route
        path="erp/website"
        element={<Navigate to="/admin/website/content" replace />}
      />
      <Route
        path="history"
        element={<Navigate to="/admin/pricing/catalog" replace />}
      />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
