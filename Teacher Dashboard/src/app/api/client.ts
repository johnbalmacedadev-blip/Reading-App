const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function avatarUrl(path: string | null | undefined, cacheKey?: number | string): string | null {
  if (!path) return null;
  const base = `${API_BASE}${path}`;
  return cacheKey ? `${base}?v=${cacheKey}` : base;
}

type ApiOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      data.errors?.email?.[0] ||
      "Une erreur est survenue.";
    throw new ApiError(message, response.status, data.errors);
  }

  return data as T;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();

  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-XSRF-TOKEN", csrfToken);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  return parseResponse<T>(response);
}

export async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}

export type AuthUser = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone?: string | null;
  role: string;
  initials: string;
  has_avatar?: boolean;
  avatar_url?: string | null;
  school: { id: number; name: string; city: string | null } | null;
  school_board?: string | null;
};

export type ClassSummary = {
  id: number;
  name: string;
  grade: string;
  school_year: string;
  student_count: number;
};

export type EvaluationStatus =
  | "success"
  | "adequate"
  | "needs-improvement"
  | "not-required"
  | null;

export type ClassStudent = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  evaluations: EvaluationStatus[];
};

export const authApi = {
  csrf: ensureCsrfCookie,
  login: (email: string, password: string, portal?: "teacher" | "school" | "admin" | "board") =>
    apiRequest<{ user: AuthUser }>("/api/login", {
      method: "POST",
      json: { email, password, ...(portal ? { portal } : {}) },
    }),
  logout: () =>
    apiRequest<{ message: string }>("/api/logout", { method: "POST" }),
  user: () => apiRequest<{ user: AuthUser | null }>("/api/user"),
};

export type TeacherProfile = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  initials: string;
  has_avatar: boolean;
  avatar_url: string | null;
  school: { id: number; name: string; city: string | null } | null;
  school_board: { code: string; name: string } | null;
  started_at: string | null;
  started_at_label: string | null;
  grade_taught: string | null;
  class_count: number;
  student_count: number;
};

export const teacherProfileApi = {
  get: () => apiRequest<{ profile: TeacherProfile }>("/api/teacher/profile"),
  update: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
  }) =>
    apiRequest<{ profile: TeacherProfile }>("/api/teacher/profile", {
      method: "PUT",
      json: payload,
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiFormRequest<{ profile: TeacherProfile }>("/api/teacher/profile/avatar", formData);
  },
  avatarUrl: (cacheKey?: number | string) => {
    const base = `${API_BASE}/api/teacher/profile/avatar`;
    return cacheKey ? `${base}?v=${cacheKey}` : base;
  },
};

export const teacherApi = {
  classes: () => apiRequest<{ classes: ClassSummary[] }>("/api/teacher/classes"),
  createClass: (payload: { name: string; grade: string; school_year?: string }) =>
    apiRequest<{ class: ClassSummary }>("/api/teacher/classes", {
      method: "POST",
      json: payload,
    }),
  updateClass: (
    classId: number | string,
    payload: { name: string; grade: string; school_year?: string }
  ) =>
    apiRequest<{ class: ClassSummary }>(`/api/teacher/classes/${classId}`, {
      method: "PUT",
      json: payload,
    }),
  classDetail: (classId: number | string) =>
    apiRequest<{
      class: {
        id: number;
        name: string;
        grade: string;
        school_year: string;
        student_count: number;
        published_workshops: boolean[];
        students: ClassStudent[];
      };
    }>(`/api/teacher/classes/${classId}`),
  getStudent: (studentId: number | string, classId?: number | string) =>
    apiRequest<{
      student: {
        id: number;
        name: string;
        grade: string;
        class_id: number;
        class_name: string;
        teacher_display: string;
        school_year: string;
        evaluations: {
          number: number;
          status: EvaluationStatus;
          comment: string | null;
          date: string | null;
          not_required: boolean;
        }[];
      };
    }>(
      `/api/teacher/students/${studentId}${classId ? `?class_id=${classId}` : ""}`
    ),
  getEvaluation: (
    studentId: number | string,
    atelierNumber: number | string,
    classId: number | string
  ) =>
    apiRequest<{
      evaluation: {
        status: EvaluationStatus;
        not_required: boolean;
        comment: string;
        responses: Record<string, unknown> | null;
      };
    }>(`/api/teacher/students/${studentId}/evaluations/${atelierNumber}?class_id=${classId}`),
  saveEvaluation: (
    studentId: number | string,
    atelierNumber: number | string,
    payload: {
      class_id: number;
      status: EvaluationStatus;
      not_required: boolean;
      comment: string;
      responses: Record<string, unknown> | null;
    }
  ) =>
    apiRequest<{
      evaluation: {
        status: EvaluationStatus;
        not_required: boolean;
        comment: string;
        responses: Record<string, unknown> | null;
      };
    }>(`/api/teacher/students/${studentId}/evaluations/${atelierNumber}`, {
      method: "PUT",
      json: payload,
    }),
  getPublishedAssessment: (atelier: number, grade: string) =>
    apiRequest<{
      assessment: {
        id: number;
        title: string;
        unit: string;
        atelier: number;
        grade: string;
        template_id: import("../evaluation/workshopTemplates").WorkshopTemplateId;
        template_draft: import("../evaluation/workshopTemplates").TemplateDraft | null;
      } | null;
    }>(`/api/teacher/assessments/published?atelier=${atelier}&grade=${encodeURIComponent(grade)}`),
  addStudent: (
    classId: number | string,
    payload: { first_name: string; last_name: string }
  ) =>
    apiRequest<{ student: ClassStudent }>(`/api/teacher/classes/${classId}/students`, {
      method: "POST",
      json: payload,
    }),
};

