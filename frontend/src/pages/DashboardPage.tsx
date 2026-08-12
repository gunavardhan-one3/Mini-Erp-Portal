import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Role: {user?.role}</p>
      <p>Customer, Product, and Challan modules will be built into this layout next.</p>
    </div>
  );
}
