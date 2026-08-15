export const PRIVACY_REQUEST_TYPES = [
  "access",
  "portability",
  "erasure",
  "restriction",
  "objection",
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  "submitted",
  "identity_verification",
  "in_progress",
  "completed",
  "refused",
  "withdrawn",
] as const;

export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REQUEST_LABELS: Record<PrivacyRequestType, string> = {
  access: "Access my personal data",
  portability: "Receive a portable copy",
  erasure: "Delete my account and eligible data",
  restriction: "Restrict how my data is used",
  objection: "Object to a use of my data",
};

export const PRIVACY_STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  submitted: "Submitted",
  identity_verification: "Identity check required",
  in_progress: "In progress",
  completed: "Completed",
  refused: "Refused with explanation",
  withdrawn: "Withdrawn",
};

export function isActivePrivacyRequest(status: PrivacyRequestStatus): boolean {
  return ["submitted", "identity_verification", "in_progress"].includes(status);
}
