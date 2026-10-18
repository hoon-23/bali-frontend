/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SwaytWidget",
  displayName: "Swayt",
  // Live Activity는 iOS 16.2부터. 앱 본체의 최소 버전(15.1)은 그대로 두고 위젯 타겟에만 적용한다.
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "ActivityKit", "WidgetKit"],
});
