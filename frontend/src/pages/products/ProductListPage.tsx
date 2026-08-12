import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import { listProducts, type Product } from "../../api/products";
import ProductFormModal from "./ProductFormModal";
import "../customers/CustomerListPage.css";
import "./ProductListPage.css";

const LIMIT = 10;

export default function ProductListPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "Admin" || user?.role === "Warehouse";

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [category, setCategory] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; product: Product } | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => setCategory(categoryInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [categoryInput]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listProducts(token!, { page, limit: LIMIT, search, category })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, page, search, category, refreshKey]);

  const handleSaved = () => {
    setModalState(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setModalState({ mode: "create" })}>
            Add Product
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name or SKU..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <input
          className="search-input"
          placeholder="Filter by category..."
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
        />
      </div>

      {error && <p className="page-error">{error}</p>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock</th>
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
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No products found.
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((product) => (
                <tr
                  key={product.id}
                  className="clickable-row"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category}</td>
                  <td>₹{Number(product.unitPrice).toFixed(2)}</td>
                  <td>
                    <span className={product.lowStock ? "stock-badge stock-low" : "stock-badge"}>
                      {product.currentStock}
                    </span>
                    {product.lowStock && <span className="low-stock-tag">Low stock</span>}
                  </td>
                  {canManage && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-link"
                        onClick={() => setModalState({ mode: "edit", product })}
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
          {total} product{total === 1 ? "" : "s"} · Page {page} of {totalPages}
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
        <ProductFormModal
          mode={modalState.mode}
          product={modalState.mode === "edit" ? modalState.product : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
