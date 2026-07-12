import { Redirect } from "expo-router";

import { useStaffRoute } from "@/hooks/useStaffRoute";

/** Entry: admin → dashboard, supervisor → verification queue. */
export default function StaffIndex() {
  const { isAdmin, isReady } = useStaffRoute();

  if (!isReady) return null;

  if (isAdmin) {
    return <Redirect href={"/(staff)/dashboard" as never} />;
  }

  return <Redirect href={"/(staff)/verification" as never} />;
}
