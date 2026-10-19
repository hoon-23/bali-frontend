import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      LockScreenView(
        sessionName: context.attributes.sessionName,
        state: context.state,
        isStale: context.isStale
      )
      .activityBackgroundTint(Theme.card)
      .activitySystemActionForegroundColor(Theme.text)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          ExpandedLeading(state: context.state, isStale: context.isStale)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ExpandedTrailing(state: context.state, isStale: context.isStale)
        }
        // 상단 줄(leading/trailing)은 카메라 양옆 좁은 영역이라 종목명은 전체 폭인 bottom 영역에 둔다.
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 10) {
            ExpandedCenter(state: context.state, isStale: context.isStale)
            ExpandedBottom(state: context.state, isStale: context.isStale)
          }
        }
      } compactLeading: {
        CompactLeading(state: context.state, isStale: context.isStale)
      } compactTrailing: {
        CompactTrailing(state: context.state, isStale: context.isStale)
      } minimal: {
        MinimalView(state: context.state, isStale: context.isStale)
      }
    }
  }
}

// MARK: - 잠금화면 카드 (360 × 156)

struct LockScreenView: View {
  let sessionName: String
  let state: LAState
  let isStale: Bool

  var body: some View {
    Group {
      if isStale {
        staleBody
      } else if state.phase == .awaitingFinish {
        finishBody
      } else {
        activeBody
      }
    }
    .padding(.vertical, 12)
    .padding(.horizontal, 16)
    .frame(height: 156)
    .overlay {
      if isStale {
        RoundedRectangle(cornerRadius: 22).strokeBorder(Theme.track, lineWidth: 1)
      }
    }
  }

  private var caption: String { "\(sessionName) · \(state.exerciseIndex)/\(state.exerciseCount)" }

  // A~D: 진행 중
  private var activeBody: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(caption).font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
        Spacer()
        topRight
      }
      HStack(alignment: .bottom) {
        VStack(alignment: .leading, spacing: 2) {
          Text(state.exerciseName)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Theme.text)
            .lineLimit(1)
            .truncationMode(.tail)
            .minimumScaleFactor(0.9)
          if let meta = metaText(state) {
            Text(meta).font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.text2)
          }
        }
        Spacer(minLength: 8)
        VStack(alignment: .trailing, spacing: 0) {
          rightLabel
          bigValue
        }
      }
      ActionRow(state: state)
    }
  }

  @ViewBuilder
  private var topRight: some View {
    if state.isCardio {
      if state.phase == .paused {
        HStack(spacing: 4) {
          Image(systemName: "pause.fill").font(.system(size: 10, weight: .bold))
          Text("일시정지됨").font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(Theme.warn)
      } else {
        HStack(spacing: 4) {
          Image(systemName: "figure.run").font(.system(size: 11, weight: .bold))
          Text("유산소").font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(Theme.accent)
      }
    } else {
      HStack(spacing: 8) {
        PillBar(state: state)
        Text("\(state.completedSets)/\(state.totalSets) 완료")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Theme.text2)
          .monospacedDigit()
      }
    }
  }

  @ViewBuilder
  private var rightLabel: some View {
    switch (state.phase, state.isCardio) {
    case (.running, false):
      Text("● 세트 \(state.setNumber)").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
    case (.running, true):
      Text("● 측정 중").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
    case (.paused, _):
      Text("멈춤").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
    case (.waiting, false):
      Text("다음 세트").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
    default:
      Text("측정 전").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
    }
  }

  @ViewBuilder
  private var bigValue: some View {
    if state.phase == .waiting && !state.isCardio {
      // 세트 대기: 시간이 아직 없으니 "다음 세트 2 / 3"을 크게
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text("\(state.setNumber)").font(.system(size: 34, weight: .bold)).foregroundStyle(Theme.text)
        Text("/ \(state.totalSets)").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.text2)
      }
      .monospacedDigit()
    } else {
      ElapsedText(state: state, size: 34)
    }
  }

  // E: 종료 대기
  private var finishBody: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(caption).font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
        Spacer()
        HStack(spacing: 4) {
          Image(systemName: "checkmark").font(.system(size: 11, weight: .bold))
          Text("모든 종목 완료").font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(Theme.accent)
      }
      HStack(alignment: .bottom) {
        VStack(alignment: .leading, spacing: 2) {
          Text("종료를 확정해 주세요").font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.text)
          Text("\(state.exerciseCount)종목 · \(state.totalCompletedSets)세트")
            .font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.text2)
        }
        Spacer(minLength: 8)
        VStack(alignment: .trailing, spacing: 0) {
          Text("종목").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
          HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text("\(state.exerciseCount)").font(.system(size: 34, weight: .bold)).foregroundStyle(Theme.text)
            Text("/ \(state.exerciseCount)").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.text2)
          }
          .monospacedDigit()
        }
      }
      ActionRow(state: state)
    }
  }

  // F: 만료 — 강조색·시간·알약을 모두 걷어 정상 상태와 한눈에 구별되게 한다
  private var staleBody: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("\(sessionName) · \(state.exerciseName)")
          .font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2).lineLimit(1)
        Spacer()
        HStack(spacing: 4) {
          Image(systemName: "clock").font(.system(size: 11, weight: .bold))
          Text("업데이트 멈춤").font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(Theme.muted)
      }
      VStack(alignment: .leading, spacing: 2) {
        Text("운동이 끝났다면 앱을 열어 주세요")
          .font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.text)
          .lineLimit(1).minimumScaleFactor(0.9)
        Text("마지막 기록 \(state.lastUpdated.formatted(date: .omitted, time: .shortened))")
          .font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.text2)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Spacer(minLength: 0)
      ActionButton(title: "앱 열기", symbol: "arrow.up.forward.app", style: .secondary)
    }
  }
}

