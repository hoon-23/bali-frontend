import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export function usePrivacyPolicy() {
  return useQuery({
    queryKey: ["legal", "privacy-policy"],
    queryFn: async () => {
      const { data } = await apiClient.get<string>("/api/v1/legal/privacy-policy", {
        responseType: "text",
      });
      return data;
    },
  });
}
