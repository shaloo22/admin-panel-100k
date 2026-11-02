const API_URL = "http://localhost:4000";

export async function fetchUsers({
  page = 1,
  limit = 50,
  sort = "id",
  order = "asc",
  filters = {},
} = {}) {
  const params = new URLSearchParams({ page, limit, sort, order });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== false && value != null) {
      params.set(key, value);
    }
  });

  const res = await fetch(`${API_URL}/api/users?${params}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchCities() {
  const res = await fetch(`${API_URL}/api/users/cities`);
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
}

export async function fetchManyUsers(count = 20000) {
  const res = await fetch(`${API_URL}/api/users/all?count=${count}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}
