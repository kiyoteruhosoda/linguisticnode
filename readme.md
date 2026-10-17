# LinguisticNode

英単語を覚える（間隔をあけて復習する）アプリ。

## いまの状態（2026-10-17）

- **動いているのはスマホ版（Expo、`frontend/apps/mobile`）だけ。** 単語と覚えた具合は端末の中だけに持つ。
  配る版にはサーバの宛先（`EXPO_PUBLIC_API_BASE_URL`）を入れていないので、同期の画面はあってもつなぐ先が無い
- **Web 版とサーバ（FastAPI、`app/`・`frontend/apps/web`）は 2026-10-17 に廃止した**（[task #404](https://task.nolumia.com/tasks/404)）。
  naso で動かしていた容れ物・像・公開名 `ln.nolumia.com` は撤去済み（記録は deploy-repo PR #359）。
  サーバのデータ（利用者 3 人分）は naso の `/volume1/labbackup/migration/linguisticnode-retired-20261017/data.tgz` に退避してある
- **サーバ（FastAPI）のコードは 2026-10-17 にリポジトリから削除した**（[task #407](https://task.nolumia.com/tasks/407)、持ち主の決定）。
  `app/`・`tests/`・`Dockerfile`・`docker-compose*.yml`・`requirements*.txt` などはもう無い。戻すなら git の履歴から
- Web 版（`frontend/apps/web` と `frontend/src`）のコードはリポジトリに残している（どこでも動いていない）。消すかどうかは未定。
  ログインと同期はサーバにつなぐ作りなので、いまはつなぐ先が無い（ビルドと試験はサーバ無しで通る）
- **アカウント:** サーバを動かしていた頃は、誰でもアカウントを作れた（招待も人数の上限もなし）。それが意図だったかの記録は無い。
  サーバを廃止したので、いまはアカウントを作る所が無い。サーバを戻すなら、誰でも作れるままにするかを先に決める
- CI（forge）は `.forgejo/workflows/frontend-visual.yml`。`frontend/` を変えた PR で Web の品質の確かめ（`npm run test:ci`）と
  スマホ版の流れの確かめ（`npm run test:mobile:regression`）が走る。サーバの試験（pytest）はサーバごと削除した

## 開発

For frontend details, see `frontend/README.md`.

### Frontend commands（手元では流さない。CI と同じもの）

- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`

### Frontend routing summary（Web 版）

- Router: `react-router-dom` BrowserRouter (`frontend/src/App.tsx`)
- `/login`: login/register
- `/words`: word list (root redirect target)
- `/words/create`: create word
- `/words/:id`: word details
- `/study`: study flow
- `/examples`: examples testing


## Import/Export（ファイルの形式）

廃止したサーバの `/api/io/export`・`/api/io/import` の説明。ファイルの形式の参考として残す。
スマホ版の取り込みの振る舞いは `frontend/apps/mobile/src/domain/vocabFileNormalizer.ts` を見る。

### Export

User data can be exported as JSON for backup or data migration:

```sh
GET /api/io/export
```

**Response format:**
- `schemaVersion`: Data format version (currently 1)
- `exportedAt`: ISO 8601 timestamp
- `words`: Array of complete word entries (with IDs and timestamps)
- `memory`: Array of memory states for spaced-repetition

### Import

Data can be imported in two modes:

```sh
POST /api/io/import?mode=merge   # Default: merge with existing data
POST /api/io/import?mode=overwrite  # Replace all data
```

#### Flexible Input Format

The import endpoint accepts JSON in **two formats**:

**1. Exported data format (complete):**
- Includes all fields: `id`, `createdAt`, `updatedAt`, `dueAt`
- Perfect for restoring previous exports

**2. Manually-created format (flexible):**
- Can omit optional fields: `id`, `createdAt`, `updatedAt`, `examples`, `tags`, `memory`
- Missing IDs are auto-generated as UUIDs
- Missing timestamps are set to current time
- Perfect for quick manual data entry

#### Merge Logic (mode=merge)

When importing with merge mode, **existing words are compared by ID**:

| Situation | Behavior |
|-----------|----------|
| **New ID (not in existing data)** | ✅ Added as new word |
| **Existing ID + older timestamp** | ⏸️ Existing data preserved (import ignored) |
| **Existing ID + newer timestamp** | 🔄 Overwritten with import data |

**Key points:**
- If you omit `id` in manual files → UUID auto-generated → Always added as new
- If you specify `id` → Compared with existing data → May merge/overwrite
- Timestamp comparison prevents accidental downgrades

#### Overwrite Logic (mode=overwrite)

Completely replaces all data:
```sh
POST /api/io/import?mode=overwrite
```

**All existing words and memory states are deleted** and replaced with import data.

#### Examples

**Minimal manual file (only required fields - guaranteed to add as new):**
```json
{
  "schemaVersion": 1,
  "words": [
    {
      "headword": "improve",
      "pos": "verb",
      "meaningJa": "改善する"
    }
  ]
}
```
- ✅ ID auto-generated (UUID)
- ✅ Timestamps auto-generated (current time)
- ✅ Added as new word guaranteed (no duplicates)

**File with custom ID (will merge with existing data):**
```json
{
  "schemaVersion": 1,
  "words": [
    {
      "id": "my-custom-id",
      "headword": "test",
      "pos": "verb",
      "meaningJa": "テスト"
    }
  ]
}
```
- ✅ ID explicitly specified
- ✅ Timestamps auto-generated
- ⚠️ May merge with existing ID (timestamp decides)

**Complete exported data (all fields):**
```json
{
  "schemaVersion": 1,
  "exportedAt": "2024-01-15T10:30:45Z",
  "words": [
    {
      "id": "uuid-123",
      "headword": "improve",
      "pos": "verb",
      "meaningJa": "改善する",
      "memo": "進捗",
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z",
      "examples": [
        {
          "id": "ex-uuid-1",
          "en": "I want to improve my skills.",
          "ja": "スキルを向上させたい。"
        }
      ],
      "tags": ["work", "growth"]
    }
  ],
  "memory": [
    {
      "wordId": "uuid-123",
      "easiness": 2.5,
      "interval": 10,
      "repetitions": 5,
      "dueAt": "2024-02-10T08:00:00Z"
    }
  ]
}
```
- ✅ All fields preserved
- ✅ Merge logic applies (timestamp comparison)

**Typical workflow:**
1. Export from LinguisticNode → get complete format
2. Create manually → use minimal format
3. Merge imports → existing data + new data
4. Overwrite imports → full replacement
