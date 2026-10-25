# LinguisticNode（廃止）

英単語を覚える（間隔をあけて復習する）アプリだった。**すべて廃止した。**

- **Web 版とサーバ**: 2026-10-17 に廃止（[task #404](https://task.nolumia.com/tasks/404)、[task #407](https://task.nolumia.com/tasks/407)）。
  naso の容れ物・像・公開名 `ln.nolumia.com` は撤去済み（deploy-repo PR #359）。
  サーバのデータ（利用者 3 人分）は naso の `/volume1/labbackup/migration/linguisticnode-retired-20261017/data.tgz` に退避してある
- **スマホ版（Expo）と、残っていた Web 版のコード**: 2026-10-25 にリポジトリから消した（[task #688](https://task.nolumia.com/issues/688)、持ち主の決定「Expo はもう使っていない」）。
  スマホ版のデータは端末の中だけにあった

## 戻すとき

コードは git の履歴にある。消す直前の main は `aa51e80`（スマホ版は Expo SDK 58・react-native 0.88 に上げた後）。

```sh
git checkout aa51e80 -- frontend .forgejo/workflows/frontend-visual.yml
```
