import { AppAlertButton, useAlertStore } from "../store/alertStore";

// react-native의 Alert.alert와 같은 시그니처로 쓸 수 있는 drop-in 대체.
// 네이티브 알림 대신 앱 테마에 맞는 커스텀 모달(AppAlertModal)을 띄운다.
export function appAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  useAlertStore.getState().show({
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: "확인" }],
  });
}