export type TeacherReportsData = {
  school_year: string;
  available_years: string[];
  classes: Array<{ id: number; name: string; grade: string }>;
  selected_class_id: number | null;
  summary: {
    num_classes: number;
    num_students: number;
    good_grades: number;
    satisfactory: number;
    failing: number;
    not_submitted: number;
  };
  workshop_range: Array<{ key: string; value: number }>;
  progress_over_time: Array<{ month: string; average: number }>;
  class_performance: {
    threshold: number;
    on_track: number;
    progressing: number;
    needing_support: number;
    distribution: Array<{ key: string; value: number; color: string }>;
    engaged_students: Array<{ id: number; name: string; class_id: number; atelier: number }>;
    support_students: Array<{ id: number; name: string; class_id: number; atelier: number; gap: number }>;
    all_students: Array<{ id: number; name: string; class_id: number }>;
  };
};

export const teacherReportsApi = {
  get: (params?: { school_year?: string; class_id?: number | string }) => {
    const search = new URLSearchParams();
    if (params?.school_year) search.set("school_year", params.school_year);
    if (params?.class_id) search.set("class_id", String(params.class_id));
    const query = search.toString();

    return apiRequest<TeacherReportsData>(
      `/api/teacher/reports${query ? `?${query}` : ""}`
    );
  },
};

export type TeacherAssessmentRecord = {
  id: number;
  title: string;
  unit: string;
  atelier: number;
  grade: string;
  status: "published" | "draft";
  question_count: number;
  template_id?: string | null;
  assigned_to: "all_schools" | "selected" | "not_assigned" | "board_only" | "school_only" | "teacher_only";
  ownership: "platform" | "board_copy" | "school_copy" | "teacher_copy";
  source_assessment_id: number | null;
  archived?: boolean;
  created: string;
};

export type TeacherAssessmentDetail = TeacherAssessmentRecord & {
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ id: number; text: string; options: string[]; correct: number }>;
};

export type TeacherAssessmentsData = {
  sync_source: "board" | "platform";
  can_edit: boolean;
  school_board: { code: string; name: string } | null;
  school: { id: number; name: string } | null;
  assessments: TeacherAssessmentRecord[];
  archived: TeacherAssessmentRecord[];
  summary: { total: number; published: number; drafts: number; archived: number };
};

export type TeacherAssessmentPayload = {
  title: string;
  unit?: string;
  atelier: number;
  grade: string;
  status: "Published" | "Draft";
  template_id?: string | null;
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ text: string; options: string[]; correct: number }>;
};

