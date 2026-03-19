# Claude Code ルール

## コード変更後の必須チェック

**コードを変更したら必ず push 前に以下を実行すること。**

```bash
cd frontend && npm run lint && npm run typecheck && npm run test -- --run && npm run build
```

モバイル側を変更した場合は追加で:

```bash
cd apps/mobile && npx tsc --noEmit
```

### ミスが起きた原因と対策

| 過去のミス | 原因 | 対策 |
|-----------|------|------|
| 未使用変数の lint エラーを出した (showMenu 等) | コード削除後に lint を確認しなかった | コードを削除・変更したら **必ず lint を実行** して未使用変数・未使用 import がないか確認する |
| モバイル側の型エラー (mobileSpeechGateway に stop() が未実装) | インターフェース変更時にすべての実装を確認しなかった | interface/type を変更したら **すべての実装ファイルを検索** して漏れがないか確認する |
| `erasableSyntaxOnly` エラー | TypeScript のコンパイル設定を考慮しなかった | `constructor(public x)` 等のパラメータプロパティは使用禁止。明示的プロパティ宣言を使う |

## ブランチ運用

- 開発ブランチ: `claude/fix-ui-audio-issues-6JjXn`
- push は必ず `git push -u origin <branch>` で行う
