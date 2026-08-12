import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  listCustomers,
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
  type Customer,
  type CustomerStatus,
  type CustomerType,
} from "../../api/customers";
import CustomerFormModal from "./CustomerFormModal";
import "./CustomerListPage.css";

const LIMIT = 10;

export default function CustomerListPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Sales";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [customerType, setCustomerType] = useState<CustomerType | "">("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; customer: Customer } | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status, customerType]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listCustomers(token!, { page, limit: LIMIT, search, status, customerType })
      .then((res) => {
        if (cancelled) return;
        setCustomers(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load customers");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, page, search, status, customerType, refreshKey]);

  const handleSaved = () => {
    setModalState(null);
    // Refetch from the server rather than splicing locally, so pagination
    // totals and the current search/filter view stay accurate.
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setModalState({ mode: "create" })}>
            Add Customer
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name or mobile..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus | "")}>
          <option value="">All statuses</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value as CustomerType | "")}
        >
          <option value="">All types</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="page-error">{error}</p>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up Date</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No customers found.
                </td>
              </tr>
            )}
            {!isLoading &&
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="clickable-row"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <td>{customer.name}</td>
                  <td>{customer.mobile}</td>
                  <td>{customer.customerType}</td>
                  <td>
                    <span className={`status-badge status-${customer.status.toLowerCase()}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td>{customer.followUpDate ? customer.followUpDate.slice(0, 10) : "-"}</td>
                  {canManage && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-link"
                        onClick={() => setModalState({ mode: "edit", customer })}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>
          {total} customer{total === 1 ? "" : "s"} · Page {page} of {totalPages}
        </span>
        <div className="pagination-controls">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      {modalState && (
        <CustomerFormModal
          mode={modalState.mode}
          customer={modalState.mode === "edit" ? modalState.customer : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
