import { useState } from 'react';
import PaginatedTable from './component/PaginatedTable';
import PlainTable from './component/PlainTable';
import VirtualTable from './component/VirtualTable';
import FilterBar from './component/FilterBar';
import FilterChips from './component/FilterChips';
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
        <button
  className={view === 'virtual' ? 'active' : ''}
  onClick={() => setView('virtual')}
>
  Virtualized
</button>

      </div>

      {view === 'paginated' && <PaginatedTable />}
      {view === 'plain' && <PlainTable />}
      {view === 'virtual' && <VirtualTable />}
      {view === 'FilterBar' && <FilterBar />}
      {view === 'FilterChips' && <FilterChips />}


    </div>
  );
}

export default App;