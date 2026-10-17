# Tests Organization

## Frontend Tests (TypeScript/Vitest)

テストは `/frontend/src/__tests__/` ディレクトリに整理されています。

```
frontend/src/__tests__/
├── api/           # API client tests
├── auth/          # Authentication tests
├── components/    # React component tests
└── utils/         # Utility function tests
```

### テスト実行

```bash
cd frontend

# 全テストを実行
npm test

# ウォッチモード
npm test

# カバレッジ付き
npm run test:coverage

# UI モード
npm run test:ui
```

### テストファイル命名規則

- テストファイル: `*.test.ts` または `*.test.tsx`
- setupファイル: `src/test/setup.ts`

## テストのベストプラクティス

### Frontend

1. **モックの使用**
   - API呼び出しはモック化
   - `vi.mock()` でモジュールをモック

2. **コンポーネントテスト**
   - `render()` でコンポーネントをレンダリング
   - `screen` でDOM要素を検索
   - `fireEvent` でユーザーインタラクションをシミュレート

3. **非同期テスト**
   - `waitFor()` で非同期処理を待機
   - `async/await` を使用

## トラブルシューティング

### フロントエンドテストが失敗する

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm test
```

## CI/CD

試験は forge の CI（`.forgejo/workflows/frontend-visual.yml`）で、`frontend/` を変えた PR に走ります（`npm run test:ci` と `npm run test:mobile:regression`）。

サーバ（FastAPI）とその試験（pytest）は 2026-10-17 にリポジトリから削除しました（task #407）。
