export type SignupStep = 1 | 2;

export type SignupFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  schoolName: string;
  schoolBoard: string;
  province: string;
  role: string;
  grades: string[];
  numStudents: string;
  accountType: "school" | "individual" | "";
  inviteType: "school" | "board" | "";
  selectedSchoolId: number | null;
  selectedSchoolName: string;
  selectedBoardCode: string;
  selectedBoardName: string;
};

export const emptySignupForm = (): SignupFormData => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  schoolName: "",
  schoolBoard: "",
  province: "Québec",
  role: "teacher",
  grades: [],
  numStudents: "",
  accountType: "individual",
  inviteType: "",
  selectedSchoolId: null,
  selectedSchoolName: "",
  selectedBoardCode: "",
  selectedBoardName: "",
});

type SignupDraft = {
  step: SignupStep;
  form: SignupFormData;
};

const STORAGE_KEY = "lecture-signup-draft";

export function loadSignupDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SignupDraft>;
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    // Legacy drafts may still have step 3 (account type) — treat as step 2.
    const rawStep = typeof parsed.step === "number" ? parsed.step : 1;
    const step: SignupStep = rawStep === 2 || rawStep === 3 ? 2 : 1;
    const form = {
      ...emptySignupForm(),
      ...parsed.form,
      grades: Array.isArray(parsed.form.grades) ? parsed.form.grades : [],
      accountType: "individual" as const,
    };
    return { step, form };
  } catch {
    return null;
  }
}

export function saveSignupDraft(step: SignupStep, form: SignupFormData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form }));
  } catch {
    // ignore quota / private mode failures
  }
}

export function clearSignupDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
