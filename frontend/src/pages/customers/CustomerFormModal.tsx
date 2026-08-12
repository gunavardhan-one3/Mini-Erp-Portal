import { type FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  createCustomer,
  updateCustomer,
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
  type Customer,
  type CustomerFormInput,
} from "../../api/customers";
import "./CustomerFormModal.css";

const MOBILE_REGEX = /^[+]?[0-9][0-9\s-]{6,14}$/;

interface Props {
  mode: "create" | "edit";
  customer?: Customer;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

type FieldErrors = Record<string, string[]>;

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function CustomerFormModal({ mode, customer, onClose, onSaved }: Props) {
  const { token } = useAuth();
  const [form, setForm] = useState<CustomerFormInput>({
    name: customer?.name ?? "",
    mobile: customer?.mobile ?? "",
    email: customer?.email ?? "",
    businessName: customer?.businessName ?? "",
    gstNumber: customer?.gstNumber ?? "",
    customerType: customer?.customerType ?? "Retail",
    address: customer?.address ?? "",
    status: customer?.status ?? "Lead",
    followUpDate: toDateInputValue(customer?.followUpDate),
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = ["Name is required"];
    if (!MOBILE_REGEX.test(form.mobile.trim())) {
      errors.mobile = ["Enter a valid mobile number"];
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = ["Enter a valid email"];
    }
    if (!form.customerType) errors.customerType = ["Customer type is required"];
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

    const payload: CustomerFormInput = {
      ...form,
      email: form.email?.trim() || undefined,
      businessName: form.businessName?.trim() || undefined,
      gstNumber: form.gstNumber?.trim() || undefined,
      address: form.address?.trim() || undefined,
      followUpDate: form.followUpDate || undefined,
    };

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const { customer: created } = await createCustomer(token!, payload);
        onSaved(created);
      } else {
        const { customer: updated } = await updateCustomer(token!, customer!.id, payload);
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
      <form
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>{mode === "create" ? "Add Customer" : "Edit Customer"}</h2>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="mobile">Mobile *</label>
            <input
              id="mobile"
              value={form.mobile}
              onChange={(e) => setField("mobile", e.target.value)}
            />
            {fieldErrors.mobile && <span className="field-error">{fieldErrors.mobile[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email[0]}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="businessName">Business Name</label>
            <input
              id="businessName"
              value={form.businessName}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="gstNumber">GST Number</label>
            <input
              id="gstNumber"
              value={form.gstNumber}
              onChange={(e) => setField("gstNumber", e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="customerType">Customer Type *</label>
            <select
              id="customerType"
              value={form.customerType}
              onChange={(e) => setField("customerType", e.target.value as CustomerFormInput["customerType"])}
            >
              {CUSTOMER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value as CustomerFormInput["status"])}
            >
              {CUSTOMER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="followUpDate">Next Follow-up Date</label>
            <input
              id="followUpDate"
              type="date"
              value={form.followUpDate}
              onChange={(e) => setField("followUpDate", e.target.value)}
            />
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              rows={2}
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
