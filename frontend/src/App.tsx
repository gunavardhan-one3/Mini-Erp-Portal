import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerListPage from "./pages/customers/CustomerListPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import ProductListPage from "./pages/products/ProductListPage";
import ProductDetailPage from "./pages/products/ProductDetailPage";
import ChallanListPage from "./pages/challans/ChallanListPage";
import ChallanFormPage from "./pages/challans/ChallanFormPage";
import ChallanDetailPage from "./pages/challans/ChallanDetailPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/challans" element={<ChallanListPage />} />
              <Route path="/challans/new" element={<ChallanFormPage />} />
              <Route path="/challans/:id/edit" element={<ChallanFormPage />} />
              <Route path="/challans/:id" element={<ChallanDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
