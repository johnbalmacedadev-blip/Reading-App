export type SignupStep = 1 | 2 | 3;

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
  accountType: "",
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
    const step = parsed.step === 2 || parsed.step === 3 ? parsed.step : 1;
    return {
      step,
      form: { ...emptySignupForm(), ...parsed.form, grades: Array.isArray(parsed.form.grades) ? parsed.form.grades : [] },
    };
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
