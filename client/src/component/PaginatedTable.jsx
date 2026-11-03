import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency, formatDate } from '../utils/format';
import StatusBadge from './StatusBadge';
import FilterBar from './FilterBar';
import FilterChips from './FilterChips';
import { readUrlState, writeUrlState } from '../utils/urlState';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'created_at', label: 'Created' },
  { key: 'last_login', label: 'Last Login' },
];

const INITIAL_FILTERS = {
  search: '',
  city: '',
  status: '',
  minRevenue: '',
  neverLoggedIn: false,
};

function PaginatedTable() {
  const [initial] = useState(readUrlState);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [order, setOrder] = useState(initial.order);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    fetchUsers({ page, limit: 50, sort, order, filters: debouncedFilters })
      .then((result) => {
        if (!ignore) {
          setUsers(result.data);
          setTotalPages(result.totalPages);
          setTotal(result.total);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, sort, order, debouncedFilters]);

    useEffect(() => {
    writeUrlState({ page, sort, order, filters });
  }, [page, sort, order, filters]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const removeFilter = (key) => updateFilter(key, INITIAL_FILTERS[key]);

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleSort = (column) => {
    if (sort === column) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('asc');
    }
    setPage(1);
  };

    const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or email..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <span>{total.toLocaleString()} records</span>
        <button className="share-btn" onClick={handleShare}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
      </div>

      <FilterBar filters={filters} onChange={updateFilter} />
      <FilterChips
        filters={filters}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No users found</p>
      ) : (
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`sortable ${col.key === 'revenue' ? 'num' : ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{' '}
                  {sort === col.key && (order === 'asc' ? '▲' : '▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.city}</td>
                <td>
                  <StatusBadge status={user.status} />
                </td>
                <td className="num">{formatCurrency(user.revenue)}</td>
                <td>{formatDate(user.created_at)}</td>
                <td>{formatDate(user.last_login)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default PaginatedTable;