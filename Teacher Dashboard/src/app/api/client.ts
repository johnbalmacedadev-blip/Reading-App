const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
  role: string;
  initials: string;
  school: { id: number; name: string; city: string | null } | null;
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
  login: (email: string, password: string) =>
    apiRequest<{ user: AuthUser }>("/api/login", {
      method: "POST",
      json: { email, password },
    }),
  logout: () =>
    apiRequest<{ message: string }>("/api/logout", { method: "POST" }),
  user: () => apiRequest<{ user: AuthUser | null }>("/api/user"),
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
        students: ClassStudent[];
      };
    }>(`/api/teacher/classes/${classId}`),
  getStudent: (studentId: number | string) =>
    apiRequest<{
      student: {
        id: number;
        name: string;
        class_id: number;
        school_year: string;
      };
    }>(`/api/teacher/students/${studentId}`),
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
  addStudent: (
    classId: number | string,
    payload: { first_name: string; last_name: string }
  ) =>
    apiRequest<{ student: ClassStudent }>(`/api/teacher/classes/${classId}/students`, {
      method: "POST",
      json: payload,
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
  status: string;
  since: string;
};

export type AdminTeacherPayload = {
  title?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_id: number;
  school_board: string;
  account_status: string;
  started_at?: string;
};

export const adminTeachersApi = {
  list: () => apiRequest<{ teachers: AdminTeacherRecord[] }>("/api/admin/teachers"),
  schools: () => apiRequest<{ schools: AdminSchool[] }>("/api/admin/teachers/schools"),
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
};
