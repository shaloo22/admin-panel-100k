import { formatCurrency } from '../utils/format';

const CHIP_LABELS = {
  search: (v) => `Search: ${v}`,
  city: (v) => `City: ${v}`,
  status: (v) => `Status: ${v}`,
  minRevenue: (v) => `Revenue ≥ ${formatCurrency(v)}`,
  neverLoggedIn: () => 'Never logged in',
};

function FilterChips({ filters, onRemove, onClearAll }) {
  const active = Object.entries(filters).filter(
    ([, value]) => value !== '' && value !== false
  );

  if (active.length === 0) return null;

  return (
    <div className="chips">
      {active.map(([key, value]) => (
        <span className="chip" key={key}>
          {CHIP_LABELS[key](value)}
          <button
            onClick={() => onRemove(key)}
            aria-label={`Remove ${key} filter`}
          >
            ✕
          </button>
        </span>
      ))}
      <button className="link-btn" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

export default FilterChips;