export const teacherAssessmentsApi = {
  list: (params?: { search?: string; grade?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.grade) query.set("grade", params.grade);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<TeacherAssessmentsData>(`/api/teacher/assessments${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) =>
    apiRequest<{ assessment: TeacherAssessmentDetail }>(`/api/teacher/assessments/${id}`),
  update: (id: number, payload: TeacherAssessmentPayload) =>
    apiRequest<{ assessment: TeacherAssessmentDetail; created_copy: boolean }>(`/api/teacher/assessments/${id}`, {
      method: "PUT",
      json: payload,
    }),
  activate: (id: number) =>
    apiRequest<{ assessment: TeacherAssessmentRecord }>(`/api/teacher/assessments/${id}/activate`, {
      method: "PATCH",
    }),
};

export type LibraryContentItem = {
  id: number;
  title: string;
  type: string;
  unit: string;
  atelier: number;
  format: string;
  size: string;
  uploaded: string;
  uploader: string;
  has_file: boolean;
  interactive_view: boolean;
  is_viewable: boolean;
};

export async function apiFormRequest<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: formData,
  });

  return parseResponse<T>(response);
}

export const contentApi = {
  list: (params?: { search?: string; type?: string; unit?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.type) query.set("type", params.type);
    if (params?.unit) query.set("unit", params.unit);
    const qs = query.toString();
    return apiRequest<{ contents: LibraryContentItem[] }>(
      `/api/admin/content${qs ? `?${qs}` : ""}`
    );
  },
  upload: (formData: FormData) =>
    apiFormRequest<{ content: LibraryContentItem }>("/api/admin/content", formData),
  update: (id: number, formData: FormData) => {
    formData.append("_method", "PUT");
    return apiFormRequest<{ content: LibraryContentItem }>(`/api/admin/content/${id}`, formData, "POST");
  },
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/content/${id}`, { method: "DELETE" }),
  downloadUrl: (id: number) => `${API_BASE}/api/admin/content/${id}/download`,
  viewUrl: (id: number) => `${API_BASE}/api/library/content/${id}/view`,
};

export const teacherLibraryApi = {
  list: () => apiRequest<{ contents: LibraryContentItem[] }>("/api/library/content"),
  get: (id: number) => apiRequest<{ content: LibraryContentItem }>(`/api/library/content/${id}`),
  viewUrl: (id: number) => `${API_BASE}/api/library/content/${id}/view`,
  downloadUrl: (id: number) => `${API_BASE}/api/library/content/${id}/download`,
  continuumDownloadUrl: () => `${API_BASE}/api/library/continuum/download`,
  downloadableCategories: () =>
    apiRequest<{ categories: DownloadableCategoryItem[] }>("/api/library/downloadable-categories"),
  downloadableDownloadUrl: (id: number) =>
    `${API_BASE}/api/library/downloadable-resources/${id}/download`,
};

export type DownloadableResourceItem = {
  id: number;
  category_id: number;
  title: string;
  format: string | null;
  size: string;
  has_file: boolean;
  sort_order: number;
};

export type DownloadableCategoryItem = {
  id: number;
  title: string;
  slug: string;
  color: string;
  sort_order: number;
  resource_count: number;
  uploaded_count: number;
  resources?: DownloadableResourceItem[];
};

export const downloadableApi = {
  listCategories: () =>
    apiRequest<{ categories: DownloadableCategoryItem[] }>("/api/admin/downloadable-categories"),
  getCategory: (id: number) =>
    apiRequest<{ category: DownloadableCategoryItem }>(`/api/admin/downloadable-categories/${id}`),
  updateCategory: (id: number, payload: { title: string; color: string }) =>
    apiRequest<{ category: DownloadableCategoryItem }>(`/api/admin/downloadable-categories/${id}`, {
      method: "PUT",
      json: payload,
    }),
  uploadResource: (categoryId: number, formData: FormData) =>
    apiFormRequest<{ resource: DownloadableResourceItem }>(
      `/api/admin/downloadable-categories/${categoryId}/resources`,
      formData
    ),
  updateResource: (id: number, formData: FormData) => {
    formData.append("_method", "PUT");
    return apiFormRequest<{ resource: DownloadableResourceItem }>(
      `/api/admin/downloadable-resources/${id}`,
      formData,
      "POST"
    );
  },
  removeResource: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/downloadable-resources/${id}`, { method: "DELETE" }),
  downloadUrl: (id: number) => `${API_BASE}/api/admin/downloadable-resources/${id}/download`,
};

export type PedagogicalLessonItem = {
  lesson_number: number;
  has_interactive: boolean;
  has_activity_sheet: boolean;
  interactive_format: string | null;
  activity_sheet_format: string | null;
  is_interactive_viewable: boolean;
};

export type PedagogicalUnitItem = {
  id: number;
  title: string;
  description: string;
  color: string;
  text_color: string;
  atelier_numbers: number[];
  atelier_count: number;
  lesson_count: number;
  sort_order: number;
  has_quick_sheet: boolean;
  quick_sheet_format: string | null;
  quick_sheet_size: string;
  lessons?: PedagogicalLessonItem[];
};

export const unitsApi = {
  list: () => apiRequest<{ units: PedagogicalUnitItem[] }>("/api/admin/units"),
  get: (id: number) => apiRequest<{ unit: PedagogicalUnitItem }>(`/api/admin/units/${id}`),
  create: (formData: FormData) =>
    apiFormRequest<{ unit: PedagogicalUnitItem }>("/api/admin/units", formData),
  update: (id: number, formData: FormData) => {
    formData.append("_method", "PUT");
    return apiFormRequest<{ unit: PedagogicalUnitItem }>(`/api/admin/units/${id}`, formData, "POST");
  },
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/units/${id}`, { method: "DELETE" }),
  updateLesson: (unitId: number, lessonNumber: number, formData: FormData) =>
    apiFormRequest<{ unit: PedagogicalUnitItem }>(
      `/api/admin/units/${unitId}/lessons/${lessonNumber}`,
      formData
    ),
  quickSheetDownloadUrl: (id: number) => `${API_BASE}/api/admin/units/${id}/quick-sheet/download`,
};

