import { useCallback, useState } from "react";
import * as Notifications from "expo-notifications";

import { PushPermissionModal } from "@/components/shared/PushPermissionModal";
import {
  registerForPushNotificationsAsync,
} from "@/lib/push-notifications";

let globalPrompt: ((userId: string) => Promise<void>) | null = null;

/** Imperative D22 prompt with dedicated modal (used from match flow). */
export async function promptPushPermission(userId: string): Promise<void> {
  if (globalPrompt) {
    return globalPrompt(userId);
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") {
    await registerForPushNotificationsAsync(userId, true);
  }
}

export function PushPermissionProvider() {
  const [visible, setVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolver, setResolver] = useState<(() => void) | null>(null);

  const openPrompt = useCallback((id: string) => {
    return new Promise<void>((resolve) => {
      setUserId(id);
      setResolver(() => resolve);
      setVisible(true);
    });
  }, []);

  globalPrompt = async (id: string) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      await registerForPushNotificationsAsync(id, true);
      return;
    }
    await openPrompt(id);
  };

  async function handleConfirm() {
    if (!userId) return;
    setLoading(true);
    try {
      await registerForPushNotificationsAsync(userId, false);
    } finally {
      setLoading(false);
      setVisible(false);
      resolver?.();
      setResolver(null);
    }
  }

  function handleCancel() {
    setVisible(false);
    resolver?.();
    setResolver(null);
  }

  return (
    <PushPermissionModal
      visible={visible}
      title="התראות"
      body="כדי שלא תפספסו בקשות, אישורים וסיכומים יומיים — נשמח להרשאת התראות."
      confirmLabel="הפעלת התראות"
      cancelLabel="לא עכשיו"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
