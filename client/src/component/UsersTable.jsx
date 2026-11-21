import { useEffect, useRef, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Download, Redo2, Share2, Trash2, Undo2, X } from 'lucide-react';
import {
  deleteUsers,
  exportUsersCsv,
  fetchUsers,
  restoreUsers,
  updateUser,
} from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadBlob } from '../utils/download';
import { readUrlState, writeUrlState } from '../utils/urlState';
import AiFilterBox from './AiFilterBox';
import EditableText from './EditableText';
import FilterBar from './FilterBar';
import FilterChips from './FilterChips';
import ScooterLoader from './ScooterLoader';

const ROW_HEIGHT = 44;
const PAGE_SIZE = 50;
const MAX_SELECT = 1000; // the server deletes at most 1000 ids per request
const QUERY_KEY = ['users-infinite'];

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'revenue', label: 'Revenue', align: 'num' },
  { key: 'created_at', label: 'Created' },
  { key: 'last_login', label: 'Last login' },
];

const INITIAL_FILTERS = {
  search: '',
  city: '',
  status: '',
  minRevenue: '',
  neverLoggedIn: false,
  createdFrom: '',
  createdTo: '',
};

// Change every row inside the cached pages
function mapRows(old, fn) {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({ ...page, data: page.data.map(fn) })),
  };
}

// Remove rows from the cached pages (used for an instant delete)
function removeRows(old, ids) {
  if (!old?.pages) return old;
  const idSet = new Set(ids);
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.filter((user) => !idSet.has(user.id)),
      total: Math.max(page.total - ids.length, 0),
    })),
  };
}

