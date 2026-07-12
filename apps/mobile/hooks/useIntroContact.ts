import { useQuery } from "@tanstack/react-query";

import { getIntroContact } from "@/lib/api/intro";

export function useIntroContact(requestId: string | undefined) {
  return useQuery({
    queryKey: ["introContact", requestId],
    queryFn: () => getIntroContact(requestId!),
    enabled: Boolean(requestId),
  });
}
