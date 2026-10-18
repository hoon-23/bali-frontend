/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SwaytWidget",
  displayName: "Swayt",
  // 잠금화면 버튼(App Intent)이 iOS 17부터라 위젯 타겟만 17로 둔다. 앱 본체의 최소 버전(15.1)은 그대로다(16.x에서는 Live Activity만 안 뜬다).
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "ActivityKit", "WidgetKit"],
});
