const API_URL = "http://localhost:4000";

export async function fetchNotifications(signal) {
  const res = await fetch(`${API_URL}/api/notifications`, { signal });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to update notifications");
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to update notification");
  return res.json();
}
