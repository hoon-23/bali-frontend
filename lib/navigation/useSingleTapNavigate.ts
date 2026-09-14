import { useCallback, useRef } from "react";

// 모달로 뜨는 화면(운동 추가하기 등)으로 이동하는 버튼을 빠르게 연타하면, 트랜지션이
// 끝나기 전에 router.push가 여러 번 쌓여 같은 모달이 여러 장 겹쳐 뜬다.
// 마지막 push 이후 일정 시간 동안 재호출을 무시해서 한 번만 뜨게 막는다.
const NAVIGATE_COOLDOWN_MS = 800;

export function useSingleTapNavigate(navigate: () => void): () => void {
  const lockedUntilRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now < lockedUntilRef.current) {
      return;
    }
    lockedUntilRef.current = now + NAVIGATE_COOLDOWN_MS;
    navigate();
  }, [navigate]);
}
