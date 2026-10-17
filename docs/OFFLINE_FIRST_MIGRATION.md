# オフラインファースト実装ガイド

## 概要

LinguisticNodeをオフラインファースト・アーキテクチャに移行しました。
ローカルが単一の真実（Source of Truth）となり、同期はユーザー操作で明示的に行います。

## 主な変更点

### A. アーキテクチャ原則

1. **ローカルが Source of Truth**
   - 追加/編集/削除/学習履歴はローカル（IndexedDB）に先に反映
   - オフラインで完全に動作
   - 同期はユーザーの明示的な操作（Syncボタン）でのみ実行

2. **同期単位はファイル全体**
   - ファイル全体をLWW（Last Write Wins）で上書き
   - マージしない（シンプルな実装）

3. **認証は同期時のみ必須**
   - オフライン操作に認証不要
   - 同期時に401が返ればログインを促す

### B. フロントエンド実装

#### 新規ファイル

```
frontend/src/
├── db/
│   ├── types.ts                 # IndexedDB型定義
│   ├── indexeddb.ts             # IndexedDB低レベルAPI
│   ├── localRepository.ts       # ローカルリポジトリ（CRUD）
│   └── syncService.ts           # 同期サービス
├── api/
│   ├── words.offline.ts         # オフライン版Words API
│   ├── study.offline.ts         # オフライン版Study API
│   └── io.offline.ts            # オフライン版IO API
└── components/
    └── SyncButton.tsx           # 同期ボタンコンポーネント
```

#### IndexedDB構造

- **Store: vocab**
  - Key: "file"
  - Value: VocabFile (全単語+メモリー状態)

- **Store: sync**
  - Key: "metadata"
  - Value: SyncMetadata (clientId, serverRev, dirty, lastSyncAt)

#### ローカルリポジトリAPI

```typescript
// 単語CRUD
getWords(options?: {q?: string; pos?: string})
getWordById(id: string)
createWord(data)
updateWord(id, data)
deleteWord(id)

// 学習機能
getMemoryState(wordId)
getNextCard()
updateMemoryState(wordId, updates)

// 同期用
getVocabFileForSync()
replaceVocabFile(file, markAsClean)
```

#### 同期フロー

```typescript
// 通常同期
syncToServer()
  → PUT /vocab { serverRev, file, clientId }
  → 成功: metadata更新、dirty=false
  → 409 Conflict: 競合UIへ

// 競合解決
resolveConflict("fetch-server")  // サーバー版を取得
resolveConflict("force-local")   // ローカル版で強制上書き
```

### C. バックエンド実装

#### 新規エンドポイント

**GET /api/vocab**
- 現在のサーバーバージョンを取得
- レスポンス: `VocabServerData`
  - serverRev: サーバーリビジョン番号
  - file: VocabFile
  - updatedAt: サーバー更新日時
  - updatedByClientId: 更新元クライアントID

**PUT /api/vocab**
- 通常同期（serverRev一致チェック）
- リクエスト: `VocabSyncRequest`
  - serverRev: 期待するサーバーリビジョン
  - file: VocabFile
  - clientId: クライアントID
- 409 Conflict: serverRevが一致しない場合

**PUT /api/vocab?force=true**
- 強制上書き（LWW）
- リクエスト: `VocabForceSyncRequest`
  - file: VocabFile
  - clientId: クライアントID
- バックアップを自動作成

#### ファイル構造

```
data/vault/u_{userId}/
├── vocab.json           # 単語データ本体
├── vocab_meta.json      # メタデータ（serverRev, updatedAt, updatedByClientId）
└── backups/
    ├── vocab_backup_rev1.json
    ├── vocab_backup_rev2.json
    └── ...              # 最新5件を保持
```

### D. UI変更

1. **認証不要でアクセス可能**
   - `/words`, `/study`, `/words/create`, `/words/:id` は認証なしでアクセス可能
   - ローカルで完全に動作

2. **同期ステータス表示**
   - 全ページ上部にSyncButtonを配置（Layout.tsx）
   - オンライン/オフライン状態
   - 最終同期日時
   - 未同期変更の有無（dirty flag）

3. **競合解決UI**
   - 409 Conflict時にモーダル表示
   - ローカル版 vs サーバー版の比較
   - ユーザーがどちらを採用するか選択

## マイグレーション手順