export const teacherUnitsApi = {
  list: () => apiRequest<{ units: PedagogicalUnitItem[] }>("/api/library/units"),
  get: (id: number) => apiRequest<{ unit: PedagogicalUnitItem }>(`/api/library/units/${id}`),
  quickSheetDownloadUrl: (id: number) => `${API_BASE}/api/library/units/${id}/quick-sheet/download`,
  interactiveViewUrl: (unitId: number, lessonNumber: number) =>
    `${API_BASE}/api/library/units/${unitId}/lessons/${lessonNumber}/interactive/view`,
  activitySheetDownloadUrl: (unitId: number, lessonNumber: number) =>
    `${API_BASE}/api/library/units/${unitId}/lessons/${lessonNumber}/activity-sheet/download`,
};

export type AdminStudentRecord = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  grade: string;
  school: string;
  school_id: number;
  teacher: string;
  atelier: number;
  status: string;
  dob: string;
};

export type AdminSchool = {
  id: number;
  name: string;
  city: string | null;
};

export type AdminStudentPayload = {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade: string;
  school_id: number;
  teacher_name: string;
  current_atelier: number;
  status: string;
};

export type AdminDashboardData = {
  school_year: string;
  kpis: {
    school_boards: { total: number; delta_month: number };
    schools: { total: number; delta_month: number };
    teachers: { total: number; delta_month: number };
    students: { total: number; delta_month: number };
  };
  adoption_by_board: Array<{
    code: string;
    name: string;
    active_teachers: number;
    total_teachers: number;
  }>;
  student_growth: Array<{ month: string; students: number }>;
  growth_percent_year: number;
  recent_activity: Array<{
    id: number;
    type: string;
    category: string;
    action: string;
    target: string;
    time: string;
  }>;
  alerts: Array<{ type: string; message: string }>;
  health: {
    api_availability: string;
    avg_response_ms: number;
    storage_used_percent: number;
  };
};

export const adminDashboardApi = {
  get: (schoolYear?: string) => {
    const query = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : "";
    return apiRequest<AdminDashboardData>(`/api/admin/dashboard${query}`);
  },
};

export type AuditLogEntry = {
  id: number;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  category: string;
  target: string;
  ip: string;
  severity: "info" | "warning" | "critical";
};

export type AuditLogData = {
  entries: AuditLogEntry[];
  summary: { total: number; critical: number; warning: number; info: number };
};

export const auditApi = {
  list: (params?: { search?: string; category?: string; severity?: string; date_range?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.date_range) query.set("date_range", params.date_range);
    const qs = query.toString();
    return apiRequest<AuditLogData>(`/api/admin/audit${qs ? `?${qs}` : ""}`);
  },
  exportUrl: (params?: { search?: string; category?: string; severity?: string; date_range?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.date_range) query.set("date_range", params.date_range);
    const qs = query.toString();
    return `${API_BASE}/api/admin/audit/export${qs ? `?${qs}` : ""}`;
  },
};

