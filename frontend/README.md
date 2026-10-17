# Frontend (React + TypeScript + Vite)

## 現状のCI相当コマンド

- CI: forge の `.forgejo/workflows/frontend-visual.yml` で `test:ci` + `test:e2e:ci` + `test:mobile:regression` を実行
- `npm run dev`: 開発サーバー
- `npm run build`: TypeScriptビルド + Vite build
- `npm run preview`: build成果物のプレビュー
- `npm run lint`: ESLint
- `npm run test`: Vitest
- `npm run test:coverage`: Vitest coverage
- `npm run typecheck`: 型チェック（`tsc -b`）
- `npm run test:ci`: CI相当のフロント品質ゲート（lint + typecheck + vitest run + build）
- `npm run test:e2e`: Playwright E2E（smoke + visual + RNW PoC visual）
- 初回のみ: `npx playwright install chromium firefox && npx playwright install-deps`（E2E実行前のブラウザ準備）
- `npm run test:e2e:smoke`: Playwright smoke（ログイン前導線 + RNW PoC導線）
- `npm run test:e2e:visual`: Visual regressionのみ実行（`RUN_VISUAL_REGRESSION=1`）
- `npm run test:e2e:visual:update`: visual baselineを更新（`RUN_VISUAL_REGRESSION=1`）
- `npm run test:e2e:update`: Playwrightスクリーンショットのベースライン更新
- `npm run test:e2e:firefox`: Firefoxプロジェクトのみ実行
- `npm run test:e2e:ci`: Chromium/Firefox 両方の visual regression をCI相当で実行
- `npm run test:e2e:rnw-poc`: RNW PoCコンポーネントのvisual回帰のみを実行
- `npm run test:mobile:regression`: Mobile向けE2E相当フロー（create→study→sync）の回帰テスト
- `npm run dev --workspace @linguisticnode/apps-web`: apps/webスコープから既存Web開発サーバーを起動
- `npm run start --workspace @linguisticnode/apps-mobile`: Expo mobile dev server
- `npm run android --workspace @linguisticnode/apps-mobile`: Expo Android launcher
- `npm run ios --workspace @linguisticnode/apps-mobile`: Expo iOS launcher
- `EXPO_PUBLIC_MOBILE_STORAGE_RUNTIME=native-async|native-sqlite` で mobile persistence adapter を切替

## ルーティング方式

- Router: `react-router-dom` の `BrowserRouter`。
- エントリ: `src/App.tsx`。
- 初期遷移: `/` は `/words` へリダイレクト。

## 主要画面一覧

- `/login`: ログイン/ユーザー登録
- `/words`: 単語一覧（トップ相当）
- `/words/create`: 単語作成
- `/words/:id`: 単語詳細
- `/study`: 学習画面
- `/examples`: 例文テスト画面
- `/`: `/words` へリダイレクト
- `*`: 未定義パスは `/words` へフォールバック

## UIリグレッションテスト

- `e2e/specs/smoke.spec.ts`
  - ログイン前の主要導線（`/login`→`/words`）の導通を確認
  - RNW action row（Study/Examples/Add）のクリック遷移をE2Eで検証
- `e2e/specs/ui-regression.spec.ts`
  - `toHaveScreenshot` を使用した visual regression
  - 現在は `/login`・`/words`・`/words/create`・`/study`・`/examples` を最小セットとして固定
- `e2e/specs/rnw-poc.spec.ts`
  - RNW PoCとして `/words` の action row（RNW button群）をコンポーネント単位でスクショ固定
  - `RUN_VISUAL_REGRESSION=1` のときのみ実行
- `e2e/domains/visualAssertion.ts`
  - screenshot assertionをPort的に共通化（page/locatorのポリモーフィック実行）
- 実行先URLは `PLAYWRIGHT_BASE_URL` で上書き可能（デフォルト: `http://localhost:${PLAYWRIGHT_WEB_PORT:-4173}`）
- 安定化施策
  - viewport固定
  - タイムゾーン/ロケール固定
  - アニメーション無効化
  - 時刻/乱数固定（init script）

## RNW段階移行に向けた現状

- Storage直叩きを抽象化（`src/core/storage` + `packages/core`）
- タグフィルタ永続化をドメインサービス化（`src/core/tagFilter`）
- WordユースケースをApplication Service化（`src/core/word/wordApplicationService.ts`）
  - Port: `src/core/word/wordGateway.ts`
  - Adapter: `src/word/wordGatewayAdapter.ts`
  - `WordListPage` / `WordCreatePage` / `WordDetailPage` が service 経由でユースケースを実行
- Study/ExamplesユースケースをApplication Service化
  - Study: `src/core/study/*` + `src/study/studyGatewayAdapter.ts`
  - Examples: `src/core/examples/*` + `src/examples/examplesGatewayAdapter.ts`
  - `StudyPage` / `ExamplesTestPage` が service 経由でユースケースを実行
- RNW移行PoC
  - `react-native` + `react-native-web` を導入
  - `packages/ui` にRNコンポーネントの共通部品を新設（`RnwSurfaceCard`）
  - `LoginPage` のカードを `@linguisticnode/ui` から参照して描画
  - 既存UIは当面 `src/rnw/react-native.tsx` の互換レイヤーを併用して段階置換

## ディレクトリ方針（段階的ワークスペース）

- `src/`: 既存Web UI（当面維持）
- `packages/core`: UI非依存のPort/ドメイン共有コード
- `packages/ui`: RN/RNWで再利用するUIコンポーネント
- `apps/web`: Web runtimeの移行シーム（scaffold）
- `apps/mobile`: Expo想定のモバイルエントリ（scaffold）

## RNW移行の進捗管理

- 詳細な完了までのチェックリストは `plan.md` を参照してください。


## Phase C (Monorepo migration seam)

- `apps/web` now has its own runtime entrypoint (`index.html`, `src/main.tsx`, `vite.config.ts`).
- `apps/mobile` now has a runnable Expo scaffold (`App.tsx`, `app.json`) and is connected to shared `packages/core` + `packages/ui`.

### Additional workspace commands

- `npm run dev --workspace @linguisticnode/apps-web`
- `npm run build --workspace @linguisticnode/apps-web`
- `npm run typecheck --workspace @linguisticnode/apps-web`
- `npm run start --workspace @linguisticnode/apps-mobile`


## Phase E (prototype hardening)

- Mobile production hardening roadmap: `plan.md` (Phase E section)
