import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountLayout from "@/components/account/AccountLayout";
import PortalFeatureGate from "@/components/account/PortalFeatureGate";

const Profile = lazy(() => import("@/pages/Profile"));
const MyAccountSection = lazy(() => import("@/components/account/sections/MyAccountSection"));
const MyOrdersSection = lazy(() => import("@/components/account/sections/MyOrdersSection"));
const AddressBookSection = lazy(() => import("@/components/account/sections/AddressBookSection"));
const PaymentMethodsSection = lazy(() => import("@/components/account/sections/PaymentMethodsSection"));
const QuoteFormSection = lazy(() => import("@/components/account/sections/QuoteFormSection"));
const HelpdeskTicketsSection = lazy(() => import("@/components/account/sections/HelpdeskTicketsSection"));
const AssignedPricelistsSection = lazy(() => import("@/components/account/sections/AssignedPricelistsSection"));

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
        <Route path="pricelists" element={<PortalFeatureGate feature="pricelists"><AssignedPricelistsSection /></PortalFeatureGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
};

export default PortalRoutes;
