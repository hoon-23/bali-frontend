import SwiftUI

typealias LAState = WorkoutActivityAttributes.ContentState

// 반복·무게 메타. 값이 없으면 생략하고, 하나만 있으면 그 값만 보여준다.
func metaText(_ s: LAState) -> String? {
  var parts: [String] = []
  if s.isCardio {
    if s.targetMinutes > 0 { parts.append("목표 \(s.targetMinutes)분") }
  } else {
    if s.targetReps > 0 { parts.append("\(s.targetReps)회") }
    if s.targetWeight > 0 {
      let w = s.targetWeight
      parts.append((w == w.rounded() ? String(Int(w)) : String(format: "%.1f", w)) + "kg")
    }
  }
  return parts.isEmpty ? nil : parts.joined(separator: " · ")
}

// 경과 시간. running이면 OS가 시작 시각 기준으로 올려 그리고(앱이 꺼져도 흐른다), 아니면 고정 문자열.
// 범위 끝을 12시간 뒤로 둔 이유: 아주 먼 미래(distantFuture)를 쓰면 일부 상태에서 초가 "--"로 보인 적이 있다.
struct ElapsedText: View {
  let state: LAState
  let size: CGFloat
  var color: Color? = nil

  var body: some View {
    Group {
      if state.phase == .running, let start = state.timerStart {
        Text(timerInterval: start...start.addingTimeInterval(12 * 3600), countsDown: false, showsHours: true)
          .foregroundStyle(color ?? Theme.accent)
      } else {
        Text(formatElapsed(state.pausedSeconds))
          .foregroundStyle(color ?? Theme.text2)
      }
    }
    .font(.system(size: size, weight: .semibold))
    .monospacedDigit()
    .multilineTextAlignment(.trailing)
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }
}

// 세트 진행 알약 막대. 완료/남음은 14, 현재는 28 너비. 9세트 이상이면 숫자로 바꾼다.
// 시간에 따라 변하는 값이 없어서 상태가 바뀔 때만 다시 그려진다.
struct PillBar: View {
  let state: LAState

  var body: some View {
    if state.totalSets >= 9 {
      Text("\(state.setNumber) / \(state.totalSets)")
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(Theme.text2)
        .monospacedDigit()
    } else {
      HStack(spacing: 4) {
        ForEach(1...max(1, state.totalSets), id: \.self) { index in
          pill(index)
        }
      }
    }
  }

  @ViewBuilder
  private func pill(_ index: Int) -> some View {
    let isDone = index <= state.completedSets
    let isCurrent = !isDone && index == state.setNumber
    if isDone {
      Capsule().fill(Theme.accent).frame(width: 14, height: 6)
    } else if isCurrent {
      if state.phase == .running {
        Capsule().fill(Theme.accent).frame(width: 28, height: 6)
      } else {
        // 대기 중인 현재 세트는 테두리만
        Capsule().strokeBorder(Theme.accent, lineWidth: 1).frame(width: 28, height: 6)
      }
    } else {
      Capsule().fill(Theme.track).frame(width: 14, height: 6)
    }
  }
}

// 컴팩트·미니멀용 세그먼트 링. 가운데에 세트 번호를 둘 수 있다.
struct SegmentRing: View {
  let state: LAState
  let diameter: CGFloat
  let lineWidth: CGFloat
  var showsNumber: Bool = false

  var body: some View {
    let total = max(1, state.totalSets)
    let gap = total > 1 ? 0.025 : 0
    ZStack {
      ForEach(0..<total, id: \.self) { i in
        let start = Double(i) / Double(total) + gap / 2
        let end = Double(i + 1) / Double(total) - gap / 2
        Circle()
          .trim(from: start, to: end)
          .stroke(color(for: i + 1), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
          .rotationEffect(.degrees(-90))
      }
      if showsNumber {
        Text("\(state.setNumber)")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(Theme.text)
      }
    }
    .frame(width: diameter, height: diameter)
  }

  private func color(for index: Int) -> Color {
    if index <= state.completedSets { return Theme.accent }
    if index == state.setNumber { return state.phase == .running ? Theme.accent : Theme.accent.opacity(0.45) }
    return Theme.track
  }
}

// 버튼 모양. action이 있으면 App Intent로 앱을 열지 않고 동작하고, 없으면 탭하면 앱을 연다(Link).
enum ActionStyle { case primary, secondary, danger }

struct ActionButton: View {
  let title: String
  let symbol: String
  var style: ActionStyle = .primary
  var fontSize: CGFloat = 16
  var height: CGFloat = 44
  var action: String? = nil

  var body: some View {
    if let action {
      Button(intent: WorkoutActionIntent(action: action)) { label }
        .buttonStyle(.plain)
    } else {
      Link(destination: Theme.appURL) { label }
    }
  }

  private var label: some View {
    HStack(spacing: 6) {
      Image(systemName: symbol).font(.system(size: fontSize - 2, weight: .bold))
      Text(title).font(.system(size: fontSize, weight: .semibold))
    }
    .foregroundStyle(foreground)
    .frame(maxWidth: .infinity)
    .frame(height: height)
    .background(Capsule().fill(background))
  }

  private var foreground: Color {
    switch style {
    case .primary: return Theme.onAccent
    case .secondary: return Theme.text
    case .danger: return Theme.danger
    }
  }

  private var background: Color {
    switch style {
    case .primary: return Theme.accent
    case .secondary, .danger: return Theme.surface
    }
  }
}

// 현재 상태에 맞는 버튼 줄. 웨이트는 주 버튼 하나, 유산소는 일시정지/이어서 + 종료.
// "운동 종료"는 난이도 선택·서버 제출을 앱에서 하므로 앱을 연다(action 없음).
struct ActionRow: View {
  let state: LAState
  var fontSize: CGFloat = 16

  var body: some View {
    switch (state.phase, state.isCardio) {
    case (.awaitingFinish, _):
      ActionButton(title: "운동 종료", symbol: "arrow.up.forward.app", fontSize: fontSize)
    case (.waiting, false):
      ActionButton(title: "세트 시작", symbol: "play.fill", fontSize: fontSize, action: "startSet")
    case (.running, false):
      ActionButton(title: "세트 완료", symbol: "checkmark", fontSize: fontSize, action: "completeSet")
    case (.waiting, true):
      ActionButton(title: "측정 시작", symbol: "play.fill", fontSize: fontSize, action: "startCardio")
    case (.running, true):
      HStack(spacing: 8) {
        ActionButton(title: "일시정지", symbol: "pause.fill", style: .secondary, fontSize: fontSize, action: "pauseCardio")
        ActionButton(title: "종료", symbol: "stop.fill", style: .danger, fontSize: fontSize, action: "finishCardio").frame(width: 96)
      }
    case (.paused, _):
      HStack(spacing: 8) {
        ActionButton(title: "이어서 측정", symbol: "play.fill", fontSize: fontSize, action: "resumeCardio")
        ActionButton(title: "종료", symbol: "stop.fill", style: .danger, fontSize: fontSize, action: "finishCardio").frame(width: 96)
      }
    }
  }
}
