/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SwaytWidget",
  displayName: "Swayt",
  // 잠금화면 버튼(App Intent)이 iOS 17부터라 위젯 타겟만 17로 둔다. 앱 본체의 최소 버전(15.1)은 그대로다(16.x에서는 Live Activity만 안 뜬다).
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "ActivityKit", "WidgetKit"],
  // 앱과 위젯(잠금화면 버튼)이 plan을 주고받는 App Group. app.json의 값을 자동으로 따라가지 않아서(1.5.0 빌드 15에서
  // 위젯 서명에 빠져 있었다) 여기에 직접 적는다. 앱·위젯 두 App ID 모두에 같은 그룹이 켜져 있어야 한다.
  entitlements: {
    "com.apple.security.application-groups": ["group.com.younghoon.swayt"],
  },
});
