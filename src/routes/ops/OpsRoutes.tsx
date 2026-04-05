import { Navigate, Route, Routes } from "react-router";

const OpsRoutes = () => (
  <Routes>
    <Route index element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
  </Routes>
);

export default OpsRoutes;
