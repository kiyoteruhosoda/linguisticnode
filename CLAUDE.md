# Claude Code ルール

## いまの状態（2026-10-17）

- **Web 版とサーバは廃止した**（[task #404](https://task.nolumia.com/tasks/404)、deploy-repo PR #359）。
  naso の容れ物・像・公開名 `ln.nolumia.com` は撤去済み
- **サーバ（FastAPI、`app/`・`tests/`・`Dockerfile`・`docker-compose*.yml` など）はリポジトリから削除した**（[task #407](https://task.nolumia.com/tasks/407)、2026-10-17 持ち主の決定）。
  戻すなら git の履歴から
- Web 版（`frontend/apps/web`・`frontend/src`）のコードは残っている（どこでも動いていない）。消すかは持ち主がまだ決めていない。**決まるまで消さない・直さない**。
  ログインと同期はサーバにつなぐ作りで、つなぐ先は無い（ビルドと試験はサーバ無しで通る）
- 動いているのは**スマホ版（Expo、`frontend/apps/mobile`）だけ**。データは端末の中だけに持つ（配る版にはサーバの宛先 `EXPO_PUBLIC_API_BASE_URL` を入れていない）

## 変更を確かめる

- ⚠ **手元でビルドも試験も流さない**（`npm run build` / `npm run test` / `npx tsc` など）。PR を出して forge の CI で確かめる
- CI は `.forgejo/workflows/frontend-visual.yml`（`frontend/` を変えた PR で、`npm run test:ci` と `npm run test:mobile:regression`）。

### ミスが起きた原因と対策

| 過去のミス | 原因 | 対策 |
|-----------|------|------|
| 未使用変数の lint エラーを出した (showMenu 等) | コード削除後に lint を確認しなかった | コードを削除・変更したら **必ず lint を実行** して未使用変数・未使用 import がないか確認する |
| モバイル側の型エラー (mobileSpeechGateway に stop() が未実装) | インターフェース変更時にすべての実装を確認しなかった | interface/type を変更したら **すべての実装ファイルを検索** して漏れがないか確認する |
| `erasableSyntaxOnly` エラー | TypeScript のコンパイル設定を考慮しなかった | `constructor(public x)` 等のパラメータプロパティは使用禁止。明示的プロパティ宣言を使う |

## ブランチ運用

- 置き場は forge（`https://git.nolumia.com/kyon/linguisticnode`）。main から作業の枝を切り、PR でマージする（main へ直接 push しない）
