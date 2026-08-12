import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  listChallans,
  CHALLAN_STATUSES,
  type ChallanListRow,
  type ChallanStatus,
} from "../../api/challans";
import "../customers/CustomerListPage.css";
import "./ChallanListPage.css";

const LIMIT = 10;

export default function ChallanListPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Sales";

  const [challans, setChallans] = useState<ChallanListRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState<ChallanStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listChallans(token!, { page, limit: LIMIT, status })
      .then((res) => {
        if (cancelled) return;
        setChallans(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load challans");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, page, status]);

  return (
    <div>
      <div className="page-header">
        <h1>Sales Challans</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => navigate("/challans/new")}>
            New Challan
          </button>
        )}
      </div>

      <div className="filters-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value as ChallanStatus | "")}>
          <option value="">All statuses</option>
          {CHALLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="page-error">{error}</p>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Created</th>
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
            {!isLoading && challans.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No challans found.
                </td>
              </tr>
            )}
            {!isLoading &&
              challans.map((challan) => (
                <tr
                  key={challan.id}
                  className="clickable-row"
                  onClick={() => navigate(`/challans/${challan.id}`)}
                >
                  <td>{challan.challanNumber}</td>
                  <td>{challan.customer.name}</td>
                  <td>{challan._count.items}</td>
                  <td>{challan.totalQuantity}</td>
                  <td>
                    <span className={`challan-status-badge challan-status-${challan.status.toLowerCase()}`}>
                      {challan.status}
                    </span>
                  </td>
                  <td>{new Date(challan.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>
          {total} challan{total === 1 ? "" : "s"} · Page {page} of {totalPages}
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
    </div>
  );
}
