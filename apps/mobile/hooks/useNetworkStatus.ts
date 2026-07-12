import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const apply = (state: NetInfoState) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
      setChecked(true);
    };

    const unsubscribe = NetInfo.addEventListener(apply);
    void NetInfo.fetch().then(apply);

    return unsubscribe;
  }, []);

  return { isOnline, checked, isOffline: checked && !isOnline };
}
