import { Redirect, Stack } from "expo-router";

/** Legacy route — redirects to (staff). */
export default function AdminRedirectLayout() {
  return (
    <>
      <Redirect href={"/(staff)" as never} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
