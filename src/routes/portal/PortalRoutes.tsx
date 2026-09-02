import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountLayout from "@/components/account/AccountLayout";
import PortalFeatureGate from "@/components/account/PortalFeatureGate";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const MyAccountSection = lazyWithRetry(() => import("@/components/account/sections/MyAccountSection"));
const MyOrdersSection = lazyWithRetry(() => import("@/components/account/sections/MyOrdersSection"));
const QuoteFormSection = lazyWithRetry(() => import("@/components/account/sections/QuoteFormSection"));
const HelpdeskTicketsSection = lazyWithRetry(() => import("@/components/account/sections/HelpdeskTicketsSection"));
const HelpdeskTicketDetailSection = lazyWithRetry(() => import("@/components/account/sections/HelpdeskTicketDetailSection"));
const AssistantConversationsSection = lazyWithRetry(() => import("@/components/account/sections/AssistantConversationsSection"));
const AssignedPricelistsSection = lazyWithRetry(() => import("@/components/account/sections/AssignedPricelistsSection"));
const CartDraftsSection = lazyWithRetry(() => import("@/components/account/sections/CartDraftsSection"));
const StatementsSection = lazyWithRetry(() => import("@/components/account/sections/StatementsSection"));
const RxDraftSection = lazyWithRetry(() => import("@/components/account/sections/RxDraftSection"));
const LensAssistantSection = lazyWithRetry(() => import("@/components/account/sections/LensAssistantSection"));
const NetworkingCardPage = lazyWithRetry(() => import("@/pages/NetworkingCardPage"));
const HandbookSection = lazyWithRetry(() => import("@/components/account/sections/HandbookSection"));

const RxOrderRouteGate = () => {
  const { isLoading: identityLoading } = usePortalIdentity();

  if (identityLoading) {
    return <div className="flex min-h-[240px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <PortalFeatureGate feature="rx-order">
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
        <Route path="address-book" element={<Navigate to="/profile/account#address-book" replace />} />
        <Route path="payment-methods" element={<Navigate to="/profile/account#payment-methods" replace />} />
        <Route path="quotes" element={<PortalFeatureGate feature="quotes"><QuoteFormSection /></PortalFeatureGate>} />
        <Route path="helpdesk" element={<PortalFeatureGate feature="helpdesk"><HelpdeskTicketsSection /></PortalFeatureGate>} />
        <Route path="helpdesk/:ticketId" element={<PortalFeatureGate feature="helpdesk"><HelpdeskTicketDetailSection /></PortalFeatureGate>} />
        <Route path="assistant-chats" element={<AssistantConversationsSection />} />
        <Route path="pricelists" element={<PortalFeatureGate feature="pricelists"><AssignedPricelistsSection /></PortalFeatureGate>} />
        <Route path="drafts" element={<CartDraftsSection />} />
        <Route path="rx-order" element={<RxOrderRouteGate />} />
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
