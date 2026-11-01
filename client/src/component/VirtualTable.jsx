import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fetchManyUsers } from '../api/users';

const ROW_HEIGHT = 40;

function VirtualTable() {
  'use no memo';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [domNodes, setDomNodes] = useState(0);
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

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
  }, [users, virtualItems.length]);

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => loadRows(1000)}>Load 1,000</button>
        <button onClick={() => loadRows(20000)}>Load 20,000</button>
        <button onClick={() => loadRows(50000)}>Load 50,000</button>
        <span>
          Rows: {users.length.toLocaleString()} | Rendered:{' '}
          {virtualItems.length} | DOM nodes: {domNodes.toLocaleString()}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      <div className="v-header">
        <div>ID</div>
        <div>Name</div>
        <div>Email</div>
        <div>City</div>
        <div>Status</div>
        <div>Created</div>
        <div>Last Login</div>
      </div>

      <div ref={parentRef} className="v-body">
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const user = users[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="v-row"
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div>{user.id}</div>
                <div>{user.name}</div>
                <div>{user.email}</div>
                <div>{user.city}</div>
                <div>{user.status}</div>
                <div>{new Date(user.created_at).toLocaleDateString()}</div>
                <div>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualTable;