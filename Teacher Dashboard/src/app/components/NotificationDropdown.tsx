import { useMemo, useRef, useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import type { TranslationKey } from "../i18n";
import { useLanguage } from "../i18n";

interface Notification {
  id: number;
  type: "success" | "warning" | "info";
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  timeKey: TranslationKey;
  read: boolean;
}

const notificationDefs: Omit<Notification, "read">[] = [
  { id: 1, type: "success", titleKey: "notif.workshopDone", messageKey: "notif.workshopDoneMsg", timeKey: "notif.time2h" },
  { id: 2, type: "info", titleKey: "notif.newReport", messageKey: "notif.newReportMsg", timeKey: "notif.time5h" },
  { id: 3, type: "warning", titleKey: "notif.workshopReminder", messageKey: "notif.workshopReminderMsg", timeKey: "notif.time1d" },
  { id: 4, type: "info", titleKey: "notif.systemUpdate", messageKey: "notif.systemUpdateMsg", timeKey: "notif.time2d" },
  { id: 5, type: "success", titleKey: "notif.studentAdded", messageKey: "notif.studentAddedMsg", timeKey: "notif.time3d" },
];

export function NotificationDropdown() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set([3, 4, 5]));
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () =>
      notificationDefs
        .filter((n) => !hiddenIds.has(n.id))
        .map((n) => ({ ...n, read: readIds.has(n.id) })),
    [readIds, hiddenIds]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = (id: number) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadIds(new Set(notificationDefs.map((n) => n.id)));
  };

  const deleteNotification = (id: number) => {
    setHiddenIds((prev) => new Set([...prev, id]));
  };

  const getIcon = (type: "success" | "warning" | "info") => {
    if (type === "success") return <CheckCircle className="w-5 h-5" style={{ color: "#c9e265" }} />;
    if (type === "warning") return <AlertCircle className="w-5 h-5" style={{ color: "#ff5757" }} />;
    return <Info className="w-5 h-5" style={{ color: "#38b6ff" }} />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-xl relative"
        style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
      >
        <Bell className="w-5 h-5" style={{ color: "#004aad" }} />
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ background: "#ff5757", color: "#ffffff" }}
          >
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl z-50"
          style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#dff3ff" }}>
            <h3 className="text-lg" style={{ color: "#004aad" }}>
              {t("notif.title")}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-sm" style={{ color: "#38b6ff" }}>
                {t("notif.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center" style={{ color: "#000000" }}>
                <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: "#dff3ff" }} />
                <p>{t("notif.none")}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b hover:bg-opacity-50 transition-all"
                  style={{
                    borderColor: "#dff3ff",
                    background: notification.read ? "#ffffff" : "#dff3ff",
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm" style={{ color: "#004aad" }}>
                          {t(notification.titleKey)}
                        </h4>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-white transition-all"
                        >
                          <X className="w-4 h-4" style={{ color: "#000000" }} />
                        </button>
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#000000" }}>
                        {t(notification.messageKey)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "#000000", opacity: 0.6 }}>
                          {t(notification.timeKey)}
                        </span>
                        {!notification.read && (
                          <button onClick={() => markAsRead(notification.id)} className="text-xs" style={{ color: "#38b6ff" }}>
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

          {notifications.length > 0 && (
            <div className="p-3 border-t text-center" style={{ borderColor: "#dff3ff" }}>
              <button className="text-sm" style={{ color: "#38b6ff" }}>
                {t("notif.viewAll")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
