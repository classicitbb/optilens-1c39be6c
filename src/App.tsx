import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Knowledge from "./pages/Knowledge";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import ReferenceDataPage from "./pages/admin/ReferenceDataPage";
import PlaceholderPage from "./pages/admin/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
              <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />

              {/* Admin pricing tool */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<Navigate to="/admin/reference/suppliers" replace />} />
                <Route path="reference/:entity" element={<ReferenceDataPage />} />
                <Route path="lenses" element={<PlaceholderPage />} />
                <Route path="pricing" element={<PlaceholderPage />} />
                <Route path="imports" element={<PlaceholderPage />} />
                <Route path="history" element={<PlaceholderPage />} />
                <Route path="exports" element={<PlaceholderPage />} />
                <Route path="parameters" element={<PlaceholderPage />} />
                <Route path="users" element={<PlaceholderPage />} />
                <Route path="audit" element={<PlaceholderPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
