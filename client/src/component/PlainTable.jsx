import { useEffect, useState } from 'react';
import { fetchManyUsers } from '../api/users';

function PlainTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [domNodes, setDomNodes] = useState(0);

  const loadRows = async (count) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchManyUsers(count);
      setUsers(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDomNodes(document.querySelectorAll('*').length);
  }, [users]);

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => loadRows(1000)}>Load 1,000</button>
        <button onClick={() => loadRows(5000)}>Load 5,000</button>
        <button onClick={() => loadRows(20000)}>Load 20,000</button>
        <span>
          Rows: {users.length.toLocaleString()} | DOM nodes:{' '}
          {domNodes.toLocaleString()}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      <div className="table-wrapper">
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
      </div>
    </div>
  );
}

export default PlainTable;