export type SchoolYearRecord = {
  id: number;
  label: string;
  is_default: boolean;
};

export type SchoolYearsData = {
  school_years: SchoolYearRecord[];
  default_label: string;
};

export const schoolYearsApi = {
  list: () => apiRequest<SchoolYearsData>("/api/school-years"),
};

export const adminSchoolYearsApi = {
  list: () => apiRequest<SchoolYearsData>("/api/admin/school-years"),
  create: (payload: { label: string; is_default?: boolean }) =>
    apiRequest<{ school_year: SchoolYearRecord; default_label: string }>("/api/admin/school-years", {
      method: "POST",
      json: payload,
    }),
  setDefault: (id: number) =>
    apiRequest<{ school_year: SchoolYearRecord; default_label: string }>(`/api/admin/school-years/${id}/default`, {
      method: "PATCH",
    }),
};

export type AdminSchoolRecord = {
  id: number;
  name: string;
  board: string;
  city: string;
  grades: string;
  teachers: number;
  students: number;
  status: string;
  portal_username: string | null;
  portal_password: string | null;
};

export type AdminSchoolPayload = {
  name: string;
  city: string;
  school_board: string | null;
  grades?: string;
  portal_username: string;
  portal_password?: string;
};

export const adminSchoolsApi = {
  list: (params?: { search?: string; board?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.board) query.set("board", params.board);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<{ schools: AdminSchoolRecord[] }>(
      `/api/admin/schools${qs ? `?${qs}` : ""}`
    );
  },
  suggestCredentials: (name: string, school_board: string) =>
    apiRequest<{ portal_username: string; portal_password: string }>(
      "/api/admin/schools/suggest-credentials",
      { method: "POST", json: { name, school_board } }
    ),
  create: (payload: AdminSchoolPayload) =>
    apiRequest<{ school: AdminSchoolRecord }>("/api/admin/schools", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminSchoolPayload) =>
    apiRequest<{ school: AdminSchoolRecord }>(`/api/admin/schools/${id}`, {
      method: "PUT",
      json: payload,
    }),
  archive: (id: number) =>
    apiRequest<{ school: AdminSchoolRecord }>(`/api/admin/schools/${id}/archive`, {
      method: "PATCH",
    }),
};