### 1. 既存ユーザーの初回同期

既存のサーバーデータがある場合:
```typescript
// App初期化時に実行（初回のみ）
await initializeSyncFromServer();
```

### 2. データの移行

既存のファイルベースのwords.jsonとmemory.jsonから:

```bash
# 既存データをエクスポート（移行前）
GET /api/io/export

# ローカルに初期データとしてインポート
# または初回同期でサーバーから取得
```

### 3. 段階的ロールアウト

1. **フェーズ1**: オフライン機能有効化（現在）
   - 既存APIは維持
   - オフライン版APIを並行運用

2. **フェーズ2**: 完全移行（将来）
   - `/words`個別エンドポイント廃止（任意）
   - `/vocab`エンドポイントのみ使用

## 注意事項

### A. 複数端末利用時の注意

- **同期単位がファイル全体のため、競合時に一方のデータが失われる可能性がある**
- 競合時はユーザーが「サーバー版取得」または「ローカル版で上書き」を選択
- サーバーはforce上書き前にバックアップを保存（最新5件）

### B. オフライン動作の制限

- 学習アルゴリズム（FSRS簡易版）はローカルで実行
- 完全再現ではなく、近似計算（サーバー側と多少の差異が生じる可能性）
- 同期時にサーバー側で再計算は行わない（クライアント側の結果を信頼）

### C. セキュリティ

- **端末の物理的なアクセス = データアクセス**
- IndexedDBは暗号化されない（ブラウザ標準）
- 機密性の高いメモ等には注意が必要

## テスト手順

### 1. オフライン動作確認

```typescript
// DevTools > Application > Service Workers > Offline にチェック
// または Chrome DevTools > Network > Offline

// 単語追加・編集・削除が動作することを確認
// 学習機能が動作することを確認
```

### 2. 同期確認

```typescript
// 1. オフラインで単語を追加
// 2. オンラインに戻す
// 3. Syncボタンをクリック
// 4. サーバーにデータが反映されることを確認

// GET /api/vocab でサーバーデータを確認
```

### 3. 競合解決確認

```typescript
// 1. 端末Aでオフライン編集 → 同期
// 2. 端末Bでオフライン編集 → 同期（競合発生）
// 3. 競合UIが表示されることを確認
// 4. 解決方法を選択して動作を確認
```

## トラブルシューティング

### IndexedDBが初期化されない

```typescript
// ブラウザコンソールで確認
await indexedDB.databases()

// 強制削除
indexedDB.deleteDatabase("LinguisticNodeDB")

// ページリロードで再初期化される
```

### 同期エラー: 401 Unauthorized

- ログイン状態を確認
- Syncボタンが自動的にログインプロンプトを表示

### 同期エラー: 409 Conflict

- 正常な動作（競合検出）
- 競合解決UIで対処

### データが消えた

```typescript
// LocalStorageのバックアップを確認
localStorage.getItem("vocab_backup_...")

// サーバー側バックアップを確認
data/vault/u_{userId}/backups/
```

## 今後の拡張

### 1. インクリメンタル同期

現在: ファイル全体を同期
将来: 変更差分のみ同期（CRDT等）

### 2. 自動同期

現在: 手動同期のみ
将来: オンライン復帰時に自動同期（オプション）

### 3. ServiceWorker対応

完全なPWA化
- オフライン時もアセット配信
- バックグラウンド同期

### 4. マルチテナント対応

- ユーザーごとの暗号化
- E2E暗号化（サーバーでも復号不可）

## 関連ドキュメント

- [MEMORY_LEVEL_SPEC.md](./MEMORY_LEVEL_SPEC.md) - 学習アルゴリズム仕様
- [TESTING.md](./TESTING.md) - テスト戦略

## まとめ

この実装により:
- ✅ オフラインで完全に動作
- ✅ 同期はユーザーの明示的な操作
- ✅ 認証は同期時のみ必須
- ✅ シンプルなLWW同期（競合解決付き）
- ✅ バックアップ機能

トレードオフ:
- ⚠️ ファイル全体同期（スケーラビリティに課題）
- ⚠️ 複数端末での同時編集時にデータロスの可能性
- ⚠️ ローカルIndexedDBは暗号化されない

将来的な改善が必要な場合は、CRDT等の更新履歴ベースの同期を検討してください。
