import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import { useLanguage } from "../i18n";
import {
  boardTeacherRequestsApi,
  schoolTeacherRequestsApi,
  type TeacherJoinRequest,
} from "../api/client";

type Portal = "school" | "board";

export function TeacherRequestsPanel({ portal }: { portal: Portal }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<TeacherJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const api = portal === "school" ? schoolTeacherRequestsApi : boardTeacherRequestsApi;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.list();
      setRequests(result.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (id: number) => {
    setBusyId(id);
    try {
      await api.accept(id);
      setRequests((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept request.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    try {
      await api.reject(id);
      setRequests((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: "#004aad", fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>{t("requests.title")}</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>{t("requests.subtitle")}</p>
      </div>

      {error && (
        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#004aad" }}>
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #dbeafe", borderRadius: 14, padding: 28, textAlign: "center", color: "#64748b" }}>
          <UserPlus size={28} style={{ margin: "0 auto 10px", color: "#94a3b8" }} />
          {t("requests.empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                background: "white",
                border: "1px solid #dbeafe",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{request.name}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{request.email}</div>
                {request.requested_at && (
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                    {t("requests.requestedAt")}: {new Date(request.requested_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void accept(request.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 9,
                    border: 0,
                    background: "#059669",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: busyId === request.id ? "wait" : "pointer",
                  }}
                >
                  {busyId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t("requests.accept")}
                </button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void reject(request.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 9,
                    border: "1px solid #fecdd3",
                    background: "#fff1f2",
                    color: "#be123c",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: busyId === request.id ? "wait" : "pointer",
                  }}
                >
                  <X size={14} />
                  {t("requests.reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
