import { useState } from 'react';
import PaginatedTable from './component/PaginatedTable';
import PlainTable from './component/PlainTable';
import './App.css';

function App() {
  const [view, setView] = useState('paginated');

  return (
    <div className="container">
      <h1>Users Admin Panel</h1>

      <div className="tabs">
        <button
          className={view === 'paginated' ? 'active' : ''}
          onClick={() => setView('paginated')}
        >
          Paginated
        </button>
        <button
          className={view === 'plain' ? 'active' : ''}
          onClick={() => setView('plain')}
        >
          Plain (stress test)
        </button>
      </div>

      {view === 'paginated' && <PaginatedTable />}
      {view === 'plain' && <PlainTable />}
    </div>
  );
}

export default App;