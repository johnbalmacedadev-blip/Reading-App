import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  BookOpen,
  FileText,
  BarChart3,
  User,
  LogOut,
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  Edit,
  Book,
  GraduationCap,
  Settings,
} from "lucide-react";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { LangToggle } from "../components/LangToggle";
import { useLanguage } from "../i18n";

export function ProfilePage() {
  const navigate = useNavigate();
  const { t, auto } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "Gisèle",
    lastName: "Martineau",
    email: "g.martineau@ecole.ca",
    phone: "(514) 555-0123",
    school: "École Laurier",
    grade: "1re année",
    startDate: "Septembre 2018",
  });

  const [searchParams] = useSearchParams();
  const isSchoolPortal = searchParams.get("portal") === "school";

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

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#dff3ff" }}>
      {/* Sidebar */}
      <div
        className="w-64 p-6 flex flex-col overflow-y-auto"
        style={{ background: "#ffffff", borderRight: "1px solid #dff3ff" }}
      >
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8" style={{ color: "#004aad" }} />
          <div>
            <h1 className="text-xl" style={{ color: "#004aad" }}>{t("common.appName")}</h1>
            {isSchoolPortal && (
              <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5" style={{ background: "#dff3ff", color: "#004aad", fontWeight: 600 }}>
                School Portal
              </span>
            )}
          </div>
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
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{ color: "#ff5757" }}
        >
          <LogOut className="w-5 h-5" />
          <span>{t("common.logout")}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-12 overflow-y-auto">
        {/* Header */}
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
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#38b6ff", color: "#ffffff" }}
            >
              MG
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="max-w-4xl">
          <div
            className="rounded-2xl p-8 shadow-lg mb-6"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: "#38b6ff", color: "#ffffff" }}
                >
                  MG
                </div>
                <div>
                  <h2 className="text-2xl mb-1" style={{ color: "#004aad" }}>
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-lg" style={{ color: "#000000" }}>
                    {t("profile.teacherRole")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
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
                      value={profile.firstName}
                      onChange={(e) =>
                        setProfile({ ...profile, firstName: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      style={{
                        background: "#dff3ff",
                        borderColor: "#38b6ff",
                      }}
                    />
                  ) : (
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {profile.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5" style={{ color: "#38b6ff" }} />
                    <label className="text-sm" style={{ color: "#000000" }}>
                      {t("profile.email")}
                    </label>
                  </div>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      style={{
                        background: "#dff3ff",
                        borderColor: "#38b6ff",
                      }}
                    />
                  ) : (
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {profile.email}
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.school}
                      onChange={(e) =>
                        setProfile({ ...profile, school: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      style={{
                        background: "#dff3ff",
                        borderColor: "#38b6ff",
                      }}
                    />
                  ) : (
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {auto(profile.school)}
                    </p>
                  )}
                </div>
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
                      value={profile.lastName}
                      onChange={(e) =>
                        setProfile({ ...profile, lastName: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      style={{
                        background: "#dff3ff",
                        borderColor: "#38b6ff",
                      }}
                    />
                  ) : (
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {profile.lastName}
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
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      style={{
                        background: "#dff3ff",
                        borderColor: "#38b6ff",
                      }}
                    />
                  ) : (
                    <p className="text-lg px-4 py-3" style={{ color: "#000000" }}>
                      {profile.phone}
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
                    {auto(profile.startDate)}
                  </p>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-4 mt-8 pt-8 border-t" style={{ borderColor: "#dff3ff" }}>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 rounded-xl transition-all"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dff3ff",
                    color: "#000000",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 rounded-xl transition-all"
                  style={{
                    background: "#004aad",
                    color: "#ffffff",
                  }}
                >
                  {t("profile.saveChanges")}
                </button>
              </div>
            )}
          </div>

          {/* Additional Info Card */}
          <div
            className="rounded-2xl p-8 shadow-lg"
            style={{ background: "#ffffff", border: "1px solid #dff3ff" }}
          >
            <h2 className="text-xl mb-6" style={{ color: "#004aad" }}>
              {t("profile.teachingInfo")}
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <div
                className="p-6 rounded-xl"
                style={{ background: "#dff3ff" }}
              >
                <p className="text-sm mb-2" style={{ color: "#000000" }}>
                  {t("profile.gradeLevel")}
                </p>
                <p className="text-2xl" style={{ color: "#004aad" }}>
                  {auto(profile.grade)}
                </p>
              </div>
              <div
                className="p-6 rounded-xl"
                style={{ background: "#dff3ff" }}
              >
                <p className="text-sm mb-2" style={{ color: "#000000" }}>
                  {t("profile.numClasses")}
                </p>
                <p className="text-2xl" style={{ color: "#004aad" }}>
                  1
                </p>
              </div>
              <div
                className="p-6 rounded-xl"
                style={{ background: "#dff3ff" }}
              >
                <p className="text-sm mb-2" style={{ color: "#000000" }}>
                  {t("profile.totalStudents")}
                </p>
                <p className="text-2xl" style={{ color: "#004aad" }}>
                  24
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
