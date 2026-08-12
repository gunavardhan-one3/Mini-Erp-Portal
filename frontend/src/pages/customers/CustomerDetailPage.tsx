import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import { addFollowUp, getCustomer, type CustomerDetail } from "../../api/customers";
import CustomerFormModal from "./CustomerFormModal";
import "./CustomerDetailPage.css";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Sales";

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const load = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    getCustomer(token!, id)
      .then((res) => setCustomer(res.customer))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load customer");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id, token]);

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!noteText.trim()) {
      setNoteError("Note cannot be empty");
      return;
    }
    setNoteError(null);
    setIsAddingNote(true);
    try {
      const { followUp } = await addFollowUp(token!, id, noteText.trim());
      setCustomer((prev) => (prev ? { ...prev, followUps: [followUp, ...prev.followUps] } : prev));
      setNoteText("");
    } catch (err) {
      setNoteError(err instanceof ApiError ? err.message : "Failed to add follow-up");
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading) return <p>Loading...</p>;

  if (notFound) {
    return (
      <div>
        <p>Customer not found.</p>
        <Link to="/customers">Back to customers</Link>
      </div>
    );
  }

  if (error || !customer) {
    return <p className="page-error">{error ?? "Something went wrong"}</p>;
  }

  return (
    <div>
      <button className="btn-link back-link" onClick={() => navigate("/customers")}>
        ← Back to customers
      </button>

      <div className="detail-header">
        <div>
          <h1>{customer.name}</h1>
          <span className={`status-badge status-${customer.status.toLowerCase()}`}>
            {customer.status}
          </span>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowEditModal(true)}>
            Edit
          </button>
        )}
      </div>

      <div className="detail-grid">
        <Field label="Mobile" value={customer.mobile} />
        <Field label="Email" value={customer.email} />
        <Field label="Business Name" value={customer.businessName} />
        <Field label="GST Number" value={customer.gstNumber} />
        <Field label="Customer Type" value={customer.customerType} />
        <Field
          label="Next Follow-up Date"
          value={customer.followUpDate ? customer.followUpDate.slice(0, 10) : null}
        />
        <Field label="Address" value={customer.address} wide />
      </div>

      <h2 className="section-title">Follow-up Notes</h2>

      {canManage && (
        <form className="note-form" onSubmit={handleAddNote}>
          <textarea
            placeholder="Add a follow-up note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
          />
          <button className="btn-primary" type="submit" disabled={isAddingNote}>
            {isAddingNote ? "Adding..." : "Add Note"}
          </button>
        </form>
      )}
      {noteError && <p className="field-error">{noteError}</p>}

      <ul className="followup-list">
        {customer.followUps.length === 0 && <li className="empty-row">No follow-up notes yet.</li>}
        {customer.followUps.map((followUp) => (
          <li key={followUp.id} className="followup-item">
            <p>{followUp.note}</p>
            <span className="followup-date">
              {new Date(followUp.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      {showEditModal && (
        <CustomerFormModal
          mode="edit"
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={`detail-field${wide ? " detail-field-wide" : ""}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || "-"}</span>
    </div>
  );
}
