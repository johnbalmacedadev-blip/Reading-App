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
  account_status?: string | null;
  affiliation_type?: string | null;
  preferred_language?: string | null;
  initials: string;
  has_avatar?: boolean;
  avatar_url?: string | null;
  school: { id: number; name: string; city: string | null } | null;
  school_board?: string | null;
  permissions?: PlatformSettings;
  resource_access?: ResourceAccessPayload;
  is_trial_only?: boolean;
  account_activated_at?: string | null;
  subscription?: {
    status: string | null;
    plan: string | null;
    billing: string | null;
    access_mode?: "trial" | "subscription" | null;
    trial_started_at?: string | null;
    trial_ends_at: string | null;
    trial_days_remaining: number;
    is_trial_active: boolean;
    is_active: boolean;
    subscription_started_at?: string | null;
    subscription_ends_at?: string | null;
    can_access_classroom: boolean;
    can_access_reports: boolean;
    can_access_portal?: boolean;
    is_registration_licensed?: boolean;
    is_institutional?: boolean;
  } | null;
};

export type TeacherSubscription = {
  status: string;
  plan: string | null;
  billing: "monthly" | "annual" | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_days_remaining: number;
  is_trial_active: boolean;
  is_active: boolean;
  is_institutional?: boolean;
  is_registration_licensed?: boolean;
  can_access_classroom: boolean;
  can_access_reports: boolean;
  tax_rate_percent: number;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  has_billing_account: boolean;
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
  completeSignup: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    school_name?: string;
    school_board?: string;
    account_type?: string;
    invite_type?: "school" | "board";
    school_id?: number;
    board_code?: string;
    plan?: string;
    billing?: "monthly" | "annual";
    amount?: string;
    due_today?: string;
    next_billing_date?: string;
    preferred_language?: "en" | "fr";
  }) =>
    apiRequest<{ message: string; user: AuthUser | null; pending_activation?: boolean }>("/api/signup/complete", {
      method: "POST",
      json: payload,
    }),
  searchSignupSchools: (q: string) =>
    apiRequest<{ schools: { id: number; name: string; city: string | null; school_board: string | null }[] }>(
      `/api/signup/schools?q=${encodeURIComponent(q)}`,
    ),
  searchSignupBoards: (q: string) =>
    apiRequest<{ boards: { id: number; name: string; code: string; region: string | null }[] }>(
      `/api/signup/school-boards?q=${encodeURIComponent(q)}`,
    ),
  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/api/forgot-password", {
      method: "POST",
      json: { email },
    }),
  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) =>
    apiRequest<{ message: string }>("/api/reset-password", {
      method: "POST",
      json: payload,
    }),
};

export const teacherSubscriptionApi = {
  get: () =>
    apiRequest<{ subscription: TeacherSubscription }>("/api/teacher/subscription"),
  checkout: (plan: "essentials" | "insights", billing: "monthly" | "annual" = "monthly") =>
    apiRequest<{ checkout_url: string }>("/api/teacher/subscription/checkout", {
      method: "POST",
      json: { plan, billing },
    }),
  confirm: (sessionId: string) =>
    apiRequest<{ subscription: TeacherSubscription; message: string }>(
      "/api/teacher/subscription/confirm",
      { method: "POST", json: { session_id: sessionId } },
    ),
  portal: () =>
    apiRequest<{ portal_url: string }>("/api/teacher/subscription/portal", {
      method: "POST",
    }),
};

export type TeacherNotificationItem = {
  id: number;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  url: string | null;
  read: boolean;
  created_at: string;
};

