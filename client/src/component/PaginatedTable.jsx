import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';

function PaginatedTable() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

 useEffect(() => {
  let ignore = false;
  setLoading(true);
  setError('');

  fetchUsers(page, 50)
    .then((result) => {
      if (!ignore) {
        setUsers(result.data);
        setTotalPages(result.totalPages);
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
}, [page]);

  return (
    <div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
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
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default PaginatedTable;