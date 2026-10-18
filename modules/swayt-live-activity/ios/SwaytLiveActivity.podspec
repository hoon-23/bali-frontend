Pod::Spec.new do |s|
  s.name           = 'SwaytLiveActivity'
  s.version        = '1.0.0'
  s.summary        = '운동 Live Activity(잠금화면·Dynamic Island) 시작/갱신/종료'
  s.description    = '운동 Live Activity(잠금화면·Dynamic Island) 시작/갱신/종료'
  s.license        = 'MIT'
  s.author         = 'swayt'
  s.homepage       = 'https://github.com/'
  # 앱 본체는 15.1을 유지한다. ActivityKit 호출은 코드에서 iOS 16.2 가용성으로 막는다.
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
