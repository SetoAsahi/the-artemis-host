# The Artemis

高級キャバクラ「The Artemis」の公式サイト用リポジトリです。

## 機能

- 黒×ゴールドのレスポンシブ公開サイト
- キャスト / 料金 / NEWS / EVENT / ACCESS / RECRUIT
- 予約フォーム / 求人応募フォーム
- `/admin` の管理画面
- キャスト追加・削除・写真アップロード
- サイト内容のオンライン保存
- 予約・応募データの管理
- Supabase Database / Storage / Edge Function 対応
- Render Blueprint 対応

## Render

このリポジトリの `render.yaml` をBlueprintとして読み込みます。

Render側で次の秘密情報を設定してください。

- `ADMIN_PASSWORD` — 管理画面用の強いパスワード
- `ARTEMIS_ADMIN_SECRET` — Supabase側の管理API用シークレット

`ARTEMIS_ADMIN_SECRET` と `ADMIN_PASSWORD` はGitHubへコミットしないでください。

公開ページ: `/`

管理画面: `/admin`
