import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { fetchCities } from '../api/users';

function FilterBar({ filters, onChange }) {
  const [cities, setCities] = useState([]);

  // Load the city list once, for the dropdown
  useEffect(() => {
    fetchCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  return (
    <div className="fb-card">
      <div className="fb-title">
        <SlidersHorizontal size={16} />
        Filters
      </div>

      <div className="fb-grid">
        <label className="fb-field">
          <span>City</span>
          <select
            value={filters.city}
            onChange={(e) => onChange('city', e.target.value)}
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className="fb-field">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>
        </label>

        <label className="fb-field">
          <span>Min revenue (₹)</span>
          <input
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 50000"
            value={filters.minRevenue}
            onChange={(e) => onChange('minRevenue', e.target.value)}
          />
        </label>

        <label className="fb-field">
          <span>Signed up from</span>
          <input
            type="date"
            value={filters.createdFrom}
            onChange={(e) => onChange('createdFrom', e.target.value)}
          />
        </label>

        <label className="fb-field">
          <span>Signed up until</span>
          <input
            type="date"
            value={filters.createdTo}
            onChange={(e) => onChange('createdTo', e.target.value)}
          />
        </label>

        <label className="fb-toggle">
          <input
            type="checkbox"
            checked={filters.neverLoggedIn}
            onChange={(e) => onChange('neverLoggedIn', e.target.checked)}
          />
          <span>Never logged in</span>
        </label>
      </div>
    </div>
  );
}

export default FilterBar;