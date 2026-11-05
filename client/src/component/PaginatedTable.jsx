import { useState, useEffect } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { exportUsersCsv, fetchUsers, updateUser } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadBlob } from '../utils/download';
import { readUrlState, writeUrlState } from '../utils/urlState';
import FilterBar from './FilterBar';
import FilterChips from './FilterChips';
import EditableText from './EditableText';
import ScooterLoader from './ScooterLoader';

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

const INITIAL_FILTERS = {
  search: '',
  city: '',
  status: '',
  minRevenue: '',
  neverLoggedIn: false,
};

function PaginatedTable() {
  const queryClient = useQueryClient();

  const [initial] = useState(readUrlState);
  const [page, setPage] = useState(initial.page);
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [order, setOrder] = useState(initial.order);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const debouncedFilters = useDebounce(filters, 300);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  };

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['users', { page, sort, order, filters: debouncedFilters }],
    queryFn: ({ signal }) =>
      fetchUsers({
        page,
        limit: 50,
        sort,
        order,
        filters: debouncedFilters,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // optimistic update
  const updateMutation = useMutation({
    mutationFn: ({ id, changes }) => updateUser(id, changes),

    onMutate: async ({ id, changes }) => {
  
      await queryClient.cancelQueries({ queryKey: ['users'] });


      const snapshots = queryClient.getQueriesData({ queryKey: ['users'] });

      queryClient.setQueriesData({ queryKey: ['users'] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((user) =>
            user.id === id ? { ...user, ...changes } : user
          ),
        };
      });

      return { snapshots };
    },

    onError: (err, variables, context) => {
      context?.snapshots.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
      showNotice(`Update failed: ${err.message}. Changes were rolled back.`);
    },

    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleUpdate = (id, changes) => {
    updateMutation.mutate({ id, changes });
  };

  useEffect(() => {
    writeUrlState({ page, sort, order, filters });
  }, [page, sort, order, filters]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const removeFilter = (key) => updateFilter(key, INITIAL_FILTERS[key]);

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotice('Could not copy link');
    }
  };

  const pageIds = users.map((user) => user.id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && pageIds.some((id) => selectedIds.has(id));

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const hasSelection = selectedIds.size > 0;
      const blob = await exportUsersCsv({
        filters: hasSelection ? {} : filters,
        sort,
        order,
        ids: [...selectedIds],
      });
      const day = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `users-${day}.csv`);
    } catch (err) {
      showNotice(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or email..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <span>{total.toLocaleString()} records</span>
        <button onClick={handleExport} disabled={exporting}>
          {exporting
            ? 'Exporting...'
            : selectedIds.size > 0
              ? `Export ${selectedIds.size.toLocaleString()} selected`
              : 'Export CSV (max 50k)'}
        </button>
        <button className="share-btn" onClick={handleShare}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
      </div>

      <FilterBar filters={filters} onChange={updateFilter} />
      <FilterChips
        filters={filters}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <strong>{selectedIds.size.toLocaleString()} selected</strong>
          <button className="link-btn" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {isError && <p className="error">{error.message}</p>}
      {notice && <p className="notice">{notice}</p>}

      {isLoading ? (
        <ScooterLoader />
      ) : users.length === 0 ? (
        <p>No users found</p>
      ) : (
        <table className={isFetching ? 'is-fetching' : ''}>
          <thead>
            <tr>
              <th className="check-col">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={togglePage}
                  aria-label="Select all rows on this page"
                />
              </th>
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
              <tr
                key={user.id}
                className={selectedIds.has(user.id) ? 'selected-row' : ''}
              >
                <td className="check-col">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleRow(user.id)}
                    aria-label={`Select ${user.name}`}
                  />
                </td>
                <td>{user.id}</td>
                <td>
                  <EditableText
                    value={user.name}
                    onSave={(name) => handleUpdate(user.id, { name })}
                  />
                </td>
                <td>{user.email}</td>
                <td>{user.city}</td>
                <td>
                  <select
                    className={`status-select badge badge-${user.status}`}
                    value={user.status}
                    onChange={(e) =>
                      handleUpdate(user.id, { status: e.target.value })
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="banned">banned</option>
                  </select>
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