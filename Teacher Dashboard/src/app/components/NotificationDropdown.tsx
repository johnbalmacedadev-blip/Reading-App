import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, Bell, CheckCircle, Info, Loader2, X } from "lucide-react";
import { useLanguage } from "../i18n";
import {
  teacherNotificationApi,
  type TeacherNotificationItem,
} from "../api/client";

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { t, auto, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await teacherNotificationApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unread_count);
    } catch {
      // Keep the last successfully loaded state when a background refresh fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (isOpen) {
      void loadNotifications();
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, loadNotifications]);

  const markAsRead = async (id: number) => {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.read) return;

    setNotifications((items) =>
      items.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await teacherNotificationApi.markRead(id);
    } catch {
      void loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((items) => items.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);

    try {
      await teacherNotificationApi.markAllRead();
    } catch {
      void loadNotifications();
    }
  };

  const dismiss = async (id: number) => {
    const target = notifications.find((notification) => notification.id === id);
    setNotifications((items) => items.filter((notification) => notification.id !== id));
    if (target && !target.read) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    try {
      await teacherNotificationApi.dismiss(id);
    } catch {
      void loadNotifications();
    }
  };

  const openNotification = async (notification: TeacherNotificationItem) => {
    await markAsRead(notification.id);
    setIsOpen(false);
    if (notification.url) {
      navigate(notification.url);
    }
  };

  const getIcon = (type: TeacherNotificationItem["type"]) => {
    if (type === "success") return <CheckCircle className="w-5 h-5" style={{ color: "#8cbf22" }} />;
    if (type === "warning") return <AlertCircle className="w-5 h-5" style={{ color: "#ff5757" }} />;
    return <Info className="w-5 h-5" style={{ color: "#38b6ff" }} />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="p-3 rounded-xl relative cursor-pointer"
        style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
        aria-label={`${t("notif.title")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      >
        <Bell className="w-5 h-5" style={{ color: "#004aad" }} />
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-xs"
            style={{ background: "#ff5757", color: "#ffffff" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#dff3ff" }}>
            <h3 className="text-lg" style={{ color: "#004aad" }}>{t("notif.title")}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="text-sm cursor-pointer"
                style={{ color: "#38b6ff" }}
              >
                {t("notif.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2" style={{ color: "#004aad" }}>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("common.loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center" style={{ color: "#64748b" }}>
                <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
                <p>{t("notif.none")}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  role={notification.url ? "button" : undefined}
                  tabIndex={notification.url ? 0 : undefined}
                  onClick={() => void openNotification(notification)}
                  onKeyDown={(event) => {
                    if (notification.url && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      void openNotification(notification);
                    }
                  }}
                  className="p-4 border-b transition-colors hover:bg-sky-50"
                  style={{
                    borderColor: "#dff3ff",
                    background: notification.read ? "#ffffff" : "#eef9ff",
                    cursor: notification.url ? "pointer" : "default",
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold" style={{ color: "#004aad" }}>
                          {auto(notification.title)}
                        </h4>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void dismiss(notification.id);
                          }}
                          className="flex-shrink-0 p-1 rounded hover:bg-white cursor-pointer"
                          aria-label="Dismiss notification"
                        >
                          <X className="w-4 h-4" style={{ color: "#64748b" }} />
                        </button>
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#334155" }}>
                        {auto(notification.message)}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs" style={{ color: "#64748b" }}>
                          {relativeTime(notification.created_at, lang)}
                        </span>
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void markAsRead(notification.id);
                            }}
                            className="text-xs cursor-pointer"
                            style={{ color: "#38b6ff" }}
                          >
                            {t("notif.markRead")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(value: string, lang: "fr" | "en") {
  const timestamp = new Date(value).getTime();
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  const months = Math.round(days / 30);
  return formatter.format(months, "month");
}
