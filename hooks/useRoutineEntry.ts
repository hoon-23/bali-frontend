import { useRouter } from "expo-router";

import { appAlert } from "../lib/alert";
import { useSingleTapNavigate } from "../lib/navigation/useSingleTapNavigate";
import { useTemplates } from "./api/useTemplates";

// "운동을 시작하거나 루틴을 만드는" 입구를 한곳에서 정한다.
// 루틴이 하나도 없는 사람(처음 쓰는 사람)에게 빈 루틴 목록을 한 번 거치게 하지 않고 바로 만들기로 보낸다.
// 아직 불러오는 중이면 목록으로 보낸다 — 어느 쪽이 맞는지 모르는 채로 만들기로 보내는 것이 더 나쁘다.
export function useRoutineEntry() {
  const router = useRouter();
  const { data: templates } = useTemplates();
  const noRoutines = templates !== undefined && templates.length === 0;

  // 홈·기록의 빈 화면 버튼: 루틴이 없으면 첫 루틴 만들기, 있으면 루틴 목록.
  const openRoutines = useSingleTapNavigate(() => router.push(noRoutines ? "/routines/new" : "/routines"));

  // 기록 탭의 +: 루틴이 있으면 "시작"과 "만들기" 중 고르게 한다. 두 번 눌러서 만들기에 닿는다(예전엔 세 번).
  const openAddMenu = useSingleTapNavigate(() => {
    if (templates === undefined || noRoutines) {
      router.push(noRoutines ? "/routines/new" : "/routines");
      return;
    }
    appAlert("무엇을 할까요?", undefined, [
      { text: "루틴으로 운동 시작", onPress: () => router.push("/routines") },
      { text: "새 루틴 만들기", onPress: () => router.push("/routines/new") },
      { text: "취소", style: "cancel" },
    ]);
  });

  return { noRoutines, openRoutines, openAddMenu };
}
