#!/usr/bin/env node
/**
 * Customises the Capacitor-generated android/ project (idempotent; safe to run repeatedly).
 *  - copies launcher icons + notification icon from resources/android/res
 *  - ensures notification / exact-alarm / boot permissions in AndroidManifest.xml
 *  - sets versionName from package.json and versionCode from ANDROID_VERSION_CODE (CI run number) or 1
 * The android/ folder is generated in CI (`npx cap add android`) and is git-ignored.
 */
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const androidDir = join(root, "android");
if (!existsSync(androidDir)) {
  console.error("android/ not found. Run `npx cap add android` first.");
  process.exit(1);
}

// 1. resources
cpSync(join(root, "resources/android/res"), join(androidDir, "app/src/main/res"), { recursive: true, force: true });

// 2. manifest permissions
const manifestPath = join(androidDir, "app/src/main/AndroidManifest.xml");
let manifest = readFileSync(manifestPath, "utf8");
const permissions = ["android.permission.POST_NOTIFICATIONS", "android.permission.SCHEDULE_EXACT_ALARM", "android.permission.RECEIVE_BOOT_COMPLETED"];
const missing = permissions.filter((p) => !manifest.includes(`android:name="${p}"`));
if (missing.length > 0) {
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
  if (!/<application[\s>/]/.test(manifest)) throw new Error("AndroidManifest.xml has no <application> element");
  manifest = manifest.replace(/(\s*)<application/, `\n${lines}\n$1<application`);
  writeFileSync(manifestPath, manifest);
}

// 3. version
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const gradlePath = join(androidDir, "app/build.gradle");
let gradle = readFileSync(gradlePath, "utf8");
const code = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? "1", 10) || 1;
const before = gradle;
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
if (gradle === before && !gradle.includes(`versionName "${pkg.version}"`)) console.warn("warning: could not update versionName/versionCode in app/build.gradle");
writeFileSync(gradlePath, gradle);

console.log(`Android project prepared (versionName ${pkg.version}, versionCode ${code}).`);
