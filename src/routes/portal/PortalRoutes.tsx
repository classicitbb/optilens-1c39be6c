import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountLayout from "@/components/account/AccountLayout";
import PortalFeatureGate from "@/components/account/PortalFeatureGate";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useUserRole } from "@/hooks/useUserRole";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";

const Profile = lazy(() => import("@/pages/Profile"));
const MyAccountSection = lazy(() => import("@/components/account/sections/MyAccountSection"));
const MyOrdersSection = lazy(() => import("@/components/account/sections/MyOrdersSection"));
const AddressBookSection = lazy(() => import("@/components/account/sections/AddressBookSection"));
const PaymentMethodsSection = lazy(() => import("@/components/account/sections/PaymentMethodsSection"));
const QuoteFormSection = lazy(() => import("@/components/account/sections/QuoteFormSection"));
const HelpdeskTicketsSection = lazy(() => import("@/components/account/sections/HelpdeskTicketsSection"));
const HelpdeskTicketDetailSection = lazy(() => import("@/components/account/sections/HelpdeskTicketDetailSection"));
const AssistantConversationsSection = lazy(() => import("@/components/account/sections/AssistantConversationsSection"));
const AssignedPricelistsSection = lazy(() => import("@/components/account/sections/AssignedPricelistsSection"));
const CartDraftsSection = lazy(() => import("@/components/account/sections/CartDraftsSection"));
const StatementsSection = lazy(() => import("@/components/account/sections/StatementsSection"));
const RxDraftSection = lazy(() => import("@/components/account/sections/RxDraftSection"));
const LensAssistantSection = lazy(() => import("@/components/account/sections/LensAssistantSection"));
const NetworkingCardPage = lazy(() => import("@/pages/NetworkingCardPage"));
const HandbookSection = lazy(() => import("@/components/account/sections/HandbookSection"));

const LensAssistantProfileRouteGate = () => {
  const { isLoading: identityLoading } = usePortalIdentity();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const publicLensAssistant = useWebsiteFeature("lens_assistant_public", false);
  const adminLensAssistant = useWebsiteFeature("lens_assistant_admin", true);

  if (identityLoading || roleLoading || publicLensAssistant.isLoading || adminLensAssistant.isLoading) {
    return <div className="flex min-h-[240px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const rolloutEnabled = isAdmin ? adminLensAssistant.enabled : publicLensAssistant.enabled;
  if (!rolloutEnabled) return <Navigate to="/profile" replace />;

  return (
    <PortalFeatureGate feature="lens-assistant">
      <LensAssistantSection />
    </PortalFeatureGate>
  );
};

const PortalRoutes = () => {
  return (
    <Routes>
      <Route
        element={(
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Profile />} />
        <Route path="account" element={<MyAccountSection />} />
        <Route path="orders" element={<MyOrdersSection />} />
        <Route path="address-book" element={<AddressBookSection />} />
        <Route path="payment-methods" element={<PaymentMethodsSection />} />
        <Route path="quotes" element={<PortalFeatureGate feature="quotes"><QuoteFormSection /></PortalFeatureGate>} />
        <Route path="helpdesk" element={<PortalFeatureGate feature="helpdesk"><HelpdeskTicketsSection /></PortalFeatureGate>} />
        <Route path="helpdesk/:ticketId" element={<PortalFeatureGate feature="helpdesk"><HelpdeskTicketDetailSection /></PortalFeatureGate>} />
        <Route path="assistant-chats" element={<AssistantConversationsSection />} />
        <Route path="pricelists" element={<PortalFeatureGate feature="pricelists"><AssignedPricelistsSection /></PortalFeatureGate>} />
        <Route path="drafts" element={<CartDraftsSection />} />
        <Route path="rx-order" element={<LensAssistantProfileRouteGate />} />
        <Route path="lens-assistant" element={<Navigate to="/profile/rx-order" replace />} />
        <Route path="rx-drafts/:draftId" element={<RxDraftSection />} />
        <Route path="statements" element={<PortalFeatureGate feature="statements"><StatementsSection /></PortalFeatureGate>} />
        <Route path="networking-card" element={<NetworkingCardPage />} />
        <Route path="handbook" element={<HandbookSection />} />
      </Route>
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
};

export default PortalRoutes;
