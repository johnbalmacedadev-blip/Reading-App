import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Building,
  Calendar,
  Edit,
  Lock,
  Landmark,
  GraduationCap,
  Settings,
  Loader2,
  BookOpen,
  FileText,
  BarChart3,
  User,
  LogOut,
  Users,
  Book,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { LangToggle } from "../components/LangToggle";
import { TeacherLayout } from "../components/TeacherLayout";
import { useCollapsibleSidebar } from "../hooks/useCollapsibleSidebar";
import { useLanguage } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { teacherProfileApi, type TeacherProfile, ApiError } from "../api/client";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { UserAvatar } from "../components/UserAvatar";

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

function profileToForm(profile: TeacherProfile): ProfileForm {
  return {
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    username: profile.email,
    phone: profile.phone ?? "",
    ...emptyPasswordFields(),
  };
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { t, auto, lang } = useLanguage();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
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

  const [searchParams] = useSearchParams();
  const isSchoolPortal = searchParams.get("portal") === "school";
  const { collapsed, collapse, expand } = useCollapsibleSidebar("school-sidebar-collapsed");

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { profile: data } = await teacherProfileApi.get();
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
      const payload: Parameters<typeof teacherProfileApi.update>[0] = {
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

      const { profile: updated } = await teacherProfileApi.update(payload);
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
      const { profile: updated } = await teacherProfileApi.uploadAvatar(file);
      setProfile(updated);
      await refreshUser();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo.");
      throw err;
    }
  };

  const menuItems = isSchoolPortal ? [
    { icon: BarChart3,     label: "Overview",     active: false, path: "/school/reports" },
    { icon: GraduationCap, label: "Academics",    active: false, path: "/school/academics" },
    { icon: FileText,      label: "Assessments",  active: false, path: "/school/assessments" },
    { icon: User,          label: "Profile",      active: true,  path: "/profile?portal=school" },
    { icon: Settings,      label: "Settings",     active: false, path: "/school/settings" },
  ] : [
    { icon: Users, label: t("nav.myClasses"), active: false, path: "/dashboard" },
    { icon: Book,  label: t("nav.library"),   active: false, path: "/library" },
    { icon: BarChart3, label: t("nav.reports"), active: false, path: "/reports" },
    { icon: User,  label: t("nav.profile"),   active: true,  path: "/profile" },
  ];

  const initials = profile?.initials ?? user?.initials ?? "—";
  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : user?.name ?? "";

  if (!authLoading && !user && !isSchoolPortal) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#dff3ff" }}>
        <p style={{ color: "#004aad" }}>Please sign in to view your profile.</p>
        <button
          onClick={() => navigate("/signin")}
          className="px-6 py-3 rounded-xl"
          style={{ background: "#004aad", color: "#fff" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  const profileContent = (
    <>
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: "#004aad" }}>
              {t("profile.title")}
            </h1>
            <p className="text-lg" style={{ color: "#000000" }}>
              {t("profile.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <UserAvatar />
          </div>
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
            <>
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
                        {t("profile.teacherRole")}
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
                          {profile.first_name}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-5 h-5" style={{ color: "#38b6ff" }} />
                        <label className="text-sm" style={{ color: "#000000" }}>
                          {t("profile.school")}
                        </label>
                      </div>
                      <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                        {auto(profile.school?.name ?? "—")}
                      </p>
                    </div>

                    {profile.school_board && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="w-5 h-5" style={{ color: "#38b6ff" }} />
                          <label className="text-sm" style={{ color: "#000000" }}>
                            {t("profile.schoolBoard")}
                          </label>
                        </div>
                        <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                          {auto(profile.school_board.name)}
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
                          {profile.last_name}
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

                <div
                  className="mt-8 pt-8 border-t"
                  style={{ borderColor: "#dff3ff" }}
                >
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
                            placeholder={t("signup.passwordPlaceholder")}
                          />
                        </div>

                        <div className="col-span-2">
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
                            placeholder={t("signup.confirmPlaceholder")}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-4 mt-8 pt-8 border-t" style={{ borderColor: "#dff3ff" }}>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl transition-all disabled:opacity-60"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #dff3ff",
                        color: "#000000",
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-60"
                      style={{
                        background: "#004aad",
                        color: "#ffffff",
                      }}
                    >
                      {saving && <Loader2 className="animate-spin" size={16} />}
                      {t("profile.saveChanges")}
                    </button>
                  </div>
                )}
              </div>

              <div
                className="rounded-2xl p-8 shadow-lg"
                style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
              >
                <h2 className="text-xl mb-6" style={{ color: "#004aad" }}>
                  {t("profile.teachingInfo")}
                </h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl" style={{ background: "#dff3ff" }}>
                    <p className="text-sm mb-2" style={{ color: "#000000" }}>
                      {t("profile.gradeLevel")}
                    </p>
                    <p className="text-2xl" style={{ color: "#004aad" }}>
                      {auto(profile.grade_taught ?? "—")}
                    </p>
                  </div>
                  <div className="p-6 rounded-xl" style={{ background: "#dff3ff" }}>
                    <p className="text-sm mb-2" style={{ color: "#000000" }}>
                      {t("profile.numClasses")}
                    </p>
                    <p className="text-2xl" style={{ color: "#004aad" }}>
                      {profile.class_count}
                    </p>
                  </div>
                  <div className="p-6 rounded-xl" style={{ background: "#dff3ff" }}>
                    <p className="text-sm mb-2" style={{ color: "#000000" }}>
                      {t("profile.totalStudents")}
                    </p>
                    <p className="text-2xl" style={{ color: "#004aad" }}>
                      {profile.student_count}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
    </>
  );

  if (!isSchoolPortal) {
    return (
      <TeacherLayout activeNav="profile" contentClassName="flex-1 p-12 overflow-y-auto">
        {profileContent}
      </TeacherLayout>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      <aside
        className="flex flex-col overflow-hidden shrink-0 transition-[width,padding,opacity] duration-300 ease-in-out"
        style={{
          width: collapsed ? 0 : 256,
          background: "#ffffff",
          borderRight: collapsed ? "none" : "1px solid #dff3ff",
          padding: collapsed ? 0 : 24,
          opacity: collapsed ? 0 : 1,
        }}
        aria-hidden={collapsed}
      >
        <div className="w-64 flex flex-col overflow-y-auto min-h-full">
          <div className="flex items-center justify-between gap-2 mb-8">
            <div className="flex items-center gap-3 min-w-0">
              <BookOpen className="w-8 h-8 shrink-0" style={{ color: "#004aad" }} />
              <div>
                <h1 className="text-xl" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5" style={{ background: "#dff3ff", color: "#004aad", fontWeight: 600 }}>
                  School Portal
                </span>
              </div>
            </div>
            <button type="button" onClick={collapse} title="Hide menu" aria-label="Hide menu" className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100">
              <PanelLeftClose className="w-5 h-5" style={{ color: "#64748b" }} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: item.active ? "#dff3ff" : "transparent",
                    color: item.active ? "#004aad" : "#000000",
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <LangToggle />
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{ color: "#ff5757" }}
          >
            <LogOut className="w-5 h-5" />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {collapsed && (
          <button
            type="button"
            onClick={expand}
            title="Show menu"
            aria-label="Show menu"
            className="absolute top-4 left-4 z-20 p-2.5 rounded-xl shadow-sm hover:bg-slate-50"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <PanelLeft className="w-5 h-5" style={{ color: "#004aad" }} />
          </button>
        )}
        <div className={`flex-1 p-12 overflow-y-auto${collapsed ? " pt-14" : ""}`}>
          {profileContent}
        </div>
      </div>
    </div>
  );
}
