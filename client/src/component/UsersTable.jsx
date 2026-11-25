
import { useEffect, useRef, useState } from 'react';

import {
  useQuery,
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useVirtualizer } from '@tanstack/react-virtual';

import {
  Download,
  Redo2,
  Share2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';

import {
  deleteUsers,
  exportUsersCsv,
  fetchUsers,
  restoreUsers,
  updateUser,
  fetchCities,
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
const MAX_SELECT = 1000;

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

// Update cached user rows
function mapRows(old, fn) {
  if (!old?.pages) return old;

  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.map(fn),
    })),
  };
}

// Remove selected users from cached pages
function removeRows(old, ids) {
  if (!old?.pages) return old;

  const idSet = new Set(ids);

  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.filter((user) => !idSet.has(user.id)),
      total: Math.max(0, page.total - ids.length),
    })),
  };
}

function UsersTable() {
  'use no memo';

  const queryClient = useQueryClient();

  // Initial URL state
  const [initial] = useState(readUrlState);

  const [filters, setFilters] = useState(
    () => initial.filters ?? INITIAL_FILTERS
  );

  const [sort, setSort] = useState(
    () => initial.sort ?? 'id'
  );

  const [order, setOrder] = useState(
    () => initial.order ?? 'asc'
  );

  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [history, setHistory] = useState({
    past: [],
    future: [],
  });

  const parentRef = useRef(null);
  const toastTimer = useRef(null);
  const shareTimer = useRef(null);

  const debouncedFilters = useDebounce(filters, 300);

  // City dropdown
  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch users using infinite pagination
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
    queryKey: [
      ...QUERY_KEY,
      {
        sort,
        order,
        filters: debouncedFilters,
      },
    ],

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
      lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined,

    placeholderData: keepPreviousData,
  });

  // Combine all loaded pages
  const users = data?.pages.flatMap(
    (page) => page.data ?? []
  ) ?? [];

  const total = data?.pages[0]?.total ?? 0;

  // Virtual scrolling
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

  // Automatically load next page near the bottom
  useEffect(() => {
    const nearEnd =
      users.length > 0 &&
      lastIndex >= users.length - 10;

    if (
      nearEnd &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    lastIndex,
    users.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // Reset scroll position after filtering or sorting
  useEffect(() => {
    parentRef.current?.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [debouncedFilters, sort, order]);

  // Save URL state
  useEffect(() => {
    writeUrlState({
      page: 1,
      sort,
      order,
      filters,
    });
  }, [sort, order, filters]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(shareTimer.current);
    };
  }, []);

  // Toast notifications
  const showToast = (
    text,
    kind = 'info',
    canUndo = false
  ) => {
    clearTimeout(toastTimer.current);

    setToast({
      text,
      kind,
      canUndo,
    });

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  // Optimistic updates with rollback
  const change = async ({
    optimistic,
    request,
    refreshList = false,
  }) => {
    await queryClient.cancelQueries({
      queryKey: QUERY_KEY,
    });

    const snapshots = queryClient.getQueriesData({
      queryKey: QUERY_KEY,
    });

    if (optimistic) {
      queryClient.setQueriesData(
        { queryKey: QUERY_KEY },
        optimistic
      );
    }

    try {
      const result = await request();
      return result;
    } catch (err) {
      snapshots.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });

      throw err;
    } finally {
      if (refreshList) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEY,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ['stats'],
      });

      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });
    }
  };

  // Perform edit, delete, undo or redo
  const perform = (action, direction) => {
    const undoing = direction === 'undo';

    // Edit user
    if (action.type === 'edit') {
      const value = undoing
        ? action.before
        : action.after;

      return change({
        optimistic: (old) =>
          mapRows(old, (user) =>
            user.id === action.id
              ? {
                  ...user,
                  [action.field]: value,
                }
              : user
          ),

        request: () =>
          updateUser(action.id, {
            [action.field]: value,
          }),
      });
    }

    // Undo delete
    if (action.type === 'delete' && undoing) {
      return change({
        request: () => restoreUsers(action.ids),
        refreshList: true,
      });
    }

    // Delete users
    return change({
      optimistic: (old) =>
        removeRows(old, action.ids),

      request: () => deleteUsers(action.ids),

      // Refresh offset-based pagination after deletion
      refreshList: true,
    });
  };

  // Execute new action
  const runAction = async (action) => {
    if (busy) return;

    setBusy(true);

    try {
      await perform(action, 'do');

      setHistory((h) => ({
        past: [...h.past, action].slice(-50),
        future: [],
      }));

      showToast(action.label, 'info', true);
    } catch (err) {
      showToast(
        err.message || 'Operation failed',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  // Undo / redo
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
          ? {
              past: h.past.slice(0, -1),
              future: [action, ...h.future],
            }
          : {
              past: [...h.past, action],
              future: h.future.slice(1),
            }
      );

      showToast(
        `${direction === 'undo' ? 'Undone' : 'Redone'}: ${action.label}`
      );
    } catch (err) {
      showToast(
        err.message || 'Operation failed',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.target instanceof Element &&
        e.target.closest(
          'input, textarea, select, [contenteditable="true"]'
        )
      ) {
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        step('undo');
      } else if (
        key === 'y' ||
        (key === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        step('redo');
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  // Edit user
  const handleEdit = (user, field, rawValue) => {
    const after =
      field === 'email'
        ? rawValue.trim().toLowerCase()
        : rawValue;

    const before = user[field];

    if (before === after) return;

    if (field === 'email') {
      const validEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(after);

      if (!validEmail) {
        showToast('Please enter a valid email', 'error');
        return;
      }
    }

    if (field === 'name' && !after.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    const labels = {
      name: `Renamed ${before} to ${after}`,
      email: `${user.name}: email changed`,
      city: `${user.name}: city changed`,
      status: `${user.name}: status changed`,
    };

    runAction({
      type: 'edit',
      id: user.id,
      field,
      before,
      after,
      label: labels[field] || 'User updated',
    });
  };

  // Delete one user
  const handleDeleteOne = (user) => {
    const sure = window.confirm(
      `Delete ${user.name}?`
    );

    if (!sure) return;

    runAction({
      type: 'delete',
      ids: [user.id],
      label: `Deleted ${user.name}`,
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
  };

  // Delete selected users
  const handleDeleteSelected = () => {
    const ids = [...selectedIds];

    if (!ids.length || busy) return;

    if (ids.length > MAX_SELECT) {
      showToast(
        `Maximum ${MAX_SELECT} users can be deleted at once`,
        'error'
      );
      return;
    }

    const sure = window.confirm(
      `Delete ${ids.length} selected users?`
    );

    if (!sure) return;

    runAction({
      type: 'delete',
      ids,
      label: `Deleted ${ids.length} users`,
    });

    setSelectedIds(new Set());
  };

  // Selection
  const selectableIds = users
    .slice(0, MAX_SELECT)
    .map((user) => user.id);

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) =>
      selectedIds.has(id)
    );

  const someSelected =
    !allSelected && selectedIds.size > 0;

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECT) {
          showToast(
            `Maximum ${MAX_SELECT} users can be selected`,
            'error'
          );

          return prev;
        }

        next.add(id);
      }

      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(
      allSelected
        ? new Set()
        : new Set(selectableIds)
    );
  };

  // Filters
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const removeFilter = (key) => {
    updateFilter(key, INITIAL_FILTERS[key]);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const applyAiFilters = (aiFilters) => {
    setFilters({
      ...INITIAL_FILTERS,
      ...aiFilters,
    });
  };

  // Sorting
  const handleSort = (column) => {
    if (sort === column) {
      setOrder((o) =>
        o === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSort(column);
      setOrder('asc');
    }
  };

  // Share current URL
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      setCopied(true);

      clearTimeout(shareTimer.current);

      shareTimer.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      showToast(
        'Could not copy the link',
        'error'
      );
    }
  };

  // Export CSV
  const handleExport = async () => {
    if (exporting) return;

    setExporting(true);

    try {
      const hasSelection = selectedIds.size > 0;

      const blob = await exportUsersCsv({
        filters: hasSelection ? {} : filters,
        sort,
        order,
        ids: hasSelection ? [...selectedIds] : [],
      });

      const day = new Date()
        .toISOString()
        .slice(0, 10);

      downloadBlob(blob, `users-${day}.csv`);

      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });
    } catch (err) {
      showToast(
        err.message || 'Export failed',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  const lastPast =
    history.past[history.past.length - 1];

  const nextFuture = history.future[0];

  return (
    <div className="users-table">

      {/* AI filters */}
      <AiFilterBox onApply={applyAiFilters} />

      {/* Toolbar */}
      <div className="toolbar">

        <input
          className="search-input"
          type="text"
          placeholder="Search name or email..."
          value={filters.search}
          onChange={(e) =>
            updateFilter('search', e.target.value)
          }
        />

        <span>
          {total.toLocaleString()} records
        </span>

        <div className="tool-group">

          <button
            onClick={() => step('undo')}
            disabled={busy || !lastPast}
            title={
              lastPast
                ? `Undo: ${lastPast.label}`
                : 'Nothing to undo'
            }
          >
            <Undo2 size={16} />
            Undo
          </button>

          <button
            onClick={() => step('redo')}
            disabled={busy || !nextFuture}
            title={
              nextFuture
                ? `Redo: ${nextFuture.label}`
                : 'Nothing to redo'
            }
          >
            <Redo2 size={16} />
            Redo
          </button>

        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={16} />

          {exporting
            ? 'Exporting...'
            : selectedIds.size > 0
              ? `Export ${selectedIds.size} selected`
              : 'Export CSV'}
        </button>

        <button
          className="share-btn"
          onClick={handleShare}
        >
          <Share2 size={16} />

          {copied ? 'Copied!' : 'Share'}
        </button>

      </div>

      {/* Filter controls */}
      <FilterBar
        filters={filters}
        onChange={updateFilter}
      />

      <FilterChips
        filters={filters}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="selection-bar">

          <strong>
            {selectedIds.size.toLocaleString()} selected
          </strong>

          <button
            className="link-btn danger-text"
            onClick={handleDeleteSelected}
            disabled={busy}
          >
            <Trash2 size={14} />
            Delete selected
          </button>

          <button
            className="link-btn"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>

        </div>
      )}

      {/* Errors */}
      {isError && (
        <p className="error">
          {error?.message || 'Failed to load users'}
        </p>
      )}

      {/* Table */}
      <div className="ut-scroll">

        <div className="ut-inner">

          {/* Table header */}
          <div className="ut-header">

            <div>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={toggleAll}
                aria-label="Select loaded users"
              />
            </div>

            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={`ut-sortable ${col.align || ''}`}
                onClick={() => handleSort(col.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' ||
                    e.key === ' '
                  ) {
                    e.preventDefault();
                    handleSort(col.key);
                  }
                }}
              >
                {col.label}

                {sort === col.key &&
                  (order === 'asc' ? ' ▲' : ' ▼')}
              </div>
            ))}

            <div />

          </div>

          {/* Scroll container */}
          <div
            ref={parentRef}
            className="ut-body"
            style={{
              opacity: isPlaceholderData ? 0.5 : 1,
            }}
          >

            {isLoading && <ScooterLoader />}

            {!isLoading && users.length === 0 && (
              <p className="ut-empty">
                No users found
              </p>
            )}

            {/* Virtualized rows */}
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >

              {virtualItems.map((virtualRow) => {
                const user = users[virtualRow.index];

                if (!user) return null;

                return (
                  <div
                    key={user.id}
                    className={`ut-row ${
                      selectedIds.has(user.id)
                        ? 'selected'
                        : ''
                    }`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >

                    {/* Checkbox */}
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleRow(user.id)}
                        aria-label={`Select ${user.name}`}
                      />
                    </div>

                    {/* ID */}
                    <div>
                      {user.id}
                    </div>

                    {/* Name */}
                    <div>
                      <EditableText
                        value={user.name ?? ''}
                        onSave={(name) =>
                          handleEdit(user, 'name', name)
                        }
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <EditableText
                        value={user.email ?? ''}
                        onSave={(email) =>
                          handleEdit(user, 'email', email)
                        }
                      />
                    </div>

                    {/* City */}
                    <div>
                      <select
                        className="city-select"
                        value={user.city ?? ''}
                        onChange={(e) =>
                          handleEdit(
                            user,
                            'city',
                            e.target.value
                          )
                        }
                      >
                        <option value="" disabled>
                          Select city
                        </option>

                        {cities.map((city) => (
                          <option
                            key={city}
                            value={city}
                          >
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <select
                        className="status-select"
                        value={user.status ?? ''}
                        onChange={(e) =>
                          handleEdit(
                            user,
                            'status',
                            e.target.value
                          )
                        }
                      >
                        <option value="active">
                          Active
                        </option>

                        <option value="inactive">
                          Inactive
                        </option>

                        <option value="banned">
                          Banned
                        </option>
                      </select>
                    </div>

                    {/* Revenue */}
                    <div className="num">
                      {formatCurrency(user.revenue)}
                    </div>

                    {/* Created date */}
                    <div>
                      {formatDate(user.created_at)}
                    </div>

                    {/* Last login */}
                    <div>
                      {formatDate(user.last_login)}
                    </div>

                    {/* Delete */}
                    <div>
                      <button
                        className="icon-btn danger"
                        title="Delete user"
                        aria-label={`Delete ${user.name}`}
                        onClick={() => handleDeleteOne(user)}
                        disabled={busy}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                  </div>
                );
              })}

            </div>

            {isFetchingNextPage && (
              <p className="ut-loading-more">
                Loading more users...
              </p>
            )}

          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="ut-footer">

        <span>
          Showing {users.length.toLocaleString()} of{' '}
          {total.toLocaleString()} users
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
          className={`toast ${
            toast.kind === 'error'
              ? 'toast-error'
              : ''
          }`}
          role="status"
        >

          <span>{toast.text}</span>

          {toast.canUndo && (
            <button
              className="toast-btn"
              onClick={() => step('undo')}
              disabled={busy || !lastPast}
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
