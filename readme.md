# LinguisticNode

英単語を覚える（間隔をあけて復習する）アプリ。

## いまの状態（2026-10-17）

- **動いているのはスマホ版（Expo、`frontend/apps/mobile`）だけ。** 単語と覚えた具合は端末の中だけに持つ。
  配る版にはサーバの宛先（`EXPO_PUBLIC_API_BASE_URL`）を入れていないので、同期の画面はあってもつなぐ先が無い
- **Web 版とサーバ（FastAPI、`app/`・`frontend/apps/web`）は 2026-10-17 に廃止した**（[task #404](https://task.nolumia.com/tasks/404)）。
  naso で動かしていた容れ物・像・公開名 `ln.nolumia.com` は撤去済み（記録は deploy-repo PR #359）。
  サーバのデータ（利用者 3 人分）は naso の `/volume1/labbackup/migration/linguisticnode-retired-20261017/data.tgz` に退避してある
- サーバと Web 版のコードはリポジトリに残している（どこでも動いていない）。消すかどうかは未定
- **アカウント:** サーバを動かしていた頃は、誰でもアカウントを作れた（招待も人数の上限もなし）。それが意図だったかの記録は無い。
  サーバを廃止したので、いまはアカウントを作る所が無い。サーバを戻すなら、誰でも作れるままにするかを先に決める
- CI（forge）は `.forgejo/workflows/frontend-visual.yml`。`frontend/` を変えた PR で Web の品質の確かめ（`npm run test:ci`）と
  スマホ版の流れの確かめ（`npm run test:mobile:regression`）が走る。サーバの試験（pytest）は CI に無い（廃止したため足さない）

以下は廃止前の説明（2026-10-17 まで）。サーバの API 一覧・stg と本番の手順などは、いまは動かない。

---

## （廃止前）概要

LinguisticNode is a vocabulary learning and spaced-repetition memory app, featuring a FastAPI backend and a React (TypeScript) frontend. The project is fully containerized with Docker.

## Project Structure

```
app/
  __init__.py
  main.py              # FastAPI app creation and middleware
  settings.py          # Configuration and environment variables
  models.py            # Pydantic models for API and data
  security.py          # Password hashing and validation
  sessions.py          # Session management
  storage.py           # File-based data storage
  services.py          # Business logic layer
  deps.py              # Dependency injection (auth, etc.)
  routers/             # API endpoint modules
    __init__.py
    auth.py            # Authentication endpoints
    words.py           # Word CRUD endpoints
    study.py           # Spaced-repetition study endpoints
    io.py              # Import/export endpoints
  middleware.py        # Request logging
  middleware_bodylog.py
  errors.py            # Error handling utilities
  logging_setup.py     # Structured logging configuration

tests/                 # Test suite (pytest)
  __init__.py
  conftest.py          # Test fixtures and configuration
  test_auth.py         # Authentication tests
  test_words.py        # Word management tests
  test_study.py        # Study flow tests
  test_io.py           # Import/export tests

data/                  # User data (not tracked by git)
  users/
    users.json
  vault/
    u_<userId>/
      words.json
      memory.json
      settings.json

frontend/src/          # React frontend
  api/                 # API client modules
  auth/                # Authentication context
  pages/               # Page components
  components/          # Reusable UI components

scripts/
  bump_version.sh      # Version management script

docker-compose.yml     # Container orchestration
Dockerfile             # Backend container definition
requirements.txt       # Python dependencies
pytest.ini             # Pytest configuration
```

## Setup & Build

```sh
cd /work/project/03.linguisticnode
./scripts/bump_version.sh && sudo docker compose up -d --build
```

## API Endpoints

All API endpoints are prefixed with `/api`:

- `GET /healthz` - Health check (no auth required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/words` - List user's words
- `POST /api/words` - Create new word
- `PUT /api/words/{id}` - Update word
- `DELETE /api/words/{id}` - Delete word
- `GET /api/study/next` - Get next card for review
- `POST /api/study/grade` - Grade a card (again/hard/good/easy)
- `GET /api/io/export` - Export user data
- `POST /api/io/import` - Import user data (overwrite/merge)

## Testing

Run the test suite:

```sh
# Install dependencies (if not using Docker)
pip install -r requirements.txt

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

## API Health Check

```sh
curl http://localhost:8000/healthz
```

The `/healthz` endpoint returns API status, app version, and git commit hash.

## Features

- **FastAPI Backend**: Modern async Python framework with automatic OpenAPI docs
- **User Authentication**: Secure password hashing with Argon2, session-based auth
- **Vocabulary Management**: Full CRUD operations for vocabulary entries
- **Spaced Repetition**: SM-2 algorithm for optimized learning
- **Data Isolation**: Per-user data storage with file-based persistence
- **Import/Export**: Backup and restore user data in JSON format
- **Structured Logging**: Request correlation, audit trails, observability
- **Comprehensive Tests**: Unit and integration tests with pytest
- **Docker Support**: Containerized deployment with docker-compose



## Staging Environment (pre-production)

本番前検証向けに `docker-compose.stg.yml` と運用スクリプトを追加しています。

### 一回だけやる事前準備

1. stg 用 env を作成

```sh
cp .env.sample .env.stg
```

2. `.env.stg` を編集（必須）

- `PASSWORD_PEPPER` を安全な値へ変更
- 必要に応じて `STG_API_PORT` / `STG_WEB_PORT` / `STG_HOST_DATA_DIR` を調整
- `STG_HOST_DATA_DIR` が存在しない場合、`envctl.sh stg up/build` 実行時に自動作成されます

3. 初回ビルド（任意: `up` に `--build` が含まれるため省略可能）

```sh
./scripts/envctl.sh stg build ./.env.stg
```

### 毎回やるデプロイ手順（stg）

```sh
# 1) Deploy (build + up)
./scripts/envctl.sh stg up ./.env.stg

# 2) Health / Status
./scripts/envctl.sh stg ps ./.env.stg

# 3) Logs
./scripts/envctl.sh stg logs ./.env.stg

# 4) Error-only logs (last 30 minutes, regex filtered)
./scripts/envctl.sh stg errors ./.env.stg
# or compatibility wrapper
./scripts/stg_errors.sh ./.env.stg

# 5) Endpoint probe (HTTP/HTTPS headers + /api redirect check)
./scripts/envctl.sh stg probe ./.env.stg nolumia.com
# or compatibility wrapper
./scripts/stg_probe.sh ./.env.stg nolumia.com

# 6) Nginx logs only (web container)
./scripts/envctl.sh stg nginx-logs ./.env.stg
# or compatibility wrapper
./scripts/stg_nginx_logs.sh ./.env.stg

# 7) Show resolved ports and source of values
./scripts/envctl.sh stg ports ./.env.stg
# or generic helper (stg/prod/debug)
./scripts/show_ports.sh stg ./.env.stg
```

### 毎回やる停止手順（stg）

```sh
./scripts/envctl.sh stg down ./.env.stg
```

### 本番デプロイ手順（既存運用）

本番はこれまでどおり `prod` を指定して運用できます。

```sh
# build
./scripts/envctl.sh prod build

# deploy
./scripts/envctl.sh prod up

# logs
./scripts/envctl.sh prod logs
```

### 同一イメージ昇格（推奨）

本番品質を高める観点では、**stg で検証した同一イメージを prod へ昇格**する運用が推奨です。

```sh
./scripts/promote_same_image.sh <api_image> <web_image> <from_tag> <to_tag>
```

例: `stg-20260227` を `prod-20260227` へタグ昇格。

### 補足

- 既定ポート（stg）
  - API: `http://localhost:18000`
  - Web: `http://localhost:18080`
- stg Web コンテナは `18080` で **HTTP待受** です。`https://<host>:18080` は TLS ハンドシェイク不一致で `ERR_SSL_PROTOCOL_ERROR` になります。
- `/api` へのアクセスで `307/308` が返る場合は、上流アプリのスラッシュ正規化によるリダイレクトです（`/api/` を利用してください）。
- `docker-compose.stg.yml` では stg 用 API コンテナに `linguisticnode-api` エイリアスを付与し、既存 `nginx.conf` の upstream 設定を再利用しています。
- 既存の `stg_up.sh / stg_logs.sh / stg_down.sh / build_env.sh` は互換ラッパーとして利用可能です。
- `Database Initialization Error: crypto.randomUUID is not a function` が出る場合、ブラウザ実行環境が `randomUUID` 非対応でも、アプリ側でフォールバック UUID 生成へ自動切替されます。


### ポート解決の考え方（どこを見るか）

`envctl.sh <env> ports` は次の順で値を解決します。

1. `docker-compose*.yml` のポートマッピング定義（例: `"${STG_WEB_PORT:-18080}:80"`）
2. 環境ファイル（`stg` は `.env.stg`、`prod/debug` は `.env`）
3. compose 側のデフォルト値（`:-18080` のような fallback）

つまり、**「.env/.env.stg と docker-compose の両方を見る」**のが正解です。

確認コマンド例:

```sh
./scripts/envctl.sh stg ports ./.env.stg
./scripts/envctl.sh prod ports ./.env
./scripts/envctl.sh debug ports ./.env
```

## VSCode Remote Debug

このリポジトリには `.vscode/launch.json` と `.vscode/tasks.json` を追加済みです。

- `Backend: FastAPI (uvicorn)` : FastAPI を VSCode から直接デバッグ実行
- `Backend: Attach (debugpy :5678)` : すでに `debugpy` で起動したリモート Python プロセスへアタッチ
- `Frontend: Chrome` : Vite を起動して Chrome デバッグ
- `Fullstack: Backend + Frontend` : バックエンドとフロントエンドを同時デバッグ

### Attach モード利用例（リモートプロセス）

```sh
python -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

上記コマンドで待受後、VSCode の `Backend: Attach (debugpy :5678)` を選択してください。

### Docker でのリモートデバッグ

`docker-compose.debug.yml` を追加し、API(debugpy:5678) と Frontend(Vite:5173) の開発向けコンテナを分離しました。

```sh
# Debug containers up
docker compose -f docker-compose.debug.yml up --build

# Debug containers down
docker compose -f docker-compose.debug.yml down
```

VSCode では `Docker: Attach FastAPI (debugpy)` を使うと、上記 compose を preLaunch/postDebug task で自動起動・停止できます。

## Development

### Running Locally (without Docker)

```sh
# Backend
cd /work/project/03.linguisticnode
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Environment Variables

Key environment variables (see `.env.sample`):

- `VOCAB_DATA_DIR` - Data storage directory (default: `./data`)
- `VOCAB_WEB_ORIGIN` - CORS allowed origin
- `VOCAB_COOKIE_SECURE` - Use secure cookies (true in production)
- `VOCAB_SESSION_TTL_SECONDS` - Session lifetime

## Requirements

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)

## Architecture

LinguisticNode follows a clean layered architecture:

1. **API Layer** (`routers/`): HTTP endpoints, request/response models
2. **Service Layer** (`services.py`): Business logic, framework-agnostic
3. **Storage Layer** (`storage.py`): File I/O, atomic writes, user locks
4. **Security Layer** (`security.py`, `sessions.py`): Auth, password management

This separation ensures testability, maintainability, and clear boundaries.

---

For frontend details, see `frontend/README.md`.

### Frontend CI-equivalent commands

- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`

### Frontend routing summary

- Router: `react-router-dom` BrowserRouter (`frontend/src/App.tsx`)
- `/login`: login/register
- `/words`: word list (root redirect target)
- `/words/create`: create word
- `/words/:id`: word details
- `/study`: study flow
- `/examples`: examples testing


## Import/Export

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
