import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fetchUsers } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency, formatDate } from '../utils/format';
import { readUrlState, writeUrlState } from '../utils/urlState';
import AiFilterBox from './AiFilterBox';
import FilterBar from './FilterBar';
import FilterChips from './FilterChips';
import ScooterLoader from './ScooterLoader';
import StatusBadge from './StatusBadge';

const ROW_HEIGHT = 44;
const PAGE_SIZE = 50;

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

function UsersTable() {
  // The virtualizer does not work with React Compiler, so we turn it off here
  'use no memo';

  const [initial] = useState(readUrlState);
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [order, setOrder] = useState(initial.order);
  const [copied, setCopied] = useState(false);

  const debouncedFilters = useDebounce(filters, 300);
  const parentRef = useRef(null);

  // Load pages one by one. "pageParam" is the page number we ask the server for.
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
    queryKey: ['users-infinite', { sort, order, filters: debouncedFilters }],
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
      // Copy can fail if the browser blocks it, nothing else to do
    }
  };

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

      {isError && <p className="error">{error.message}</p>}

      {/* Header row */}
      <div className="ut-header">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`ut-sortable ${col.align || ''}`}
            onClick={() => handleSort(col.key)}
          >
            {col.label} {sort === col.key && (order === 'asc' ? '▲' : '▼')}
          </div>
        ))}
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

            return (
              <div
                key={user.id}
                className="ut-row"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div>{user.id}</div>
                <div>{user.name}</div>
                <div>{user.email}</div>
                <div>{user.city}</div>
                <div>
                  <StatusBadge status={user.status} />
                </div>
                <div className="num">{formatCurrency(user.revenue)}</div>
                <div>{formatDate(user.created_at)}</div>
                <div>{formatDate(user.last_login)}</div>
              </div>
            );
          })}
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
    </div>
  );
}

export default UsersTable;