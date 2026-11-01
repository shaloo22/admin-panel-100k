import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency, formatDate } from '../utils/format';
import StatusBadge from './StatusBadge';

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

function PaginatedTable() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    fetchUsers({ page, limit: 50, search: debouncedSearch, sort, order })
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
  }, [page, debouncedSearch, sort, order]);

  const handleSearch = (value) => {
    setSearch(value);
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

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {search && <button onClick={() => handleSearch('')}>✕</button>}
        <span>{total.toLocaleString()} records</span>
      </div>

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