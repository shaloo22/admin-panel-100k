const API_URL = "http://localhost:4000";

export async function fetchUsers({
  page = 1,
  limit = 50,
  search = "",
  sort = "id",
  order = "asc",
} = {}) {
  const params = new URLSearchParams({ page, limit, sort, order });
  if (search) params.set("search", search);

  const res = await fetch(`${API_URL}/api/users?${params}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchManyUsers(count = 20000) {
  const res = await fetch(`${API_URL}/api/users/all?count=${count}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}
