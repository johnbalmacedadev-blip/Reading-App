import type { EvaluationStatus } from "../api/client";

export type TrackingDisplayStatus = EvaluationStatus | "unassigned";

export const EVALUATION_STATUS_COLORS = {
  passed: "#c9e265",
  adequate: "#ffde59",
  failed: "#ff5757",
  notRequired: "#b8a3d6",
  notTaken: "#d1d5db",
  unassigned: "#f3f4f6",
} as const;

export function resolveTrackingDisplayStatus(
  status: EvaluationStatus,
  hasPublishedAssessment: boolean
): TrackingDisplayStatus {
  if (!hasPublishedAssessment) return "unassigned";
  return status;
}

export function getEvaluationStatusColor(status: TrackingDisplayStatus): string {
  if (status === "unassigned") return EVALUATION_STATUS_COLORS.unassigned;
  if (status === "success") return EVALUATION_STATUS_COLORS.passed;
  if (status === "adequate") return EVALUATION_STATUS_COLORS.adequate;
  if (status === "needs-improvement") return EVALUATION_STATUS_COLORS.failed;
  if (status === "not-required") return EVALUATION_STATUS_COLORS.notRequired;
  return EVALUATION_STATUS_COLORS.notTaken;
}

export function getEvaluationStatusIcon(status: TrackingDisplayStatus): string {
  if (status === "unassigned") return "";
  if (status === "success") return "✓";
  if (status === "adequate") return "~";
  if (status === "needs-improvement") return "✗";
  if (status === "not-required") return "—";
  return "";
}

export function getEvaluationStatusTextColor(status: TrackingDisplayStatus): string {
  if (status === "needs-improvement" || status === "not-required") return "#ffffff";
  if (status === "unassigned") return "#94a3b8";
  if (status === null) return "#6b7280";
  return "#000000";
}

export function getEvaluationStatusLabelKey(status: TrackingDisplayStatus): string {
  if (status === "unassigned") return "tracking.legend.unassigned";
  if (status === "success") return "tracking.legend.passed";
  if (status === "adequate") return "tracking.legend.adequate";
  if (status === "needs-improvement") return "tracking.legend.failed";
  if (status === "not-required") return "tracking.legend.notRequired";
  return "tracking.legend.notTaken";
}

export const TRACKING_LEGEND_STATUSES: TrackingDisplayStatus[] = [
  "unassigned",
  null,
  "success",
  "adequate",
  "needs-improvement",
  "not-required",
];

export function getEvaluationStatusBorder(status: TrackingDisplayStatus): string {
  if (status === "unassigned") return "2px dashed #cbd5e1";
  if (status === null) return "2px solid #9ca3af";
  return "2px solid transparent";
}