export const adminStudentsApi = {
  list: () => apiRequest<{ students: AdminStudentRecord[] }>("/api/admin/students"),
  schools: () => apiRequest<{ schools: AdminSchool[] }>("/api/admin/students/schools"),
  create: (payload: AdminStudentPayload) =>
    apiRequest<{ student: AdminStudentRecord }>("/api/admin/students", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminStudentPayload) =>
    apiRequest<{ student: AdminStudentRecord }>(`/api/admin/students/${id}`, {
      method: "PUT",
      json: payload,
    }),
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/students/${id}`, { method: "DELETE" }),
};

export type AdminTeacherRecord = {
  id: number;
  name: string;
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  school: string;
  school_id: number;
  board: string;
  classes: number;
  students: number;
  status: string;
  since: string;
  portal_username: string | null;
  portal_password: string | null;
  has_avatar: boolean;
  avatar_url: string | null;
};

export type AdminTeacherPayload = {
  title?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  school_id: number | null;
  school_board: string | null;
  account_status: string;
  started_at?: string;
  portal_username: string;
  portal_password?: string;
};

export const adminTeachersApi = {
  list: () => apiRequest<{ teachers: AdminTeacherRecord[] }>("/api/admin/teachers"),
  schools: () => apiRequest<{ schools: AdminSchool[] }>("/api/admin/teachers/schools"),
  suggestCredentials: (first_name: string, last_name: string, school_board: string) =>
    apiRequest<{ portal_username: string; portal_password: string }>(
      "/api/admin/teachers/suggest-credentials",
      { method: "POST", json: { first_name, last_name, school_board } }
    ),
  create: (payload: AdminTeacherPayload) =>
    apiRequest<{ teacher: AdminTeacherRecord }>("/api/admin/teachers", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminTeacherPayload) =>
    apiRequest<{ teacher: AdminTeacherRecord }>(`/api/admin/teachers/${id}`, {
      method: "PUT",
      json: payload,
    }),
  archive: (id: number) =>
    apiRequest<{ teacher: AdminTeacherRecord }>(`/api/admin/teachers/${id}/archive`, {
      method: "PATCH",
    }),
  avatarUrl: (teacherId: number) => `${API_BASE}/api/admin/teachers/${teacherId}/avatar`,
};

export type AdminAssessmentQuestion = {
  id?: number;
  text: string;
  options: string[];
  correct: number;
};

export type AdminAssessmentRecord = {
  id: number;
  title: string;
  unit: string;
  atelier: number;
  grade: string;
  questions: AdminAssessmentQuestion[];
  status: "Published" | "Draft";
  created: string;
  template_id?: string | null;
  template_draft?: import("../evaluation/workshopTemplates").TemplateDraft | null;
  archived_at?: string | null;
  is_archived?: boolean;
  has_student_completions?: boolean;
};

export type AdminAssessmentListResponse = {
  assessments: AdminAssessmentRecord[];
  archived: AdminAssessmentRecord[];
  summary: {
    published: number;
    drafts: number;
    archived: number;
  };
};

export type AdminAssessmentPayload = {
  title: string;
  unit?: string;
  atelier: number;
  grade: string;
  status: "Published" | "Draft";
  questions: AdminAssessmentQuestion[];
  template_id?: string | null;
  template_draft?: import("../evaluation/workshopTemplates").TemplateDraft | null;
};

export const adminAssessmentsApi = {
  list: (params?: { search?: string; grade?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.grade) query.set("grade", params.grade);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<AdminAssessmentListResponse>(
      `/api/admin/assessments${qs ? `?${qs}` : ""}`
    );
  },
  create: (payload: AdminAssessmentPayload) =>
    apiRequest<{ assessment: AdminAssessmentRecord }>("/api/admin/assessments", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminAssessmentPayload) =>
    apiRequest<{ assessment: AdminAssessmentRecord }>(`/api/admin/assessments/${id}`, {
      method: "PUT",
      json: payload,
    }),
  remove: (id: number) =>
    apiRequest<{ message: string; can_archive?: boolean }>(`/api/admin/assessments/${id}`, { method: "DELETE" }),
  archive: (id: number) =>
    apiRequest<{ assessment: AdminAssessmentRecord; message: string }>(`/api/admin/assessments/${id}/archive`, {
      method: "PATCH",
    }),
  restore: (id: number) =>
    apiRequest<{ assessment: AdminAssessmentRecord; message: string }>(`/api/admin/assessments/${id}/restore`, {
      method: "PATCH",
    }),
  duplicate: (id: number) =>
    apiRequest<{ assessment: AdminAssessmentRecord }>(`/api/admin/assessments/${id}/duplicate`, {
      method: "POST",
    }),
};

export type AdminSchoolBoardRecord = {
  id: number;
  name: string;
  code: string;
  schools: number;
  teachers: number;
  students: number;
  status: string;
  created: string;
  portal_username: string | null;
  portal_password: string | null;
};

export type AdminSchoolBoardPayload = {
  name: string;
  code: string;
  status?: string;
  portal_username: string;
  portal_password?: string;
};

export const adminSchoolBoardsApi = {
  list: (params?: { search?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return apiRequest<{ boards: AdminSchoolBoardRecord[] }>(
      `/api/admin/school-boards${query ? `?${query}` : ""}`
    );
  },
  suggestCredentials: (name: string, code: string) =>
    apiRequest<{ portal_username: string; portal_password: string }>(
      "/api/admin/school-boards/suggest-credentials",
      { method: "POST", json: { name, code } }
    ),
  create: (payload: AdminSchoolBoardPayload) =>
    apiRequest<{ board: AdminSchoolBoardRecord }>("/api/admin/school-boards", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminSchoolBoardPayload) =>
    apiRequest<{ board: AdminSchoolBoardRecord }>(`/api/admin/school-boards/${id}`, {
      method: "PUT",
      json: payload,
    }),
  archive: (id: number) =>
    apiRequest<{ board: AdminSchoolBoardRecord }>(`/api/admin/school-boards/${id}/archive`, {
      method: "PATCH",
    }),
};

export type SchoolReportClass = {
  id: number;
  name: string;
  grade: string;
  raw_grade: string;
  teacher: string;
  students: number;
  on_track: number;
};

export type SchoolReportGradeBenchmark = {
  grade: string;
  on_track: number;
  class_count: number;
  student_count: number;
};

export type SchoolReportSkill = {
  num: number;
  subject: string;
  color: string;
  score: number;
};

export type SchoolReportAtRiskStudent = {
  id: number;
  name: string;
  class_name: string;
  teacher: string;
  initials: string;
};

export type SchoolReportsData = {
  school: { id: number; name: string; school_board: { code: string; name: string } | null };
  school_year: string | null;
  available_years: string[];
  summary: {
    total_students: number;
    total_classes: number;
    on_track_average: number;
  };
  grade_benchmarks: SchoolReportGradeBenchmark[];
  skills: SchoolReportSkill[];
  classes: SchoolReportClass[];
  at_risk_students: SchoolReportAtRiskStudent[];
};

export const schoolReportsApi = {
  get: (schoolYear?: string) => {
    const params = new URLSearchParams();
    if (schoolYear) params.set("school_year", schoolYear);
    const query = params.toString();

    return apiRequest<SchoolReportsData>(
      `/api/school/reports${query ? `?${query}` : ""}`
    );
  },
};

export type SchoolAcademicsStudent = {
  id: number;
  name: string;
  class_name: string;
  grade: string;
  teacher: string;
  atelier: number;
  en_voie: boolean;
};

export type SchoolAcademicsTeacher = {
  id: number;
  name: string;
  grade: string;
  classes: string[];
  students: number;
  avg_atelier: number;
  en_voie: number;
};

export type SchoolAcademicsData = {
  school: { id: number; name: string; school_board: { code: string; name: string } | null };
  school_year: string | null;
  available_years: string[];
  grades: string[];
  students: SchoolAcademicsStudent[];
  teachers: SchoolAcademicsTeacher[];
  summary: { student_count: number; teacher_count: number };
};

export const schoolAcademicsApi = {
  get: (schoolYear?: string) => {
    const params = new URLSearchParams();
    if (schoolYear) params.set("school_year", schoolYear);
    const query = params.toString();
    return apiRequest<SchoolAcademicsData>(`/api/school/academics${query ? `?${query}` : ""}`);
  },
};

export type SchoolAssessmentRecord = {
  id: number;
  title: string;
  unit: string;
  atelier: number;
  grade: string;
  status: "published" | "draft";
  question_count: number;
  template_id?: string | null;
  assigned_to: "all_schools" | "selected" | "not_assigned" | "board_only" | "school_only";
  ownership: "platform" | "board_copy" | "school_copy";
  source_assessment_id: number | null;
  archived?: boolean;
  created: string;
};

export type SchoolAssessmentDetail = SchoolAssessmentRecord & {
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ id: number; text: string; options: string[]; correct: number }>;
};

export type SchoolAssessmentsData = {
  sync_source: "board" | "platform";
  can_edit: boolean;
  school_board: { code: string; name: string } | null;
  assessments: SchoolAssessmentRecord[];
  archived: SchoolAssessmentRecord[];
  summary: { total: number; published: number; drafts: number; archived: number };
};

export type SchoolAssessmentPayload = {
  title: string;
  unit?: string;
  atelier: number;
  grade: string;
  status: "Published" | "Draft";
  template_id?: string | null;
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ text: string; options: string[]; correct: number }>;
};

export const schoolAssessmentsApi = {
  list: (params?: { search?: string; grade?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.grade) query.set("grade", params.grade);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<SchoolAssessmentsData>(`/api/school/assessments${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) =>
    apiRequest<{ assessment: SchoolAssessmentDetail }>(`/api/school/assessments/${id}`),
  update: (id: number, payload: SchoolAssessmentPayload) =>
    apiRequest<{ assessment: SchoolAssessmentDetail; created_copy: boolean }>(`/api/school/assessments/${id}`, {
      method: "PUT",
      json: payload,
    }),
  activate: (id: number) =>
    apiRequest<{ assessment: SchoolAssessmentRecord }>(`/api/school/assessments/${id}/activate`, {
      method: "PATCH",
    }),
};

