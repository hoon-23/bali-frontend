import SwiftUI

// 디자인 시안(docs/specs/2026-10-18-live-activity-디자인-수치.md)의 색상 토큰.
enum Theme {
  static let bg = Color(hex: 0x0B0B0F)        // 앱 배경(참고용)
  // 잠금 카드 배경: 검정에 알파 0.65. 0.55~0.70 범위를 비교해 정했다(밝은 배경에서도 회색 글자가 읽히는 선).
  // Dynamic Island 배경은 시스템이 순수 검정으로 고정해서 바꿀 수 없다.
  static let card = Color.black.opacity(0.65)
  static let surface = Color(hex: 0x1C1C25)   // 보조 버튼, 아이콘 원
  static let track = Color(hex: 0x2E2E3A)     // 남은 세트, 만료 카드 테두리
  static let accent = Color(hex: 0x2DD4BF)    // 진행 시간, 완료 세트, 주 버튼
  static let onAccent = Color(hex: 0x0B0B0F)  // 민트 버튼 위 글자
  static let text = Color.white
  static let text2 = Color(hex: 0xA0A0A0)     // 메타, 캡션, 일시정지 시간
  static let muted = Color(hex: 0x8A8A94)     // 만료 상태 아이콘·라벨
  static let danger = Color(hex: 0xF87171)    // 종료 버튼 글자
  static let warn = Color(hex: 0xFBBF24)      // 일시정지 표시

  // 앱 딥링크(app.json의 scheme). 버튼 동작(App Intent)을 붙이기 전까지 탭하면 앱을 연다.
  static let appURL = URL(string: "bali-frontend://")!
}

extension Color {
  init(hex: UInt32) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: 1
    )
  }
}

// 경과 시간 문자열(고정 표시용). 1시간 넘으면 h:mm:ss.
func formatElapsed(_ seconds: Int) -> String {
  let s = max(0, seconds)
  let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
}
