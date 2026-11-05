import { useState } from 'react';
import PlainTable from '../component/PlainTable';
import VirtualTable from '../component/VirtualTable';

function LabPage() {
  const [view, setView] = useState('virtual');

  return (
    <div>
      <h2 className="text-xl font-semibold">Performance Lab</h2>
      <p className="mb-2 text-sm text-slate-500">
        Plain vs virtualized table with 20,000+ rows.
      </p>

      <div className="tabs">
        <button
          className={view === 'plain' ? 'active' : ''}
          onClick={() => setView('plain')}
        >
          Plain
        </button>
        <button
          className={view === 'virtual' ? 'active' : ''}
          onClick={() => setView('virtual')}
        >
          Virtualized
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {view === 'plain' ? <PlainTable /> : <VirtualTable />}
      </div>
    </div>
  );
}

export default LabPage;