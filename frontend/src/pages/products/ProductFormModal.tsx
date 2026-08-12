import { type FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  createProduct,
  updateProduct,
  type Product,
  type ProductCreateInput,
} from "../../api/products";
import "../customers/CustomerFormModal.css";

interface Props {
  mode: "create" | "edit";
  product?: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

type FieldErrors = Record<string, string[]>;

interface FormState {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
}

export default function ProductFormModal({ mode, product, onClose, onSaved }: Props) {
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "",
    unitPrice: product?.unitPrice ?? "",
    currentStock: product ? String(product.currentStock) : "0",
    minStockAlert: product ? String(product.minStockAlert) : "0",
    location: product?.location ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = ["Name is required"];
    if (!form.sku.trim()) errors.sku = ["SKU is required"];
    if (!form.category.trim()) errors.category = ["Category is required"];

    const price = Number(form.unitPrice);
    if (form.unitPrice.trim() === "" || Number.isNaN(price) || price < 0) {
      errors.unitPrice = ["Enter a valid unit price"];
    }

    if (mode === "create") {
      const stock = Number(form.currentStock);
      if (form.currentStock.trim() === "" || !Number.isInteger(stock) || stock < 0) {
        errors.currentStock = ["Enter a valid starting stock quantity"];
      }
    }

    const minAlert = Number(form.minStockAlert);
    if (form.minStockAlert.trim() === "" || !Number.isInteger(minAlert) || minAlert < 0) {
      errors.minStockAlert = ["Enter a valid alert threshold"];
    }

    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const payload: ProductCreateInput = {
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category.trim(),
          unitPrice: Number(form.unitPrice),
          currentStock: Number(form.currentStock),
          minStockAlert: Number(form.minStockAlert),
          location: form.location.trim() || undefined,
        };
        const { product: created } = await createProduct(token!, payload);
        onSaved(created);
      } else {
        const payload = {
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category.trim(),
          unitPrice: Number(form.unitPrice),
          minStockAlert: Number(form.minStockAlert),
          location: form.location.trim(),
        };
        const { product: updated } = await updateProduct(token!, product!.id, payload);
        onSaved(updated);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        const details = err.details as { fieldErrors?: FieldErrors } | undefined;
        if (details?.fieldErrors) setFieldErrors(details.fieldErrors);
      } else {
        setFormError("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{mode === "create" ? "Add Product" : "Edit Product"}</h2>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Name *</label>
            <input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="sku">SKU *</label>
            <input id="sku" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
            {fieldErrors.sku && <span className="field-error">{fieldErrors.sku[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="category">Category *</label>
            <input
              id="category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
            />
            {fieldErrors.category && <span className="field-error">{fieldErrors.category[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="unitPrice">Unit Price *</label>
            <input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={form.unitPrice}
              onChange={(e) => setField("unitPrice", e.target.value)}
            />
            {fieldErrors.unitPrice && <span className="field-error">{fieldErrors.unitPrice[0]}</span>}
          </div>

          {mode === "create" && (
            <div className="form-field">
              <label htmlFor="currentStock">Starting Stock *</label>
              <input
                id="currentStock"
                type="number"
                min="0"
                step="1"
                value={form.currentStock}
                onChange={(e) => setField("currentStock", e.target.value)}
              />
              {fieldErrors.currentStock && (
                <span className="field-error">{fieldErrors.currentStock[0]}</span>
              )}
              <span className="field-hint">
                Adjust stock afterward via stock movements on the product detail page.
              </span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="minStockAlert">Low Stock Alert Threshold *</label>
            <input
              id="minStockAlert"
              type="number"
              min="0"
              step="1"
              value={form.minStockAlert}
              onChange={(e) => setField("minStockAlert", e.target.value)}
            />
            {fieldErrors.minStockAlert && (
              <span className="field-error">{fieldErrors.minStockAlert[0]}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="location">Location / Warehouse</label>
            <input
              id="location"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
            />
          </div>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
