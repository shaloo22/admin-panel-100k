const STATUSES = ["active", "inactive", "banned"];

export function readUrlState() {
  const p = new URLSearchParams(window.location.search);

  const status = p.get("status");
  const minRevenue = parseFloat(p.get("minRevenue"));

  return {
    page: Math.max(parseInt(p.get("page")) || 1, 1),
    sort: p.get("sort") || "id",
    order: p.get("order") === "desc" ? "desc" : "asc",
    filters: {
      search: p.get("search") || "",
      city: p.get("city") || "",
      status: STATUSES.includes(status) ? status : "",
      minRevenue:
        Number.isFinite(minRevenue) && minRevenue > 0 ? String(minRevenue) : "",
      neverLoggedIn: p.get("neverLoggedIn") === "true",
    },
  };
}

export function writeUrlState({ page, sort, order, filters }) {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", page);
  if (sort !== "id") params.set("sort", sort);
  if (order !== "asc") params.set("order", order);

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== false) params.set(key, value);
  });

  const query = params.toString();
  const url = query ? `?${query}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}
