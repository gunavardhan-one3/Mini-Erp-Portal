import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import { listCustomers, type Customer } from "../../api/customers";
import { listProducts, type Product } from "../../api/products";
import { createChallan, getChallan, updateChallan } from "../../api/challans";
import "../customers/CustomerFormModal.css";
import "../customers/CustomerListPage.css";
import "../customers/CustomerDetailPage.css";
import "./ChallanFormPage.css";

const CATALOG_LIMIT = 200;

interface Line {
  productId: string;
  quantity: string;
}

export default function ChallanFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [isLoadingChallan, setIsLoadingChallan] = useState(isEdit);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listCustomers(token!, { page: 1, limit: CATALOG_LIMIT }),
      listProducts(token!, { page: 1, limit: CATALOG_LIMIT }),
    ])
      .then(([customerRes, productRes]) => {
        setCustomers(customerRes.data);
        setProducts(productRes.data);
      })
      .catch((err) => {
        setCatalogError(err instanceof ApiError ? err.message : "Failed to load customers/products");
      })
      .finally(() => setCatalogLoading(false));
  }, [token]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getChallan(token!, id)
      .then((res) => {
        const { challan } = res;
        if (challan.status !== "Draft") {
          setBlockedReason(`This challan is ${challan.status} and can no longer be edited.`);
          return;
        }
        setCustomerId(challan.customerId);
        setLines(challan.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })));
      })
      .catch((err) => {
        setBlockedReason(err instanceof ApiError ? err.message : "Failed to load challan");
      })
      .finally(() => setIsLoadingChallan(false));
  }, [isEdit, id, token]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const availableProducts = useMemo(
    () => products.filter((p) => !lines.some((l) => l.productId === p.id)),
    [products, lines]
  );

  const addLine = () => {
    if (!newProductId) return;
    setLines((prev) => [...prev, { productId: newProductId, quantity: newQuantity || "1" }]);
    setNewProductId("");
    setNewQuantity("1");
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const updateLineQuantity = (productId: string, quantity: string) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  };

  const totalQuantity = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const grandTotal = lines.reduce((sum, l) => {
    const product = productMap.get(l.productId);
    const price = product ? Number(product.unitPrice) : 0;
    return sum + price * (Number(l.quantity) || 0);
  }, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError("Select a customer");
      return;
    }
    if (lines.length === 0) {
      setFormError("Add at least one product line");
      return;
    }
    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        setFormError("Every line needs a positive whole-number quantity");
        return;
      }
    }

    const payload = {
      customerId,
      items: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
    };

    setIsSubmitting(true);
    try {
      const { challan } = isEdit ? await updateChallan(token!, id!, payload) : await createChallan(token!, payload);
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (catalogLoading || isLoadingChallan) return <p>Loading...</p>;
  if (catalogError) return <p className="page-error">{catalogError}</p>;

  if (blockedReason) {
    return (
      <div>
        <p className="page-error">{blockedReason}</p>
        <Link to={id ? `/challans/${id}` : "/challans"}>Back</Link>
      </div>
    );
  }

  return (
    <div>
      <button className="btn-link back-link" onClick={() => navigate("/challans")}>
        ← Back to challans
      </button>

      <h1>{isEdit ? "Edit Challan" : "New Challan"}</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-field challan-customer-field">
          <label htmlFor="customerId">Customer *</label>
          <select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.mobile}
              </option>
            ))}
          </select>
        </div>

        <h2 className="section-title">Line Items</h2>

        <div className="add-line-row">
          <select value={newProductId} onChange={(e) => setNewProductId(e.target.value)}>
            <option value="">Select a product to add...</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — ₹{Number(p.unitPrice).toFixed(2)} — Stock: {p.currentStock}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            step="1"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={addLine} disabled={!newProductId}>
            Add Line
          </button>
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Available Stock</th>
                <th>Line Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No line items yet. Add a product above.
                  </td>
                </tr>
              )}
              {lines.map((line) => {
                const product = productMap.get(line.productId);
                const qty = Number(line.quantity) || 0;
                const exceedsStock = product ? qty > product.currentStock : false;
                return (
                  <tr key={line.productId}>
                    <td>{product?.name ?? "(unknown product)"}</td>
                    <td>{product?.sku ?? "-"}</td>
                    <td>₹{product ? Number(product.unitPrice).toFixed(2) : "-"}</td>
                    <td>
                      <input
                        className="line-qty-input"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updateLineQuantity(line.productId, e.target.value)}
                      />
                    </td>
                    <td>
                      <span className={exceedsStock ? "stock-warning" : ""}>
                        {product?.currentStock ?? "-"}
                        {exceedsStock && " (insufficient)"}
                      </span>
                    </td>
                    <td>₹{product ? (Number(product.unitPrice) * qty).toFixed(2) : "-"}</td>
                    <td>
                      <button type="button" className="btn-link" onClick={() => removeLine(line.productId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="challan-totals">
          <span>Total Quantity: {totalQuantity}</span>
          <span>Grand Total: ₹{grandTotal.toFixed(2)}</span>
        </div>

        <p className="field-hint">
          Quantities beyond current stock are allowed while in Draft — they're only checked
          when the challan is confirmed.
        </p>

        {formError && <p className="form-error">{formError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate("/challans")}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
