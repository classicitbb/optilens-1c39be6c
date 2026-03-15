import { lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountLayout from "@/components/account/AccountLayout";
import { PORTAL_LEGACY_REDIRECTS } from "@/config/routeRegistry";

const Store = lazy(() => import("@/pages/Store"));
const Profile = lazy(() => import("@/pages/Profile"));
const MyAccountSection = lazy(() => import("@/components/account/sections/MyAccountSection"));
const MyOrdersSection = lazy(() => import("@/components/account/sections/MyOrdersSection"));
const AddressBookSection = lazy(() => import("@/components/account/sections/AddressBookSection"));
const QuoteFormSection = lazy(() => import("@/components/account/sections/QuoteFormSection"));
const HelpdeskTicketsSection = lazy(() => import("@/components/account/sections/HelpdeskTicketsSection"));
const AssignedPricelistsSection = lazy(() => import("@/components/account/sections/AssignedPricelistsSection"));

const PortalRoutes = () => (
  <Routes>
    <Route
      path="/store"
      element={(
        <ProtectedRoute>
          <Store />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/profile/*"
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

    {PORTAL_LEGACY_REDIRECTS.map((route) => (
      <Route key={route.id} path={route.path} element={<Navigate to={route.redirectTo ?? "/profile/orders"} replace />} />
    ))}

    <Route path="*" element={<Outlet />} />
  </Routes>
);

export default PortalRoutes;
