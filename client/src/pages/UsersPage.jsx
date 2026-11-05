import PaginatedTable from '../component/PaginatedTable';

function UsersPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Users</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
        <PaginatedTable />
      </div>
    </div>
  );
}

export default UsersPage;