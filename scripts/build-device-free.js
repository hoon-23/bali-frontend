#!/usr/bin/env node
// 유료 Apple Developer 계정 없이(Personal Team 무료 서명) 실기기에 로컬로 설치해보기 위한
// 임시 빌드 스크립트. Sign In with Apple / 푸시 알림 capability는 Personal Team에서 지원되지
// 않아서, 이 두 네이티브 모듈만 빌드 동안 잠깐 제외했다가 끝나면 원상복구한다.
// 사용법: node scripts/build-device-free.js ["기기 이름 또는 UDID"]

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const appJsonPath = path.join(rootDir, "app.json");
const packageJsonPath = path.join(rootDir, "package.json");

const appJsonRaw = fs.readFileSync(appJsonPath, "utf8");
const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");

function restore() {
  fs.writeFileSync(appJsonPath, appJsonRaw);
  fs.writeFileSync(packageJsonPath, packageJsonRaw);
  console.log("\n✔ app.json / package.json 원상복구 완료");
}

process.on("exit", restore);
process.on("SIGINT", () => process.exit(1));

const appJson = JSON.parse(appJsonRaw);
appJson.expo.plugins = (appJson.expo.plugins || []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return name !== "expo-notifications";
});
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

const packageJson = JSON.parse(packageJsonRaw);
packageJson.expo = packageJson.expo || {};
packageJson.expo.autolinking = packageJson.expo.autolinking || {};
packageJson.expo.autolinking.ios = packageJson.expo.autolinking.ios || {};
packageJson.expo.autolinking.ios.exclude = [
  "expo-apple-authentication",
  "expo-notifications",
];
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

console.log("✔ Apple 로그인 / 푸시 알림 네이티브 모듈을 이번 빌드에서만 제외했습니다.");

spawnSync("rm", ["-rf", path.join(rootDir, "ios")], { stdio: "inherit" });

const deviceArg = process.argv[2] || "iPhone";
const result = spawnSync("npx", ["expo", "run:ios", "--device", deviceArg], {
  stdio: "inherit",
  cwd: rootDir,
});

process.exit(result.status ?? 1);
