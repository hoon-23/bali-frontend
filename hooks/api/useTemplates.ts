import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { TemplateCategory, TemplateItem } from "../../store/templatesStore";

export type ApiTemplate = {
  id: string;
  category: TemplateCategory;
  name: string;
  items: TemplateItem[];
};

export type CreateTemplatePayload = {
  category: TemplateCategory;
  name: string;
  items: Omit<TemplateItem, "id">[];
};

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiClient.get<ApiTemplate[]>("/api/v1/templates")).data,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: async () => (await apiClient.get<ApiTemplate>(`/api/v1/templates/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) =>
      (await apiClient.post<ApiTemplate>("/api/v1/templates", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
