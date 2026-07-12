import { useCallback, useEffect, useState } from "react";

import { getAdminAssuranceLevel, isMfaRequiredError } from "@/lib/admin-mfa";

export function useAdminMfa(enabled: boolean) {
  const [needsMfa, setNeedsMfa] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNeedsMfa(false);
      return;
    }
    try {
      const { currentLevel, nextLevel } = await getAdminAssuranceLevel();
      setNeedsMfa(nextLevel === "aal2" && currentLevel !== "aal2");
    } catch {
      setNeedsMfa(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleRpcError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    if (isMfaRequiredError(message)) {
      setShowModal(true);
      setNeedsMfa(true);
      return true;
    }
    return false;
  }

  function onVerified() {
    setNeedsMfa(false);
    void refresh();
  }

  return {
    needsMfa,
    showModal,
    setShowModal,
    handleRpcError,
    onVerified,
    refresh,
  };
}