export const teacherNotificationApi = {
  list: () =>
    apiRequest<{ notifications: TeacherNotificationItem[]; unread_count: number }>(
      "/api/teacher/notifications",
    ),
  markRead: (id: number) =>
    apiRequest<{ notification: TeacherNotificationItem }>(
      `/api/teacher/notifications/${id}/read`,
      { method: "PATCH" },
    ),
  markAllRead: () =>
    apiRequest<{ message: string }>("/api/teacher/notifications/read-all", {
      method: "POST",
    }),
  dismiss: (id: number) =>
    apiRequest<{ message: string }>(`/api/teacher/notifications/${id}`, {
      method: "DELETE",
    }),
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
  preferred_language: "en" | "fr";
  grade_taught: string | null;
  grades_taught: string[];
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
    preferred_language?: "en" | "fr";
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

export type TeacherAtelierFile = {
  id: number;
  name: string;
  type: string;
  mime_type?: string | null;
  size: string;
};

export const teacherApi = {
  classes: () =>
    apiRequest<{
      classes: ClassSummary[];
      class_types: ClassTypeOption[];
      student_limit: StudentLimitInfo;
    }>("/api/teacher/classes"),
  classTypes: () =>
    apiRequest<{ class_types: ClassTypeOption[]; student_limit: StudentLimitInfo }>(
      "/api/teacher/class-types",
    ),
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
  deleteClass: (classId: number | string) =>
    apiRequest<{ message: string }>(`/api/teacher/classes/${classId}`, {
      method: "DELETE",
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
      student_limit: StudentLimitInfo;
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
        has_activity: boolean;
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
  deleteStudent: (studentId: number | string, classId: number | string) =>
    apiRequest<{ message: string; class_id: number }>(
      `/api/teacher/students/${studentId}?class_id=${classId}`,
      { method: "DELETE" },
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
        has_atelier_files?: boolean;
        atelier_files?: TeacherAtelierFile[];
        has_atelier_pdf?: boolean;
        atelier_pdf_name?: string | null;
      } | null;
    }>(`/api/teacher/assessments/published?atelier=${atelier}&grade=${encodeURIComponent(grade)}`),
  atelierFileUrl: (fileId: number, atelier: number, grade: string) =>
    `${API_BASE}/api/teacher/assessments/atelier-files/${fileId}/download?atelier=${atelier}&grade=${encodeURIComponent(grade)}`,
  viewAtelierFile: async (fileId: number, atelier: number, grade: string) => {
    const response = await fetch(
      `${API_BASE}/api/teacher/assessments/atelier-files/${fileId}/download?atelier=${atelier}&grade=${encodeURIComponent(grade)}`,
      { credentials: "include", headers: { Accept: "application/pdf" } },
    );
    if (!response.ok) {
      throw new Error("Unable to open PDF.");
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
  addStudent: (
    classId: number | string,
    payload: { first_name: string; last_name: string }
  ) =>
    apiRequest<{ student: ClassStudent; student_limit: StudentLimitInfo }>(
      `/api/teacher/classes/${classId}/students`,
      {
        method: "POST",
        json: payload,
      },
    ),
};

export type ClassTypeOption = {
  code: string;
  name: string;
  name_fr: string | null;
  assessment_grade: string;
};

export type StudentLimitInfo = {
  max: number | null;
  used: number;
  remaining: number | null;
  can_add: boolean;
  unlimited?: boolean;
};

export type AdminClassTypeRecord = {
  id: number;
  code: string;
  name: string;
  name_fr: string | null;
  assessment_grade: string;
  sort_order: number;
  is_active: boolean;
};

export type AdminClassTypePayload = {
  code: string;
  name: string;
  name_fr?: string | null;
  assessment_grade: string;
  sort_order?: number;
  is_active?: boolean;
};

export const adminClassTypesApi = {
  list: () =>
    apiRequest<{
      class_types: AdminClassTypeRecord[];
      max_students_per_teacher: number;
      assessment_grades: string[];
    }>("/api/admin/class-types"),
  create: (payload: AdminClassTypePayload) =>
    apiRequest<{ class_type: AdminClassTypeRecord }>("/api/admin/class-types", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminClassTypePayload) =>
    apiRequest<{ class_type: AdminClassTypeRecord }>(`/api/admin/class-types/${id}`, {
      method: "PUT",
      json: payload,
    }),
  destroy: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/class-types/${id}`, {
      method: "DELETE",
    }),
  updateLimit: (max_students_per_teacher: number) =>
    apiRequest<{ max_students_per_teacher: number; message: string }>(
      "/api/admin/class-types/limit",
      {
        method: "PUT",
        json: { max_students_per_teacher },
      },
    ),
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

export type ResourceAccessExportItem = {
  key: string;
  label: string;
  description: string;
};

export type ResourceAccessCatalogCategory = {
  id: number;
  title: string;
  color: string | null;
  resources: {
    id: number;
    title: string;
    format: string | null;
    size: string;
    has_file: boolean;
  }[];
};

export type ResourceAccessItemPayload = {
  kind: "downloadable" | "export";
  resource_key: string;
};

export type ResourceAccessPayload = {
  enabled: boolean;
  downloadable_ids?: number[];
  export_keys?: string[];
};

export type ResourceAccessGrantPayload = {
  enabled: boolean;
  items: ResourceAccessItemPayload[];
  downloadable?: ResourceAccessCatalogCategory[];
  exports?: ResourceAccessExportItem[];
  name?: string;
  resource_access_enabled?: boolean;
  message?: string;
};

export const resourceAccessApi = {
  catalog: () =>
    apiRequest<{ downloadable: ResourceAccessCatalogCategory[]; exports: ResourceAccessExportItem[] }>(
      "/api/admin/resource-access/catalog",
    ),
  teacher: (id: number) =>
    apiRequest<ResourceAccessGrantPayload>(`/api/admin/teachers/${id}/resource-access`),
  saveTeacher: (id: number, payload: { enabled: boolean; items: ResourceAccessItemPayload[] }) =>
    apiRequest<ResourceAccessGrantPayload>(`/api/admin/teachers/${id}/resource-access`, {
      method: "PUT",
      json: payload,
    }),
  school: (id: number) =>
    apiRequest<ResourceAccessGrantPayload>(`/api/admin/schools/${id}/resource-access`),
  saveSchool: (id: number, payload: { enabled: boolean; items: ResourceAccessItemPayload[] }) =>
    apiRequest<ResourceAccessGrantPayload>(`/api/admin/schools/${id}/resource-access`, {
      method: "PUT",
      json: payload,
    }),
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
  target: number;
  school: string;
  school_id: number | null;
  teacher: string;
  atelier: number;
  status: string;
  dob: string;
};

export type AdminSchool = {
  id: number;
  name: string;
  city: string | null;
  board_code: string | null;
  board: string;
};

export type AdminGradeOption = {
  value: string;
  label: string;
  label_fr: string;
  assessment_grade: string;
  target: number;
};

export type AdminStudentTeacher = {
  id: number;
  name: string;
  email: string;
  school_id: number | null;
  school: string;
  board_code: string | null;
  board: string;
};

export type AdminStudentPayload = {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade: string;
  school_id: number | null;
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

export type PlatformSettings = {
  default_language: "en" | "fr";
  date_format: string;
  number_format: "en" | "fr";
  timezone: string;
  platform_name: string;
  support_email: string;
  teacher_can_export?: boolean;
  teacher_can_edit_student?: boolean;
  school_can_manage_teachers?: boolean;
  school_can_view_board?: boolean;
  board_can_edit_schools?: boolean;
  trial_can_download_export?: boolean;
  trial_period_days?: number;
  trial_reminder_days?: number;
  trial_reminder_days_enabled?: number[];
  trial_expired_email?: boolean;
  favicon_url?: string;
  favicon_data_uri?: string | null;
  has_custom_favicon?: boolean;
  favicon_version?: string;
  platform_logo_url?: string;
  platform_logo_data_uri?: string | null;
  has_custom_platform_logo?: boolean;
  login_logo_url?: string;
  login_logo_data_uri?: string | null;
  has_custom_login_logo?: boolean;
  logo_version?: string;
};

export type BrandingPayload = {
  favicon_url: string;
  favicon_data_uri: string | null;
  has_custom_favicon: boolean;
  favicon_version: string;
  platform_logo_url: string;
  platform_logo_data_uri: string | null;
  has_custom_platform_logo: boolean;
  login_logo_url: string;
  login_logo_data_uri: string | null;
  has_custom_login_logo: boolean;
  logo_version: string;
};

export type EmailTemplateField = {
  key: string;
  label: string;
};

export type EmailTemplateCatalogItem = {
  key: string;
  label: string;
  fields: EmailTemplateField[];
};

export type EmailTemplatesPayload = {
  templates: Record<"en" | "fr", Record<string, Record<string, string>>>;
  catalog: EmailTemplateCatalogItem[];
  logo_url: string | null;
  logo_data_uri: string | null;
  has_custom_logo: boolean;
};

export const brandingApi = {
  get: () => apiRequest<BrandingPayload>("/api/branding"),
  faviconUrl: (version?: string) =>
    `${API_BASE}/api/branding/favicon${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  platformLogoUrl: (version?: string) =>
    `${API_BASE}/api/branding/logo/platform${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  loginLogoUrl: (version?: string) =>
    `${API_BASE}/api/branding/logo/login${version ? `?v=${encodeURIComponent(version)}` : ""}`,
};

export type LogoBrandingPayload = Pick<
  BrandingPayload,
  | "platform_logo_url"
  | "platform_logo_data_uri"
  | "has_custom_platform_logo"
  | "login_logo_url"
  | "login_logo_data_uri"
  | "has_custom_login_logo"
  | "logo_version"
>;

export const adminSettingsApi = {
  get: () => apiRequest<{ settings: PlatformSettings }>("/api/admin/settings"),
  update: (payload: Partial<PlatformSettings>) =>
    apiRequest<{ settings: PlatformSettings; message: string }>("/api/admin/settings", {
      method: "PUT",
      json: payload,
    }),
  getEmailTemplates: () =>
    apiRequest<EmailTemplatesPayload>("/api/admin/settings/email-templates"),
  updateEmailTemplates: (templates: EmailTemplatesPayload["templates"]) =>
    apiRequest<EmailTemplatesPayload & { message: string }>("/api/admin/settings/email-templates", {
      method: "PUT",
      json: { templates },
    }),
  uploadEmailLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiFormRequest<{
      logo_url: string;
      logo_data_uri: string | null;
      has_custom_logo: boolean;
      message: string;
    }>("/api/admin/settings/email-logo", formData);
  },
  resetEmailLogo: () =>
    apiRequest<{
      logo_url: string;
      logo_data_uri: string | null;
      has_custom_logo: boolean;
      message: string;
    }>("/api/admin/settings/email-logo", { method: "DELETE" }),
  uploadFavicon: (file: File) => {
    const formData = new FormData();
    formData.append("favicon", file);
    return apiFormRequest<BrandingPayload & { message: string }>("/api/admin/settings/favicon", formData);
  },
  resetFavicon: () =>
    apiRequest<BrandingPayload & { message: string }>("/api/admin/settings/favicon", {
      method: "DELETE",
    }),
  uploadPlatformLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiFormRequest<LogoBrandingPayload & { message: string }>(
      "/api/admin/settings/platform-logo",
      formData,
    );
  },
  resetPlatformLogo: () =>
    apiRequest<LogoBrandingPayload & { message: string }>("/api/admin/settings/platform-logo", {
      method: "DELETE",
    }),
  uploadLoginLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiFormRequest<LogoBrandingPayload & { message: string }>(
      "/api/admin/settings/login-logo",
      formData,
    );
  },
  resetLoginLogo: () =>
    apiRequest<LogoBrandingPayload & { message: string }>("/api/admin/settings/login-logo", {
      method: "DELETE",
    }),
};

export type SystemAnnouncementCategory =
  | "scheduled_maintenance"
  | "unexpected_outage"
  | "feature_release"
  | "platform_announcement";

export type SystemAnnouncementRecord = {
  id: number;
  category: SystemAnnouncementCategory;
  category_label: string;
  title: string;
  message: string;
  url: string | null;
  audience: string;
  delivered_count: number;
  published_at: string | null;
  created_by: string | null;
};

export const adminAnnouncementsApi = {
  list: () =>
    apiRequest<{
      announcements: SystemAnnouncementRecord[];
      categories: { value: SystemAnnouncementCategory; label: string }[];
    }>("/api/admin/announcements"),
  create: (payload: {
    category: SystemAnnouncementCategory;
    title: string;
    message: string;
    url?: string;
  }) =>
    apiRequest<{ announcement: SystemAnnouncementRecord; message: string }>("/api/admin/announcements", {
      method: "POST",
      json: payload,
    }),
};

export type InstitutionalAccessMode = "trial" | "subscription";

export type InstitutionalBillingNoticeType =
  | "trial_ending"
  | "trial_expired"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_cancelled"
  | "subscription_expired";

export type AdminSchoolRecord = {
  id: number;
  name: string;
  board: string;
  code?: string;
  contact_person?: string;
  city: string;
  grades: string;
  teachers: number;
  students: number;
  status: string;
  portal_username: string | null;
  portal_password: string | null;
  portal_account_status?: string | null;
  portal_email_verified_at?: string | null;
  activation_pending?: boolean;
  access_mode: InstitutionalAccessMode | null;
  access: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  is_trial_active: boolean;
  is_subscription_active: boolean;
  trial_days_remaining: number;
  can_access_portal: boolean;
  resource_access_enabled?: boolean;
};

export type AdminSchoolMemberTeacher = {
  existing_id?: number | null;
  name?: string;
  email?: string;
  password?: string;
};

export type AdminSchoolPayload = {
  name: string;
  city?: string;
  school_board: string | null;
  code?: string;
  contact_person?: string;
  grades?: string;
  portal_username: string;
  portal_password?: string;
  access_mode?: InstitutionalAccessMode;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  teachers?: AdminSchoolMemberTeacher[];
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
  get: (id: number) =>
    apiRequest<{ school: AdminSchoolRecord }>(`/api/admin/schools/${id}`),
  suggestCredentials: (name: string, school_board: string, code?: string) =>
    apiRequest<{ portal_username: string; portal_password: string; code: string }>(
      "/api/admin/schools/suggest-credentials",
      { method: "POST", json: { name, school_board, code } }
    ),
  create: (payload: AdminSchoolPayload) =>
    apiRequest<{ school: AdminSchoolRecord; emails_sent?: number; message?: string }>(
      "/api/admin/schools",
      { method: "POST", json: payload },
    ),
  update: (id: number, payload: AdminSchoolPayload) =>
    apiRequest<{ school: AdminSchoolRecord }>(`/api/admin/schools/${id}`, {
      method: "POST",
      json: payload,
    }),
  sendBillingNotice: (id: number, type: InstitutionalBillingNoticeType) =>
    apiRequest<{ school: AdminSchoolRecord; message: string }>(
      `/api/admin/schools/${id}/send-billing-notice`,
      { method: "POST", json: { type } },
    ),
  extendTrial: (id: number, days: number) =>
    apiRequest<{ school: AdminSchoolRecord; message: string }>(
      `/api/admin/schools/${id}/extend-trial`,
      { method: "POST", json: { days } },
    ),
  resendActivation: (id: number) =>
    apiRequest<{ school: AdminSchoolRecord; message: string }>(
      `/api/admin/schools/${id}/resend-activation`,
      { method: "POST" },
    ),
  activateAccount: (id: number) =>
    apiRequest<{ school: AdminSchoolRecord; message: string }>(
      `/api/admin/schools/${id}/activate-account`,
      { method: "PATCH" },
    ),
  archive: (id: number) =>
    apiRequest<{ school: AdminSchoolRecord }>(`/api/admin/schools/${id}/archive`, {
      method: "PATCH",
    }),
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/schools/${id}`, { method: "DELETE" }),
};

export const adminStudentsApi = {
  list: () => apiRequest<{ students: AdminStudentRecord[] }>("/api/admin/students"),
  schools: () =>
    apiRequest<{ schools: AdminSchool[]; grades: AdminGradeOption[] }>(
      "/api/admin/students/schools",
    ),
  teachers: (search: string) =>
    apiRequest<{ teachers: AdminStudentTeacher[] }>(
      `/api/admin/students/teachers?search=${encodeURIComponent(search)}`,
    ),
  create: (payload: AdminStudentPayload) =>
    apiRequest<{ student: AdminStudentRecord }>("/api/admin/students", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminStudentPayload) =>
    apiRequest<{ student: AdminStudentRecord }>(`/api/admin/students/${id}`, {
      method: "POST",
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
  class_types: string[];
  students: number;
  status: string;
  activation_pending: boolean;
  email_activated: boolean;
  activated_at: string | null;
  affiliation_type: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_billing: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  is_subscription_active: boolean;
  subscription_days_remaining: number;
  is_trial_active: boolean;
  trial_days_remaining: number;
  trial_ends_at: string | null;
  access: string;
  since: string;
  last_login_at: string | null;
  days_since_last_login: number | null;
  login_inactive: boolean;
  portal_username: string | null;
  portal_password: string | null;
  has_avatar: boolean;
  avatar_url: string | null;
  resource_access_enabled?: boolean;
};

export type AdminTeacherPayload = {
  title?: string | null;
  first_name: string;
  last_name: string;
  phone?: string;
  school_id: number | null;
  school_board: string | null;
  account_status: string;
  started_at?: string;
  trial_ends_at?: string | null;
  portal_username: string;
  portal_password?: string;
  class_types?: string[];
};

export const adminTeachersApi = {
  list: (params?: { search?: string; school?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.school) query.set("school", params.school);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiRequest<{ teachers: AdminTeacherRecord[] }>(
      `/api/admin/teachers${qs ? `?${qs}` : ""}`
    );
  },
  get: (id: number) =>
    apiRequest<{ teacher: AdminTeacherRecord }>(`/api/admin/teachers/${id}`),
  schools: () => apiRequest<{ schools: AdminSchool[] }>("/api/admin/teachers/schools"),
  suggestCredentials: (first_name: string, last_name: string, school_board: string) =>
    apiRequest<{ portal_username: string; portal_password: string }>(
      "/api/admin/teachers/suggest-credentials",
      { method: "POST", json: { first_name, last_name, school_board } }
    ),
  create: (payload: AdminTeacherPayload) =>
    apiRequest<{ teacher: AdminTeacherRecord; email_sent?: boolean; message?: string }>("/api/admin/teachers", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminTeacherPayload) =>
    apiRequest<{ teacher: AdminTeacherRecord }>(`/api/admin/teachers/${id}`, {
      method: "POST",
      json: payload,
    }),
  archive: (id: number) =>
    apiRequest<{ teacher: AdminTeacherRecord }>(`/api/admin/teachers/${id}/archive`, {
      method: "PATCH",
    }),
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/teachers/${id}`, { method: "DELETE" }),
  resendActivation: (id: number) =>
    apiRequest<{ teacher: AdminTeacherRecord; message: string }>(
      `/api/admin/teachers/${id}/resend-activation`,
      { method: "POST" },
    ),
  activateAccount: (id: number) =>
    apiRequest<{ teacher: AdminTeacherRecord; message: string }>(
      `/api/admin/teachers/${id}/activate-account`,
      { method: "PATCH" },
    ),
  sendBillingNotice: (id: number, type: "trial_ending" | "trial_expired") =>
    apiRequest<{ teacher: AdminTeacherRecord; message: string }>(
      `/api/admin/teachers/${id}/send-billing-notice`,
      { method: "POST", json: { type } },
    ),
  extendTrial: (id: number, days: number) =>
    apiRequest<{ teacher: AdminTeacherRecord; message: string }>(
      `/api/admin/teachers/${id}/extend-trial`,
      { method: "POST", json: { days } },
    ),
  sendInactivityNotice: (id: number, type: "inactive_reminder" | "suspension_reminder") =>
    apiRequest<{ teacher: AdminTeacherRecord; message: string }>(
      `/api/admin/teachers/${id}/send-inactivity-notice`,
      { method: "POST", json: { type } },
    ),
  avatarUrl: (teacherId: number) => `${API_BASE}/api/admin/teachers/${teacherId}/avatar`,
};

export type AdminAssessmentQuestion = {
  id?: number;
  text: string;
  options: string[];
  correct: number;
};

export type AdminAtelierFile = {
  id: number;
  name: string;
  type: string;
  mime_type?: string | null;
  size: string;
  size_bytes: number;
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
  has_atelier_files?: boolean;
  atelier_files?: AdminAtelierFile[];
  has_atelier_pdf?: boolean;
  atelier_pdf?: AdminAtelierFile | null;
  atelier_pdf_name?: string | null;
};

export type AdminAssessmentGradeOption = {
  value: string;
  label: string;
  label_fr?: string;
  assessment_grade?: string;
};

export type AdminAssessmentListResponse = {
  assessments: AdminAssessmentRecord[];
  archived: AdminAssessmentRecord[];
  summary: {
    published: number;
    drafts: number;
    archived: number;
  };
  assessment_grades?: string[];
  grade_options?: AdminAssessmentGradeOption[];
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
  clearArchived: () =>
    apiRequest<{ message: string; deleted: number }>("/api/admin/assessments/archived", { method: "DELETE" }),
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
  replaceAtelierPdf: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFormRequest<{ assessment: AdminAssessmentRecord; message: string }>(
      `/api/admin/assessments/${id}/atelier-pdf`,
      formData,
    );
  },
  atelierFileViewUrl: (assessmentId: number, fileId: number) =>
    `${API_BASE}/api/admin/assessments/${assessmentId}/atelier-files/${fileId}/view`,
  atelierFileDownloadUrl: (assessmentId: number, fileId: number) =>
    `${API_BASE}/api/admin/assessments/${assessmentId}/atelier-files/${fileId}/download`,
  viewAtelierPdf: async (assessmentId: number, fileId: number) => {
    const response = await fetch(
      `${API_BASE}/api/admin/assessments/${assessmentId}/atelier-files/${fileId}/view`,
      { credentials: "include", headers: { Accept: "application/pdf" } },
    );
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Unable to open PDF.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export type AdminSchoolBoardRecord = {
  id: number;
  name: string;
  contact_person?: string | null;
  code: string;
  schools: number;
  teachers: number;
  students: number;
  status: string;
  created: string;
  portal_username: string | null;
  portal_password: string | null;
  portal_account_status?: string | null;
  portal_email_verified_at?: string | null;
  activation_pending?: boolean;
  access_mode: InstitutionalAccessMode | null;
  access: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  is_trial_active: boolean;
  is_subscription_active: boolean;
  trial_days_remaining: number;
  can_access_portal: boolean;
};

export type AdminSchoolBoardPayload = {
  name: string;
  code: string;
  contact_person?: string | null;
  status?: string;
  portal_username: string;
  portal_password?: string;
  access_mode?: InstitutionalAccessMode;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  schools?: AdminSchoolBoardMemberSchool[];
  teachers?: AdminSchoolBoardMemberTeacher[];
};

export type AdminSchoolBoardMemberSchool = {
  temp_key?: string;
  existing_id?: number | null;
  name?: string;
  email?: string;
  password?: string;
  city?: string;
};

export type AdminSchoolBoardMemberTeacher = {
  existing_id?: number | null;
  name?: string;
  email?: string;
  password?: string;
  school_temp_key?: string | null;
  school_id?: number | null;
  class_types?: string[];
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
  get: (id: number) =>
    apiRequest<{ board: AdminSchoolBoardRecord }>(`/api/admin/school-boards/${id}`),
  suggestCredentials: (name: string, code: string) =>
    apiRequest<{ portal_username: string; portal_password: string; code: string }>(
      "/api/admin/school-boards/suggest-credentials",
      { method: "POST", json: { name, code } }
    ),
  create: (payload: AdminSchoolBoardPayload) =>
    apiRequest<{ board: AdminSchoolBoardRecord; emails_sent?: number; message?: string }>("/api/admin/school-boards", {
      method: "POST",
      json: payload,
    }),
  update: (id: number, payload: AdminSchoolBoardPayload) =>
    apiRequest<{ board: AdminSchoolBoardRecord }>(`/api/admin/school-boards/${id}`, {
      method: "POST",
      json: payload,
    }),
  sendBillingNotice: (id: number, type: InstitutionalBillingNoticeType) =>
    apiRequest<{ board: AdminSchoolBoardRecord; message: string }>(
      `/api/admin/school-boards/${id}/send-billing-notice`,
      { method: "POST", json: { type } },
    ),
  resendActivation: (id: number) =>
    apiRequest<{ board: AdminSchoolBoardRecord; message: string }>(
      `/api/admin/school-boards/${id}/resend-activation`,
      { method: "POST" },
    ),
  activateAccount: (id: number) =>
    apiRequest<{ board: AdminSchoolBoardRecord; message: string }>(
      `/api/admin/school-boards/${id}/activate-account`,
      { method: "PATCH" },
    ),
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

export type TeacherJoinRequest = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  affiliation_type: string | null;
  status: string;
  requested_at: string | null;
};

export const schoolTeacherRequestsApi = {
  list: () =>
    apiRequest<{ requests: TeacherJoinRequest[] }>("/api/school/teacher-requests"),
  accept: (id: number) =>
    apiRequest<{ request: TeacherJoinRequest; message: string }>(
      `/api/school/teacher-requests/${id}/accept`,
      { method: "PATCH" },
    ),
  reject: (id: number) =>
    apiRequest<{ message: string }>(`/api/school/teacher-requests/${id}/reject`, {
      method: "PATCH",
    }),
};

export const boardTeacherRequestsApi = {
  list: () =>
    apiRequest<{ requests: TeacherJoinRequest[] }>("/api/board/teacher-requests"),
  accept: (id: number) =>
    apiRequest<{ request: TeacherJoinRequest; message: string }>(
      `/api/board/teacher-requests/${id}/accept`,
      { method: "PATCH" },
    ),
  reject: (id: number) =>
    apiRequest<{ message: string }>(`/api/board/teacher-requests/${id}/reject`, {
      method: "PATCH",
    }),
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

export type SchoolProfile = {
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
  school: { id: number; name: string; city: string | null; board: string | null } | null;
  started_at: string | null;
  started_at_label: string | null;
};

export const schoolProfileApi = {
  get: () => apiRequest<{ profile: SchoolProfile }>("/api/school/profile"),
  update: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
  }) =>
    apiRequest<{ profile: SchoolProfile }>("/api/school/profile", {
      method: "PUT",
      json: payload,
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiFormRequest<{ profile: SchoolProfile }>("/api/school/profile/avatar", formData);
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

export type BackupRecord = {
  id: number;
  filename: string;
  type: "database" | "full";
  trigger: "manual" | "scheduled";
  size: number | null;
  size_label: string;
  status: "running" | "completed" | "failed";
  error: string | null;
  available: boolean;
  created_by: string;
  created_at: string;
  completed_at: string | null;
};

export type BackupSettings = {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week: number;
  day_of_month: number;
  backup_type: "database" | "full";
  retention_count: number;
  timezone: string;
  last_run_at: string | null;
  next_run_at: string | null;
};

export type BackupData = {
  backups: BackupRecord[];
  settings: BackupSettings;
};

export const backupApi = {
  list: () => apiRequest<BackupData>("/api/admin/backups"),
  create: (type: "database" | "full") =>
    apiRequest<{ backup: BackupRecord; message: string }>("/api/admin/backups", {
      method: "POST",
      json: { type },
    }),
  updateSettings: (settings: BackupSettings) =>
    apiRequest<{ settings: BackupSettings; message: string }>("/api/admin/backups/settings", {
      method: "PUT",
      json: {
        enabled: settings.enabled,
        frequency: settings.frequency,
        time: settings.time,
        day_of_week: settings.day_of_week,
        day_of_month: settings.day_of_month,
        backup_type: settings.backup_type,
        retention_count: settings.retention_count,
        timezone: settings.timezone,
      },
    }),
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/admin/backups/${id}`, { method: "DELETE" }),
  downloadUrl: (id: number) => `${API_BASE}/api/admin/backups/${id}/download`,
};
