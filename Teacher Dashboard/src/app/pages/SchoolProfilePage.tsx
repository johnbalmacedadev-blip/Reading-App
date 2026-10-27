import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Edit,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { InstitutionalTrialBanner } from "../components/InstitutionalTrialBanner";
import { LangToggle } from "../components/LangToggle";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { usePortalLogout } from "../hooks/usePortalLogout";
import { useLanguage } from "../i18n";
import { schoolNavItems } from "../i18n/navHelpers";
import { ApiError, schoolProfileApi, type SchoolProfile } from "../api/client";

type ProfileForm = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function emptyPasswordFields() {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

function formatStartDate(date: string | null, lang: "fr" | "en"): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
    month: "long",
    year: "numeric",
  });
}

function profileToForm(profile: SchoolProfile): ProfileForm {
  let firstName = profile.first_name ?? "";
  let lastName = profile.last_name ?? "";
  if (!firstName && !lastName && profile.name) {
    const parts = profile.name.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }

  return {
    firstName,
    lastName,
    username: profile.email,
    phone: profile.phone ?? "",
    ...emptyPasswordFields(),
  };
}

export function SchoolProfilePage() {
  const navigate = useNavigate();
  const { t, auto, lang } = useLanguage();
  const handleLogout = usePortalLogout();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    ...emptyPasswordFields(),
  });
  const [savedForm, setSavedForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const navItems = schoolNavItems("profile", t("nav.teacherRequests"));

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { profile: data } = await schoolProfileApi.get();
      setProfile(data);
      const nextForm = profileToForm(data);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, loadProfile]);

  const handleCancel = () => {
    if (savedForm) {
      setForm(savedForm);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const changingPassword = form.newPassword.length > 0;

    if (changingPassword) {
      if (!form.currentPassword) {
        toast.error(t("profile.err.currentPassword"));
        return;
      }
      if (form.newPassword.length < 8) {
        toast.error(t("profile.err.passwordLength"));
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        toast.error(t("profile.err.passwordMismatch"));
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof schoolProfileApi.update>[0] = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.username.trim(),
        phone: form.phone.trim() || undefined,
      };

      if (changingPassword) {
        payload.current_password = form.currentPassword;
        payload.password = form.newPassword;
        payload.password_confirmation = form.confirmPassword;
      }

      const { profile: updated } = await schoolProfileApi.update(payload);
      setProfile(updated);
      const nextForm = profileToForm(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setIsEditing(false);
      await refreshUser();
      toast.success(changingPassword ? t("profile.passwordUpdated") : t("profile.updated"));
    } catch (err) {
      if (err instanceof ApiError && err.errors?.current_password?.[0]) {
        toast.error(err.errors.current_password[0]);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to save profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const { profile: updated } = await schoolProfileApi.uploadAvatar(file);
      setProfile(updated);
      await refreshUser();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo.");
      throw err;
    }
  };

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.name
    : "";
  const initials = profile?.initials ?? user?.initials ?? "??";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#dff3ff" }}>
      <aside
        style={{
          width: 220,
          background: "#ffffff",
          borderRight: "1px solid #dff3ff",
          display: "flex",
          flexDirection: "column",
          padding: "28px 16px 20px",
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={32} />
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 10,
              background: "#dff3ff",
              color: "#004aad",
            }}
          >
            School Portal
          </span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: item.active ? "#dff3ff" : "transparent",
                color: item.active ? "#004aad" : "#374151",
                fontWeight: item.active ? 600 : 400,
                fontSize: 14,
              }}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div>
          <InstitutionalTrialBanner subscriptionPath="/school/subscription" compact />
          <LangToggle />
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "#ff5757",
              fontSize: 14,
              width: "100%",
            }}
          >
            <LogOut size={16} />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {t("profile.title")}
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {t("profile.subtitle")}
            </p>
          </div>
          <UserAvatar />
        </div>

        <div className="max-w-4xl">
          {(authLoading || loading) && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin" size={28} color="#004aad" />
            </div>
          )}

          {error && !loading && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: "#fff1f2", color: "#be123c" }}>
              {error}
            </div>
          )}

          {profile && !loading && (
            <div
              className="rounded-2xl p-8 shadow-lg mb-6"
              style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-6">
                  <ProfileAvatar
                    size="lg"
                    initials={initials}
                    hasAvatar={profile.has_avatar}
                    onUpload={handleAvatarUpload}
                  />
                  <div>
                    <h2 className="text-2xl mb-1" style={{ color: "#004aad" }}>
                      {displayName}
                    </h2>
                    <p className="text-lg" style={{ color: "#000000" }}>
                      {t("profile.schoolAdminRole")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-60"
                  style={{
                    background: isEditing ? "#ffffff" : "#004aad",
                    color: isEditing ? "#004aad" : "#ffffff",
                    border: isEditing ? "1px solid #004aad" : "none",
                  }}
                >
                  <Edit className="w-5 h-5" />
                  {isEditing ? t("common.cancel") : t("common.edit")}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.firstName")}
                      </label>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border"
                        style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                      />
                    ) : (
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {profile.first_name || "—"}
                      </p>
                    )}
                  </div>

                  {profile.school && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5" style={{ color: "#38b6ff" }} />
                        <label className="text-sm" style={{ color: "#000000" }}>
                          {t("profile.school")}
                        </label>
                      </div>
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {auto(profile.school.name)}
                        {profile.school.city ? ` · ${profile.school.city}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.lastName")}
                      </label>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border"
                        style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                      />
                    ) : (
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {profile.last_name || "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.phone")}
                      </label>
                    </div>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border"
                        style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                      />
                    ) : (
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {profile.phone || "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.startDate")}
                      </label>
                    </div>
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {formatStartDate(profile.started_at, lang)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t" style={{ borderColor: "#dff3ff" }}>
                <h3 className="text-lg mb-1" style={{ color: "#004aad" }}>
                  {t("profile.loginCredentials")}
                </h3>
                <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
                  {t("profile.usernameHint")}
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.username")}
                      </label>
                    </div>
                    {isEditing ? (
                      <input
                        type="email"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border"
                        style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                        autoComplete="username"
                      />
                    ) : (
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {profile.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5" style={{ color: "#38b6ff" }} />
                      <label className="text-sm" style={{ color: "#000000" }}>
                        {t("profile.password")}
                      </label>
                    </div>
                    {!isEditing ? (
                      <p className="text-lg px-4 py-3 tracking-widest" style={{ color: "#000000" }}>
                        ••••••••
                      </p>
                    ) : (
                      <p className="text-sm px-4 py-3" style={{ color: "#6b7280" }}>
                        {t("profile.passwordHint")}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-5 h-5" style={{ color: "#38b6ff" }} />
                          <label className="text-sm" style={{ color: "#000000" }}>
                            {t("profile.currentPassword")}
                          </label>
                        </div>
                        <input
                          type="password"
                          value={form.currentPassword}
                          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border"
                          style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                          autoComplete="current-password"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-5 h-5" style={{ color: "#38b6ff" }} />
                          <label className="text-sm" style={{ color: "#000000" }}>
                            {t("profile.newPassword")}
                          </label>
                        </div>
                        <input
                          type="password"
                          value={form.newPassword}
                          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border"
                          style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                          autoComplete="new-password"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-5 h-5" style={{ color: "#38b6ff" }} />
                          <label className="text-sm" style={{ color: "#000000" }}>
                            {t("profile.confirmPassword")}
                          </label>
                        </div>
                        <input
                          type="password"
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border"
                          style={{ background: "#dff3ff", borderColor: "#38b6ff" }}
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-60 flex items-center gap-2"
                    style={{ background: "#004aad", color: "#ffffff" }}
                  >
                    {saving && <Loader2 className="animate-spin w-5 h-5" />}
                    {t("profile.saveChanges")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
