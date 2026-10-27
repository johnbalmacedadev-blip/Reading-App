import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  School,
  Search,
} from "lucide-react";
import classroomPhoto from "../../imports/image-1.png";
import { BrandMark } from "../components/BrandMark";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";
import { ApiError, authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { clearSignupDraft, loadSignupDraft, saveSignupDraft } from "../signupDraft";
import { teacherHomePath } from "../utils/teacherAccess";

type InviteType = "school" | "board";

type SchoolResult = { id: number; name: string; city: string | null; school_board: string | null };
type BoardResult = { id: number; name: string; code: string; region: string | null };

export function SignupJoinPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { refreshUser } = useAuth();
  const draft = useMemo(() => loadSignupDraft(), []);
  const [form, setForm] = useState(() => draft?.form ?? null);
  const [inviteType, setInviteType] = useState<InviteType | "">(draft?.form.inviteType || "");
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [boards, setBoards] = useState<BoardResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft?.form?.email || draft.form.accountType !== "school") {
      navigate("/signup", { replace: true });
    }
  }, [draft, navigate]);

  useEffect(() => {
    if (!inviteType || query.trim().length < 2) {
      setSchools([]);
      setBoards([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (inviteType === "school") {
          const result = await authApi.searchSignupSchools(query.trim());
          if (!cancelled) setSchools(result.schools);
        } else {
          const result = await authApi.searchSignupBoards(query.trim());
          if (!cancelled) setBoards(result.boards);
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
          setBoards([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inviteType, query]);

  if (!form) return null;

  const selectedLabel =
    inviteType === "school"
      ? form.selectedSchoolName
      : inviteType === "board"
        ? form.selectedBoardName
        : "";

  const canSubmit =
    !!inviteType
    && ((inviteType === "school" && form.selectedSchoolId)
      || (inviteType === "board" && form.selectedBoardCode));

  const chooseInviteType = (type: InviteType) => {
    setInviteType(type);
    setQuery("");
    setError("");
    setForm((prev) =>
      prev
        ? {
            ...prev,
            inviteType: type,
            selectedSchoolId: null,
            selectedSchoolName: "",
            selectedBoardCode: "",
            selectedBoardName: "",
          }
        : prev,
    );
  };

  const selectSchool = (school: SchoolResult) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            inviteType: "school",
            selectedSchoolId: school.id,
            selectedSchoolName: school.name,
            schoolName: school.name,
            schoolBoard: school.school_board || prev.schoolBoard,
            selectedBoardCode: "",
            selectedBoardName: "",
          }
        : prev,
    );
    setQuery(school.name);
  };

  const selectBoard = (board: BoardResult) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            inviteType: "board",
            selectedBoardCode: board.code,
            selectedBoardName: board.name,
            schoolBoard: board.code,
            selectedSchoolId: null,
            selectedSchoolName: "",
          }
        : prev,
    );
    setQuery(board.name);
  };

  const handleSubmit = async () => {
    if (!form) return;
    if (!inviteType) {
      setError(t("signup.err.inviteType"));
      return;
    }
    if (!canSubmit) {
      setError(t("signup.err.inviteTarget"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await authApi.csrf();
      const result = await authApi.completeSignup({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
        password_confirmation: form.confirmPassword || form.password,
        school_name: form.schoolName,
        school_board: form.schoolBoard,
        account_type: "school",
        preferred_language: lang === "fr" ? "fr" : "en",
        invite_type: inviteType,
        school_id: inviteType === "school" ? form.selectedSchoolId ?? undefined : undefined,
        board_code: inviteType === "board" ? form.selectedBoardCode || undefined : undefined,
      });
      clearSignupDraft();
      await refreshUser();
      navigate(teacherHomePath(result.user), { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to submit access request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 340, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={classroomPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,74,173,0.78), rgba(0,74,173,0.85))" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 40 }}>
          <div style={{ alignSelf: "flex-start" }}>
            <BrandMark height={48} onDark />
          </div>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {t("signup.join.subtitle")}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, background: "#f8fafc", display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <LangToggle className="" />
        </div>

        <div style={{ padding: "32px 40px", maxWidth: 560, width: "100%", margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => {
              if (form) saveSignupDraft(2, form);
              navigate("/signup");
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 24 }}
          >
            <ArrowLeft size={14} /> {t("common.back")}
          </button>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#004aad", margin: "0 0 6px" }}>{t("signup.join.title")}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 22 }}>{t("signup.join.subtitle")}</p>

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {([
              { value: "school" as const, label: t("signup.join.bySchool"), icon: School },
              { value: "board" as const, label: t("signup.join.byBoard"), icon: Building2 },
            ]).map((option) => {
              const selected = inviteType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseInviteType(option.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `2px solid ${selected ? "#004aad" : "#dff3ff"}`,
                    background: selected ? "#dff3ff" : "white",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <option.icon size={18} color={selected ? "#004aad" : "#64748b"} />
                  <span style={{ flex: 1, fontWeight: selected ? 700 : 500, color: selected ? "#004aad" : "#334155" }}>{option.label}</span>
                  {selected && <Check size={16} color="#004aad" />}
                </button>
              );
            })}
          </div>

          {inviteType && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {inviteType === "school" ? t("signup.join.searchSchool") : t("signup.join.searchBoard")}
              </label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: 14, color: "#94a3b8" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={inviteType === "school" ? t("signup.join.placeholderSchool") : t("signup.join.placeholderBoard")}
                  style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, border: "1.5px solid #dff3ff", background: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {selectedLabel && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "#ecfdf5", color: "#047857", fontSize: 13, fontWeight: 600 }}>
                  {t("signup.join.selected")}: {selectedLabel}
                </div>
              )}

              <div style={{ marginTop: 10, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                {searching ? (
                  <div style={{ padding: 16, color: "#004aad", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Loader2 size={15} className="animate-spin" /> {t("common.loading")}
                  </div>
                ) : query.trim().length < 2 ? (
                  <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>{t("signup.join.minChars")}</div>
                ) : inviteType === "school" ? (
                  schools.length === 0 ? (
                    <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>{t("signup.join.noResults")}</div>
                  ) : (
                    schools.map((school) => (
                      <button
                        key={school.id}
                        type="button"
                        onClick={() => selectSchool(school)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 14px",
                          border: 0,
                          borderBottom: "1px solid #f1f5f9",
                          background: form.selectedSchoolId === school.id ? "#dff3ff" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{school.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {[school.city, school.school_board].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    ))
                  )
                ) : boards.length === 0 ? (
                  <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>{t("signup.join.noResults")}</div>
                ) : (
                  boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => selectBoard(board)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        border: 0,
                        borderBottom: "1px solid #f1f5f9",
                        background: form.selectedBoardCode === board.code ? "#dff3ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{board.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {[board.code, board.region].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !canSubmit}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              border: 0,
              background: submitting || !canSubmit ? "#94a3b8" : "#004aad",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {t("signup.join.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
