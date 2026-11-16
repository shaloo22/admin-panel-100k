import { useState } from 'react';
import PaginatedTable from '../component/PaginatedTable';
import UsersTable from '../component/UsersTable';

function UsersPage() {
  // "scroll" = infinite scroll with virtualization, "pages" = Prev / Next
  const [view, setView] = useState('scroll');
 

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Users</h2>

        <div className="view-switch">
          <button
            className={view === 'scroll' ? 'active' : ''}
            onClick={() => setView('scroll')}
          >
            Scroll view
          </button>
          <button
            className={view === 'pages' ? 'active' : ''}
            onClick={() => setView('pages')}
          >
            Page view
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
        {view === 'scroll' ? <UsersTable /> : <PaginatedTable />}
      </div>
    </div>
  );
}

export default UsersPage;