// MARK: - Dynamic Island 확장 (371 × 150)

private func symbolName(_ state: LAState, isStale: Bool) -> (String, Color) {
  if isStale { return ("clock", Theme.muted) }
  switch state.phase {
  case .awaitingFinish: return ("checkmark.circle.fill", Theme.accent)
  case .paused: return ("pause.fill", Theme.warn)
  default: return (state.isCardio ? "figure.run" : "dumbbell.fill", Theme.accent)
  }
}

struct ExpandedLeading: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    let (symbol, color) = symbolName(state, isStale: isStale)
    HStack(spacing: 8) {
      ZStack {
        Circle().fill(Theme.surface)
        Image(systemName: symbol).font(.system(size: 14, weight: .bold)).foregroundStyle(color)
      }
      .frame(width: 32, height: 32)
      if isStale {
        Text("업데이트 멈춤").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.muted)
      } else if state.phase == .paused {
        Text("일시정지됨").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.warn)
      } else {
        Text("\(state.exerciseIndex)/\(state.exerciseCount)")
          .font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.text2).monospacedDigit()
          .fixedSize()
      }
    }
    .padding(.leading, 6)
  }
}

struct ExpandedTrailing: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    Group {
      if isStale {
        Text(state.exerciseName)
          .font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2).lineLimit(1)
      } else if state.phase == .awaitingFinish {
        Text("모든 종목 완료").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
      } else if state.phase == .waiting && !state.isCardio {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text("\(state.setNumber)").font(.system(size: 28, weight: .bold)).foregroundStyle(Theme.text)
          Text("/ \(state.totalSets)세트").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.text2)
        }
        .monospacedDigit()
      } else {
        // 확장 영역은 내용 폭에 맞춰 줄어들어 타이머가 "1:…"로 잘린다 — 폭을 고정한다(1:05:20까지 들어가게).
        ElapsedText(state: state, size: 28)
          .frame(width: 120, alignment: .trailing)
      }
    }
    .padding(.trailing, 6)
  }
}

struct ExpandedCenter: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    Group {
      if isStale {
        Text("운동이 끝났다면 앱을 열어 주세요")
          .font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
      } else if state.phase == .awaitingFinish {
        HStack(spacing: 6) {
          Text("종료를 확정해 주세요").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
          Text("\(state.exerciseCount)종목 · \(state.totalCompletedSets)세트")
            .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.text2)
        }
      } else {
        HStack(spacing: 6) {
          Text(state.exerciseName)
            .font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
            .lineLimit(1).truncationMode(.tail).minimumScaleFactor(0.9)
          if let meta = metaText(state) {
            Text(meta).font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.text2).lineLimit(1)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 6)
  }
}

struct ExpandedBottom: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    if isStale {
      ActionButton(title: "앱 열기", symbol: "arrow.up.forward.app", style: .secondary, fontSize: 15)
    } else if state.phase == .awaitingFinish || state.isCardio || state.phase == .paused {
      ActionRow(state: state, fontSize: 15)
    } else {
      // 웨이트: 알약 막대(+ 진행 중이면 "세트 N") 왼쪽, 주 버튼 오른쪽
      HStack(spacing: 12) {
        HStack(spacing: 8) {
          PillBar(state: state)
          if state.phase == .running {
            Text("세트 \(state.setNumber)").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.text2)
          }
        }
        Spacer(minLength: 0)
        ActionRow(state: state, fontSize: 15).frame(width: 140)
      }
    }
  }
}

// MARK: - 컴팩트 · 미니멀

struct CompactLeading: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    if isStale || state.phase == .awaitingFinish || state.isCardio || state.phase == .paused {
      let (symbol, color) = symbolName(state, isStale: isStale)
      Image(systemName: symbol).font(.system(size: 13, weight: .bold)).foregroundStyle(color)
    } else {
      // 왼쪽 둥근 모서리에 링이 걸리지 않도록 여백을 둔다.
      SegmentRing(state: state, diameter: 18, lineWidth: 2.5).padding(.leading, 4)
    }
  }
}

struct CompactTrailing: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    Group {
      if isStale {
        Text("멈춤").foregroundStyle(Theme.muted)
      } else if state.phase == .awaitingFinish {
        Text("완료").foregroundStyle(Theme.accent)
      } else if state.phase == .waiting && !state.isCardio {
        Text("\(state.setNumber)/\(state.totalSets)").foregroundStyle(Theme.text).monospacedDigit()
      } else {
        ElapsedText(state: state, size: 14)
      }
    }
    .font(.system(size: 14, weight: .semibold))
    .frame(maxWidth: 52, alignment: .trailing)
  }
}

struct MinimalView: View {
  let state: LAState
  let isStale: Bool

  var body: some View {
    if isStale || state.phase == .awaitingFinish || state.isCardio || state.phase == .paused {
      let (symbol, color) = symbolName(state, isStale: isStale)
      Image(systemName: symbol).font(.system(size: 13, weight: .bold)).foregroundStyle(color)
    } else {
      SegmentRing(state: state, diameter: 24, lineWidth: 3, showsNumber: true)
    }
  }
}
