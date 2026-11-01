import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';

function PaginatedTable() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    fetchUsers(page, 50, debouncedSearch)
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
  }, [page, debouncedSearch]);

  const handleSearch = (value) => {
    setSearch(value);
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
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>City</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.city}</td>
                <td>{user.status}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'}
                </td>
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