export type BoardDashboardSchool = {
  id: number;
  name: string;
  city: string;
  students: number;
  teachers: number;
  on_track: number;
  monitor: number;
  at_risk: number;
  trend: string;
};

export type BoardDashboardData = {
  board: { code: string; name: string };
  school_year: string;
  available_years: string[];
  summary: {
    participating_schools: number;
    total_students: number;
    active_teachers: number;
    avg_on_track: number;
    latest_trend?: number;
  };
  success_rate_by_month: Array<{ month: string; rate: number }>;
  results_by_grade: Array<{ grade_key: string; board: number; provincial: number }>;
  schools: BoardDashboardSchool[];
};

export const boardDashboardApi = {
  get: (schoolYear?: string) => {
    const params = new URLSearchParams();
    if (schoolYear) params.set("school_year", schoolYear);
    const query = params.toString();
    return apiRequest<BoardDashboardData>(`/api/board/dashboard${query ? `?${query}` : ""}`);
  },
};

export type BoardReportsSchool = {
  id: number;
  name: string;
  city: string;
  students: number;
  on_track: number;
  monitor: number;
  at_risk: number;
};

export type BoardReportsClass = {
  id: number;
  name: string;
  grade: string;
  teacher: string;
  students: number;
  on_track: number;
};

export type BoardReportsStudent = {
  id: number;
  name: string;
  grade: string;
  current_atelier: number;
  status: "on_track" | "monitor" | "at_risk";
};

