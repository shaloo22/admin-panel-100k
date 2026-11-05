import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Download, Info, UserCog } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { timeAgo } from '../utils/format';

const ICONS = { user_updated: UserCog, export: Download, system: Info };

function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => fetchNotifications(signal),
    refetchInterval: 15000,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
  });
  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        className="icon-btn relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                className="link-btn flex items-center gap-1 text-xs"
                onClick={() => readAll.mutate()}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">
                No notifications
              </li>
            )}
            {items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <li key={n.id}>
                  <button
                    className={`notif-item ${n.is_read ? '' : 'unread'}`}
                    onClick={() => !n.is_read && readOne.mutate(n.id)}
                  >
                    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="flex-1">
                      <span className="block text-sm">{n.message}</span>
                      <span className="block text-xs text-slate-400">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;