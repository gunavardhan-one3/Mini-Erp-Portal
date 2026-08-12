import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  cancelChallan,
  confirmChallan,
  getChallan,
  type ChallanDetail,
  type InsufficientItem,
} from "../../api/challans";
import "../customers/CustomerFormModal.css";
import "../customers/CustomerDetailPage.css";
import "./ChallanListPage.css";
import "./ChallanFormPage.css";
import "./ChallanDetailPage.css";

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Sales";

  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[] | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    getChallan(token!, id)
      .then((res) => setChallan(res.challan))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load challan");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id, token]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionError(null);
    setInsufficientItems(null);
    setIsConfirming(true);
    try {
      const { challan: updated } = await confirmChallan(token!, id);
      setChallan(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
        const details = err.details as { insufficientItems?: InsufficientItem[] } | undefined;
        if (details?.insufficientItems) setInsufficientItems(details.insufficientItems);
      } else {
        setActionError("Failed to confirm challan");
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm("Cancel this challan? This cannot be undone.")) return;
    setActionError(null);
    setIsCancelling(true);
    try {
      const { challan: updated } = await cancelChallan(token!, id);
      setChallan(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to cancel challan");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) return <p>Loading...</p>;

  if (notFound) {
    return (
      <div>
        <p>Challan not found.</p>
        <Link to="/challans">Back to challans</Link>
      </div>
    );
  }

  if (error || !challan) {
    return <p className="page-error">{error ?? "Something went wrong"}</p>;
  }

  const grandTotal = challan.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );

  return (
    <div>
      <button className="btn-link back-link" onClick={() => navigate("/challans")}>
        ← Back to challans
      </button>

      <div className="detail-header">
        <div>
          <h1>{challan.challanNumber}</h1>
          <span className={`challan-status-badge challan-status-${challan.status.toLowerCase()}`}>
            {challan.status}
          </span>
        </div>
        {canManage && challan.status === "Draft" && (
          <div className="challan-actions">
            <button className="btn-secondary" onClick={() => navigate(`/challans/${challan.id}/edit`)}>
              Edit
            </button>
            <button className="btn-danger" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel"}
            </button>
            <button className="btn-primary" onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? "Confirming..." : "Confirm"}
            </button>
          </div>
        )}
        {canManage && challan.status === "Confirmed" && (
          <div className="challan-actions">
            <button className="btn-danger" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="action-error-box">
          <p className="form-error">{actionError}</p>
          {insufficientItems && insufficientItems.length > 0 && (
            <ul className="insufficient-list">
              {insufficientItems.map((item) => (
                <li key={item.productId}>
                  <strong>{item.name}</strong> ({item.sku}) — requested {item.requested}, only{" "}
                  {item.available} available
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="detail-grid">
        <Field label="Customer" value={challan.customer.name} />
        <Field label="Mobile" value={challan.customer.mobile} />
        <Field label="Business Name" value={challan.customer.businessName} />
        <Field label="Created By" value={challan.creator?.name ?? "-"} />
        <Field label="Created At" value={new Date(challan.createdAt).toLocaleString()} />
        <Field label="Total Quantity" value={String(challan.totalQuantity)} />
      </div>

      <h2 className="section-title">Line Items</h2>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Quantity</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.sku}</td>
                <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                <td>{item.quantity}</td>
                <td>₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="challan-totals">
        <span>Total Quantity: {challan.totalQuantity}</span>
        <span>Grand Total: ₹{grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || "-"}</span>
    </div>
  );
}