export type BoardReportsData = {
  board: { code: string; name: string };
  school_year: string;
  available_years: string[];
  summary: {
    participating_schools: number;
    total_students: number;
    avg_on_track: number;
    latest_trend: number;
  };
  success_rate_by_month: Array<{ month: string; rate: number }>;
  grade_benchmarks: Array<{
    grade_key: string;
    target_atelier: number;
    avg_completed: number;
    student_count: number;
  }>;
  schools: BoardReportsSchool[];
  school: BoardReportsSchool | null;
  classes: BoardReportsClass[];
  students: BoardReportsStudent[];
};

export const boardReportsApi = {
  get: (params?: { school_year?: string; school_id?: number; class_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.school_year) query.set("school_year", params.school_year);
    if (params?.school_id) query.set("school_id", String(params.school_id));
    if (params?.class_id) query.set("class_id", String(params.class_id));
    const qs = query.toString();
    return apiRequest<BoardReportsData>(`/api/board/reports${qs ? `?${qs}` : ""}`);
  },
};

export type BoardProfile = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  initials: string;
  has_avatar: boolean;
  avatar_url: string | null;
  school_board: { code: string; name: string } | null;
  started_at: string | null;
  started_at_label: string | null;
};

export const boardProfileApi = {
  get: () => apiRequest<{ profile: BoardProfile }>("/api/board/profile"),
  update: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
  }) =>
    apiRequest<{ profile: BoardProfile }>("/api/board/profile", {
      method: "PUT",
      json: payload,
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiFormRequest<{ profile: BoardProfile }>("/api/board/profile/avatar", formData);
  },
};

export type BoardAssessmentRecord = {
  id: number;
  title: string;
  unit: string;
  atelier: number;
  grade: string;
  status: "published" | "draft";
  question_count: number;
  template_id?: string | null;
  assigned_to: "all_schools" | "selected" | "not_assigned" | "board_only";
  ownership: "platform" | "board_copy";
  source_assessment_id: number | null;
  archived?: boolean;
  created: string;
};

export type BoardAssessmentsData = {
  assessments: BoardAssessmentRecord[];
  archived: BoardAssessmentRecord[];
  summary: { total: number; published: number; drafts: number; archived: number };
};

export type BoardAssessmentDetail = BoardAssessmentRecord & {
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ id: number; text: string; options: string[]; correct: number }>;
};

export type BoardAssessmentPayload = {
  title: string;
  unit?: string;
  atelier: number;
  grade: string;
  status: "Published" | "Draft";
  template_id?: string | null;
  template_draft?: Record<string, unknown> | null;
  questions: Array<{ text: string; options: string[]; correct: number }>;
};

export const boardAssessmentsApi = {
  list: (params?: { search?: string; grade?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.grade) query.set("grade", params.grade);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<BoardAssessmentsData>(`/api/board/assessments${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) =>
    apiRequest<{ assessment: BoardAssessmentDetail }>(`/api/board/assessments/${id}`),
  update: (id: number, payload: BoardAssessmentPayload) =>
    apiRequest<{ assessment: BoardAssessmentDetail; created_copy: boolean }>(`/api/board/assessments/${id}`, {
      method: "PUT",
      json: payload,
    }),
  activate: (id: number) =>
    apiRequest<{ assessment: BoardAssessmentRecord }>(`/api/board/assessments/${id}/activate`, {
      method: "PATCH",
    }),
};
