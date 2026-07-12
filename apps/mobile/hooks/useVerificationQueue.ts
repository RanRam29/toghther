export {
  useClaimProfessional,
  useMyAssignedQueue,
  useProfessionalDocuments,
  useProfessionalReview,
  useReleaseAssignment,
  useStaffRejectDocument,
  useStaffVerifyProfessional,
  useUnassignedQueue,
} from "./useSupervisorQueue";

// Legacy aliases
export {
  useStaffRejectDocument as useAdminRejectDocument,
  useStaffVerifyProfessional as useAdminVerifyProfessional,
  useUnassignedQueue as useVerificationQueue,
} from "./useSupervisorQueue";
