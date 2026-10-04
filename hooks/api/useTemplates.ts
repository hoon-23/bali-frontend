import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { TemplateCategory, TemplateItem } from "../../store/templatesStore";

export type ApiTemplate = {
  id: string;
  category: TemplateCategory;
  name: string;
  items: TemplateItem[];
  // 이 루틴으로 마지막으로 "완료"한 세션의 날짜(YYYY-MM-DD). 완료 이력이 없으면 null.
  // 구버전 서버 응답에는 없을 수 있어 optional.
  lastUsedAt?: string | null;
};

export type CreateTemplatePayload = {
  category: TemplateCategory;
  name: string;
  items: Omit<TemplateItem, "id">[];
};

// PUT은 항상 items 전체를 다시 보내야 하므로, 기존 템플릿의 items를 payload
// 형태(id 제거, sortOrder 재계산)로 변환하는 공용 헬퍼.
export function toItemsPayload(items: TemplateItem[]): CreateTemplatePayload["items"] {
  return items.map(({ id, ...rest }, index) => ({ ...rest, sortOrder: index }));
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiClient.get<ApiTemplate[]>("/api/v1/templates")).data,
  });
}

export function useTemplate(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: async () => (await apiClient.get<ApiTemplate>(`/api/v1/templates/${id}`)).data,
    enabled: !!id && (options?.enabled ?? true),
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

// 템플릿 전체 교체(PUT) — 운동 목록 스와이프 수정/삭제, + 버튼 추가 모두 이걸로 저장한다.
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateTemplatePayload }) =>
      (await apiClient.put<ApiTemplate>(`/api/v1/templates/${id}`, payload)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["templates", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// 소프트 삭제 — 복구 API가 없으므로 되돌릴 수 없다. 과거 세션 기록은 생성 시점에
// 스냅샷으로 저장돼 있어 영향 없지만, 세션 카드 제목이 템플릿 이름 대신
// 첫 종목 이름 기반으로 폴백될 수 있다(백엔드 확인).
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/templates/${id}`);
    },
    onSuccess: (_, id) => {
      // 삭제된 상세는 재조회하면 404이므로 캐시에서 제거하고,
      // 목록 쿼리만 exact로 무효화해 상세 쿼리가 refetch되지 않게 한다.
      queryClient.removeQueries({ queryKey: ["templates", id] });
      queryClient.invalidateQueries({ queryKey: ["templates"], exact: true });
    },
  });
}
