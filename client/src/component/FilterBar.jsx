import {useEffect, useState} from "react";
import {fetchCities} from "../api/users";

function FilterBar({filters, onChange}){
    const [cities, setCities] = useState([]);

    useEffect(() => {
        fetchCities()
          .then(setCities)
          .catch(() => setCities([]));
    }, []);

    return(
        <div className="fiter-bar">
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

        <select
        value={filters.status}
        onChange={(e) => onChange('status', e.target.value)}
      >
        <option value="">All status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="banned">Banned</option>
      </select>
      <input
        type="number"
        min="0"
        step="1000"
        placeholder="Min revenue (₹)"
        value={filters.minRevenue}
        onChange={(e) => onChange('minRevenue', e.target.value)}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={filters.neverLoggedIn}
          onChange={(e) => onChange('neverLoggedIn', e.target.checked)}
        />
        Never logged in
      </label>
    </div>
  );
}

export default FilterBar;