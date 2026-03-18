---
name: mobile-expo
description: Rules for React Native / Expo mobile app development. Use when adding packages, modifying native modules, or working on frontend/apps/mobile/.
license: MIT
compatibility: Expo SDK 52, React Native 0.76
metadata:
  author: LinguisticNode
  version: "1.0"
  category: mobile-frontend
---

# Mobile / Expo Skill

## Project Location

```
frontend/apps/mobile/   ← Expo SDK 52 モバイルアプリ
frontend/apps/web/      ← Web アプリ（共用コンポーネントあり）
```

## Expo パッケージバージョン管理（必須ルール）

### 黄金律: bundledNativeModules.json を必ず参照する

Expo SDK に紐づくネイティブパッケージの**正規バージョン**は以下のファイルで管理されている:

```
frontend/node_modules/expo/bundledNativeModules.json
```

**パッケージを追加・更新するときは必ずこのファイルを確認すること。**

```bash
# 確認コマンド
python3 -c "
import json
d = json.load(open('frontend/node_modules/expo/bundledNativeModules.json'))
print(d.get('expo-clipboard', 'not found'))
"
```

### なぜ重要か

- `npx expo install` はネットワーク経由で最新版を解決しようとするが、オフライン環境や CI では失敗する
- バージョンが SDK と一致しないと Android Gradle ビルドが `expo-module-gradle-plugin` エラーで失敗する
- `npm install` は semver 制約があっても lock ファイルの古いエントリを優先するため、手動確認が必要

### 正しい手順

1. `bundledNativeModules.json` でバージョン制約を確認
2. `package.json` にその制約をそのままコピー（例: `"~7.0.1"`）
3. `npm install --workspace=apps/mobile` を実行
4. `npm ls <package-name>` で `invalid` マークが出ないことを確認

```bash
# OK の例
npm ls expo-clipboard
# @linguisticnode/apps-mobile@0.0.0 -> ./apps/mobile
#   └── expo-clipboard@7.0.1   ← invalid が出ていない

# NG の例（SDK バージョン不一致）
# └── expo-clipboard@7.1.5 invalid: "~7.0.1" from apps/mobile
```

### 過去の失敗事例

| 指定したバージョン | インストールされたバージョン | 結果 |
|---|---|---|
| `^55.0.9` | 55.0.9 | Gradle ビルド失敗（SDK 55向けを SDK 52 に投入）|
| `~7.1.2` | 7.1.5 | `invalid` マーク（SDK 53向けを SDK 52 に投入）|
| `~7.0.1` | 7.0.1 | ✅ 正常（SDK 52 公式バンドルと一致）|

現在の SDK 52 での正規バージョン例（要都度確認）:
- `expo-clipboard`: `~7.0.1`

## ネイティブモジュール変更後のチェックリスト

- [ ] `bundledNativeModules.json` でバージョンを確認した
- [ ] `npm ls <package>` で `invalid` が出ないことを確認した
- [ ] `npx tsc --noEmit`（mobile）で型エラーがないことを確認した
- [ ] `npm run lint`（frontend root）で ESLint エラーがないことを確認した

## ESLint / TypeScript チェック

モバイルアプリの lint は **frontend root** から実行される:

```bash
cd frontend && npm run lint        # ESLint
cd frontend/apps/mobile && npx tsc --noEmit   # TypeScript (mobile)
cd frontend && npm run typecheck   # TypeScript (web)
```

### よくある型エラー

| エラー | 原因 | 対処 |
|---|---|---|
| `no-unused-vars` | サブコンポーネント間で state を宣言した親と使う子が分離している | state を実際に使うコンポーネント内に移動する |
| `string \| undefined` not assignable to `string` | コールバック内では型が絞り込まれない | `value ?? ""` を使う |
| `TtsEventHandler` 型不一致 | react-native-tts の `utteranceId` が `string \| number` | ハンドラ引数を `unknown` にする |
