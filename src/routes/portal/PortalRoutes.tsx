import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountLayout from "@/components/account/AccountLayout";

const Store = lazy(() => import("@/pages/Store"));
const Profile = lazy(() => import("@/pages/Profile"));
const MyAccountSection = lazy(() => import("@/components/account/sections/MyAccountSection"));
const MyOrdersSection = lazy(() => import("@/components/account/sections/MyOrdersSection"));
const AddressBookSection = lazy(() => import("@/components/account/sections/AddressBookSection"));
const QuoteFormSection = lazy(() => import("@/components/account/sections/QuoteFormSection"));
const HelpdeskTicketsSection = lazy(() => import("@/components/account/sections/HelpdeskTicketsSection"));
const AssignedPricelistsSection = lazy(() => import("@/components/account/sections/AssignedPricelistsSection"));

interface PortalRoutesProps {
  section: "store" | "profile";
}

const PortalRoutes = ({ section }: PortalRoutesProps) => {
  if (section === "store") {
    return (
      <Routes>
        <Route
          index
          element={(
            <ProtectedRoute>
              <Store />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/store" replace />} />
      </Routes>
    );
  }

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
        <Route path="quotes" element={<QuoteFormSection />} />
        <Route path="helpdesk" element={<HelpdeskTicketsSection />} />
        <Route path="pricelists" element={<AssignedPricelistsSection />} />
      </Route>
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
};

export default PortalRoutes;
