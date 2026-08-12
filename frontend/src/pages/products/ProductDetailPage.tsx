import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  createStockMovement,
  getProduct,
  listStockMovements,
  type MovementType,
  type Product,
  type StockMovement,
} from "../../api/products";
import ProductFormModal from "./ProductFormModal";
import "../customers/CustomerDetailPage.css";
import "./ProductListPage.css";
import "./ProductDetailPage.css";

const MOVEMENTS_PER_PAGE = 10;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Warehouse";

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotalPages, setMovementsTotalPages] = useState(1);
  const [movementsLoading, setMovementsLoading] = useState(true);

  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [reason, setReason] = useState("");
  const [movementError, setMovementError] = useState<string | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  const loadProduct = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    getProduct(token!, id)
      .then((res) => setProduct(res.product))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load product");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadProduct, [id, token]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setMovementsLoading(true);
    listStockMovements(token!, id, { page: movementsPage, limit: MOVEMENTS_PER_PAGE })
      .then((res) => {
        if (cancelled) return;
        setMovements(res.data);
        setMovementsTotalPages(res.pagination.totalPages);
      })
      .catch(() => {
        /* surfaced via movementError only when logging a new movement */
      })
      .finally(() => {
        if (!cancelled) setMovementsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token, movementsPage]);

  const handleLogMovement = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMovementError(null);

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setMovementError("Enter a positive whole number for quantity");
      return;
    }
    if (!reason.trim()) {
      setMovementError("Reason is required");
      return;
    }

    setIsSubmittingMovement(true);
    try {
      const { product: updatedProduct, stockMovement } = await createStockMovement(token!, id, {
        quantityChanged: qty,
        movementType,
        reason: reason.trim(),
      });
      setProduct(updatedProduct);
      setMovements((prev) => [stockMovement, ...prev]);
      setQuantity("");
      setReason("");
    } catch (err) {
      setMovementError(err instanceof ApiError ? err.message : "Failed to log stock movement");
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  if (isLoading) return <p>Loading...</p>;

  if (notFound) {
    return (
      <div>
        <p>Product not found.</p>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

  if (error || !product) {
    return <p className="page-error">{error ?? "Something went wrong"}</p>;
  }

  return (
    <div>
      <button className="btn-link back-link" onClick={() => navigate("/products")}>
        ← Back to products
      </button>

      <div className="detail-header">
        <div>
          <h1>{product.name}</h1>
          <span className={product.lowStock ? "stock-badge stock-low" : "stock-badge"}>
            {product.currentStock} in stock
          </span>
          {product.lowStock && <span className="low-stock-tag">Low stock</span>}
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowEditModal(true)}>
            Edit
          </button>
        )}
      </div>

      <div className="detail-grid">
        <Field label="SKU" value={product.sku} />
        <Field label="Category" value={product.category} />
        <Field label="Unit Price" value={`₹${Number(product.unitPrice).toFixed(2)}`} />
        <Field label="Current Stock" value={String(product.currentStock)} />
        <Field label="Low Stock Alert Threshold" value={String(product.minStockAlert)} />
        <Field label="Location / Warehouse" value={product.location} />
      </div>

      <h2 className="section-title">Log Stock Movement</h2>

      {canManage && (
        <form className="movement-form" onSubmit={handleLogMovement}>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as MovementType)}
          >
            <option value="IN">IN (add stock)</option>
            <option value="OUT">OUT (remove stock)</option>
          </select>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            type="text"
            placeholder="Reason (e.g. Restock from supplier)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="movement-reason-input"
          />
          <button className="btn-primary" type="submit" disabled={isSubmittingMovement}>
            {isSubmittingMovement ? "Logging..." : "Log Movement"}
          </button>
        </form>
      )}
      {movementError && <p className="field-error">{movementError}</p>}

      <h2 className="section-title">Stock Movement History</h2>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {movementsLoading && (
              <tr>
                <td colSpan={5} className="empty-row">
                  Loading...
                </td>
              </tr>
            )}
            {!movementsLoading && movements.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No stock movements yet.
                </td>
              </tr>
            )}
            {!movementsLoading &&
              movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.timestamp).toLocaleString()}</td>
                  <td>
                    <span className={`movement-type movement-${m.movementType.toLowerCase()}`}>
                      {m.movementType}
                    </span>
                  </td>
                  <td>{m.quantityChanged}</td>
                  <td>{m.reason}</td>
                  <td>{m.creator?.name ?? "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>
          Page {movementsPage} of {movementsTotalPages}
        </span>
        <div className="pagination-controls">
          <button disabled={movementsPage <= 1} onClick={() => setMovementsPage((p) => p - 1)}>
            Previous
          </button>
          <button
            disabled={movementsPage >= movementsTotalPages}
            onClick={() => setMovementsPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {showEditModal && (
        <ProductFormModal
          mode="edit"
          product={product}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setProduct(updated);
            setShowEditModal(false);
          }}
        />
      )}
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