function UsersTable() {
  // The virtualizer does not work with React Compiler, so we turn it off here
  'use no memo';

  const queryClient = useQueryClient();

  const [initial] = useState(readUrlState);
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [order, setOrder] = useState(initial.order);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState({ past: [], future: [] });

  const debouncedFilters = useDebounce(filters, 300);
  const parentRef = useRef(null);
  const toastTimer = useRef(null);

  // ----- Loading data (infinite scroll) -----

  const {
    data,
    isLoading,
    isPlaceholderData,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: [...QUERY_KEY, { sort, order, filters: debouncedFilters }],
    queryFn: ({ pageParam, signal }) =>
      fetchUsers({
        page: pageParam,
        limit: PAGE_SIZE,
        sort,
        order,
        filters: debouncedFilters,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  // Join all loaded pages into one long list
  const users = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // The virtualizer only creates the rows that are visible on screen
  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastIndex = virtualItems.length
    ? virtualItems[virtualItems.length - 1].index
    : -1;

  // When the user scrolls close to the end, ask for the next page
  useEffect(() => {
    const nearEnd = lastIndex >= users.length - 10;
    if (nearEnd && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [lastIndex, users.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Go back to the top when filters or sorting change
  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [debouncedFilters, sort, order]);

  // Keep the filters in the URL so the link can be shared
  useEffect(() => {
    writeUrlState({ page: 1, sort, order, filters });
  }, [sort, order, filters]);

  // Stop the toast timer when the page is closed
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ----- Toast (small message at the bottom) -----

  const showToast = (text, kind = 'info', canUndo = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind, canUndo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  // ----- Changing data: instant update, then server, rollback if it fails -----

  const change = async ({ optimistic, request, refreshList = false }) => {
    // Stop running fetches, they could overwrite our instant update
    await queryClient.cancelQueries({ queryKey: QUERY_KEY });

    // Keep a copy of the old data so we can go back if the server says no
    const snapshots = queryClient.getQueriesData({ queryKey: QUERY_KEY });

    if (optimistic) {
      queryClient.setQueriesData({ queryKey: QUERY_KEY }, optimistic);
    }

    try {
      await request();
    } catch (err) {
      snapshots.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
      throw err;
    } finally {
      // Reloading every loaded page is slow, so we only do it when we must
      if (refreshList) queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  // Run one action forward ("do" or "redo") or backward ("undo")
  const perform = (action, direction) => {
    const undoing = direction === 'undo';

    if (action.type === 'edit') {
      const value = undoing ? action.before : action.after;
      return change({
        optimistic: (old) =>
          mapRows(old, (user) =>
            user.id === action.id ? { ...user, [action.field]: value } : user
          ),
        request: () => updateUser(action.id, { [action.field]: value }),
      });
    }

    // action.type === 'delete'
    if (undoing) {
      // We do not have the row data here, so the rows come back after a reload
      return change({
        request: () => restoreUsers(action.ids),
        refreshList: true,
      });
    }
    return change({
      optimistic: (old) => removeRows(old, action.ids),
      request: () => deleteUsers(action.ids),
    });
  };

  // A brand new action (edit or delete by the user)
  const runAction = async (action) => {
    if (busy) return;
    setBusy(true);
    try {
      await perform(action, 'do');
      // A new action clears the redo list
      setHistory((h) => ({ past: [...h.past, action].slice(-50), future: [] }));
      showToast(action.label, 'info', true);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Undo or redo the last action
  const step = async (direction) => {
    const action =
      direction === 'undo'
        ? history.past[history.past.length - 1]
        : history.future[0];
    if (!action || busy) return;

    setBusy(true);
    try {
      await perform(action, direction);
      setHistory((h) =>
        direction === 'undo'
          ? { past: h.past.slice(0, -1), future: [action, ...h.future] }
          : { past: [...h.past, action], future: h.future.slice(1) }
      );
      showToast(`${direction === 'undo' ? 'Undone' : 'Redone'}: ${action.label}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Ctrl+Z = undo, Ctrl+Y or Ctrl+Shift+Z = redo.
  // No dependency list on purpose, so the handler always sees the latest history.
  useEffect(() => {
    const onKeyDown = (e) => {
      // Do not take over Ctrl+Z while the user is typing in a field
      if (e.target.closest('input, textarea, select')) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        step('undo');
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        step('redo');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // ----- Edit and delete handlers -----

  const handleEdit = (user, field, after) => {
    const before = user[field];
    if (before === after) return;

    runAction({
      type: 'edit',
      id: user.id,
      field,
      before,
      after,
      label:
        field === 'name'
          ? `Renamed ${before} to ${after}`
          : `${user.name}: status ${before} to ${after}`,
    });
  };

  const handleDeleteOne = (user) => {
    runAction({ type: 'delete', ids: [user.id], label: `Deleted ${user.name}` });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const sure = window.confirm(
      `Delete ${ids.length} selected user(s)? You can undo this.`
    );
    if (!sure) return;

    runAction({ type: 'delete', ids, label: `Deleted ${ids.length} users` });
    setSelectedIds(new Set());
  };

  // ----- Selection -----

  const selectableIds = users.slice(0, MAX_SELECT).map((user) => user.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && selectedIds.size > 0;

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  // ----- Filters, sort, share, export -----

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key) => updateFilter(key, INITIAL_FILTERS[key]);

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const applyAiFilters = (aiFilters) => {
    setFilters({ ...INITIAL_FILTERS, ...aiFilters });
  };

  const handleSort = (column) => {
    if (sort === column) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('asc');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Rows selected: export exactly those. Otherwise export everything that matches the filters.
      const hasSelection = selectedIds.size > 0;
      const blob = await exportUsersCsv({
        filters: hasSelection ? {} : filters,
        sort,
        order,
        ids: [...selectedIds],
      });
      const day = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `users-${day}.csv`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const lastPast = history.past[history.past.length - 1];
  const nextFuture = history.future[0];

  return (
    <div>
      <AiFilterBox onApply={applyAiFilters} />

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or email..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <span>{total.toLocaleString()} records</span>

        <div className="tool-group">
          <button
            onClick={() => step('undo')}
            disabled={busy || !lastPast}
            title={lastPast ? `Undo: ${lastPast.label}` : 'Nothing to undo'}
          >
            <Undo2 size={16} strokeWidth={1.75} /> Undo
          </button>
          <button
            onClick={() => step('redo')}
            disabled={busy || !nextFuture}
            title={nextFuture ? `Redo: ${nextFuture.label}` : 'Nothing to redo'}
          >
            <Redo2 size={16} strokeWidth={1.75} /> Redo
          </button>
        </div>

        <button onClick={handleExport} disabled={exporting}>
          <Download size={16} strokeWidth={1.75} />
          {exporting
            ? 'Exporting...'
            : selectedIds.size > 0
              ? `Export ${selectedIds.size.toLocaleString()} selected`
              : 'Export CSV'}
        </button>

        <button className="share-btn" onClick={handleShare}>
          <Share2 size={16} strokeWidth={1.75} />
          {copied ? 'Copied!' : 'Share'}
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
          <button className="link-btn danger-text" onClick={handleDeleteSelected}>
            <Trash2 size={14} strokeWidth={1.75} /> Delete selected
          </button>
          <button className="link-btn" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {isError && <p className="error">{error.message}</p>}
        <div className="ut-scroll">
        <div className="ut-inner">
      {/* Header row */}
      <div className="ut-header">
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
            aria-label="Select all loaded rows"
          />
        </div>
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`ut-sortable ${col.align || ''}`}
            onClick={() => handleSort(col.key)}
          >
            {col.label} {sort === col.key && (order === 'asc' ? '▲' : '▼')}
          </div>
        ))}
        <div />
      </div>

      {/* Scroll area */}
      <div
        ref={parentRef}
        className="ut-body"
        style={{ opacity: isPlaceholderData ? 0.5 : 1 }}
      >
        {isLoading && <ScooterLoader />}
        {!isLoading && users.length === 0 && (
          <p className="ut-empty">No users found</p>
        )}

        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {virtualItems.map((virtualRow) => {
            const user = users[virtualRow.index];
            if (!user) return null;

            return (
              <div
                key={user.id}
                className={`ut-row ${selectedIds.has(user.id) ? 'selected' : ''}`}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleRow(user.id)}
                    aria-label={`Select ${user.name}`}
                  />
                </div>
                <div>{user.id}</div>
                <div>
                  <EditableText
                    value={user.name}
                    onSave={(name) => handleEdit(user, 'name', name)}
                  />
                </div>
                <div>{user.email}</div>
                <div>{user.city}</div>
                <div>
                  <select
                    className={`status-select badge badge-${user.status}`}
                    value={user.status}
                    onChange={(e) => handleEdit(user, 'status', e.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="banned">banned</option>
                  </select>
                </div>
                <div className="num">{formatCurrency(user.revenue)}</div>
                <div>{formatDate(user.created_at)}</div>
                <div>{formatDate(user.last_login)}</div>
                <div>
                  <button
                    className="icon-btn danger"
                    title="Delete user"
                    aria-label={`Delete ${user.name}`}
                    onClick={() => handleDeleteOne(user)}
                  >
                    <Trash2 size={17} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
         </div>
      </div>

      <div className="ut-footer">
        <span>
          Showing {users.length.toLocaleString()} of {total.toLocaleString()} users
        </span>
        <span>
          {isFetchingNextPage
            ? 'Loading more...'
            : !hasNextPage && users.length > 0
              ? 'End of list'
              : ''}
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`toast ${toast.kind === 'error' ? 'toast-error' : ''}`}
          role="status"
        >
          <span>{toast.text}</span>
          {toast.canUndo && (
            <button
              className="toast-btn"
              onClick={() => step('undo')}
              disabled={busy}
            >
              Undo
            </button>
          )}
          <button
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Close message"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default UsersTable;