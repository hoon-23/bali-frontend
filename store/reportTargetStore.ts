import { create } from "zustand";

export type ReportTargetView = "weekly" | "monthly";

// 인사이트 푸시·알림으로 리포트 탭에 들어올 때 열 보기(주간/월간)를 리포트 화면에 넘기는 일회성 요청.
// 라우트 파라미터는 이미 떠 있는 탭 화면에 갱신되지 않거나(dismissTo) 탭 스택을 중복으로 쌓아서(navigate) 쓰지 않는다.
// 리포트 탭은 처음 열릴 때 마운트되므로(콜드 스타트), 화면이 소비할 때까지 값을 들고 있는다.
type ReportTargetState = {
  target: ReportTargetView | null;
  request: (view: ReportTargetView) => void;
  consume: () => void;
};

export const useReportTargetStore = create<ReportTargetState>((set) => ({
  target: null,
  request: (view) => set({ target: view }),
  consume: () => set({ target: null }),
}));
