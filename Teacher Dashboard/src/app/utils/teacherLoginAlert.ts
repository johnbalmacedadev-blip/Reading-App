export function loginAlertPendingKey(userId: number | undefined) {
  return `lecture-login-alert-pending-${userId ?? "guest"}`;
}

export function markTeacherLoginAlertPending(userId: number) {
  try {
    sessionStorage.setItem(loginAlertPendingKey(userId), "1");
  } catch {
    // ignore
  }
}

export function clearTeacherLoginAlertPending(userId: number | undefined) {
  try {
    sessionStorage.removeItem(loginAlertPendingKey(userId));
  } catch {
    // ignore
  }
}
