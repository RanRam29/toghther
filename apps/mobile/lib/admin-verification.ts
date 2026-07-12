/** Runbook checklist keys — all required before approve (S-ADM-02). */
export const VERIFICATION_CHECKLIST_KEYS = [
  "id_matches_name",
  "criminal_record_valid",
  "certificate_recognized",
  "profile_photo_ok",
  "bio_no_contact",
] as const;

export type VerificationChecklistKey =
  (typeof VERIFICATION_CHECKLIST_KEYS)[number];

export type VerificationChecklistState = Record<
  VerificationChecklistKey,
  boolean
>;

export function emptyChecklistState(): VerificationChecklistState {
  return {
    id_matches_name: false,
    criminal_record_valid: false,
    certificate_recognized: false,
    profile_photo_ok: false,
    bio_no_contact: false,
  };
}

export function isChecklistComplete(
  state: VerificationChecklistState,
): boolean {
  return VERIFICATION_CHECKLIST_KEYS.every((key) => state[key]);
}

export type SlaLevel = "green" | "yellow" | "red";

/** SLA from submission time (`updated_at`): green <1d, yellow 1–2d, red >2d. */
export function getSlaLevel(submittedAt: string): SlaLevel {
  const submitted = new Date(submittedAt).getTime();
  const days = (Date.now() - submitted) / (1000 * 60 * 60 * 24);
  if (days < 1) return "green";
  if (days <= 2) return "yellow";
  return "red";
}

export interface BioHighlightSegment {
  text: string;
  flagged: boolean;
}

const CONTACT_PATTERN =
  /(?:\+?972|0)[\s.-]?(?:5[0-9]|7[0-9])[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{2,3}[\s.-]?\d{7}\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

export function highlightBioContactPatterns(bio: string): BioHighlightSegment[] {
  const segments: BioHighlightSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(CONTACT_PATTERN.source, CONTACT_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bio)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: bio.slice(lastIndex, match.index),
        flagged: false,
      });
    }
    segments.push({ text: match[0], flagged: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < bio.length) {
    segments.push({ text: bio.slice(lastIndex), flagged: false });
  }

  return segments.length > 0 ? segments : [{ text: bio, flagged: false }];
}

export function bioHasContactPatterns(bio: string | null | undefined): boolean {
  if (!bio?.trim()) return false;
  return new RegExp(CONTACT_PATTERN.source, CONTACT_PATTERN.flags).test(bio);
}
