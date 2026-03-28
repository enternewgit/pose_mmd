# pose_mmd
Three.js と MediaPipe Pose を使って、MMDモデル動かせるプロダクトです。
東方学術合同向けに作成したものになります。
カメラがない場合の状況下で以下のMMDで動くことは確認しております。
https://bowlroll.net/file/242486
## 概要

- MMDモデル（PMX）を読み込んで表示
- カメラが使える場合は Pose 推定を適用
- カメラが使えない場合は擬似ランドマークに自動フォールバック
- 右下のランドマークパッドで擬似ランドマークを手動操作可能

## 前提環境

- Node.js 18 以上（推奨: 20 以上）
- npm 9 以上
- モダンブラウザ（Chrome / Edge 推奨）

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 開発サーバー起動

```bash
npm run dev
```

3. ブラウザで表示

```text
http://localhost:5173/
```

## 配布アセットについて

このリポジトリでは、モデル・テクスチャ資産を Git 管理対象外にしています。

- `public/models/` : PMX/PMD など
- `public/textures/` : テクスチャ画像

必要なファイルは、利用規約を確認したうえでローカル配置してください。

## フォルダ構成（主要）

```text
src/
	main.js                # エントリーポイント
	pose/
		pose.js              # MediaPipe初期化 / 擬似ランドマーク
		mapping.js           # ランドマーク -> MMDボーン回転
	three/
		scene.js             # Scene/Camera/Renderer/OrbitControls
		model.js             # PMX読み込み
		animation.js         # ボーン回転適用
```

## 操作方法

- マウス左ドラッグ: カメラ回転
- ホイール: ズーム
- マウス右ドラッグ: カメラ平行移動

擬似ランドマーク（カメラ未接続時）:

- 右下パッドで関節点をドラッグ
- マウスホイールで選択関節の Z（前後）調整
- 右クリックで選択関節の調整をリセット

## MMDの格納場所等について
ご使用のMMDのpmxファイルをpublic/modelsに移動させ、model.pmxとファイル名を変えてください。
.png、.bmpファイルたちはpublic/texturesに格納するといいでしょう。


## URLパラメータ

挙動を URL クエリで切り替えできます。

- `pose=0` : Pose連携を無効化
- `pseudoFallback=0` : カメラ未接続時の擬似ランドマークを無効化
- `pseudoMotion=1` : 擬似ランドマークの自動ゆらぎを有効化
- `sideView=1` : 起動時に横向きカメラ
- `debugModel=1` : モデル可視化デバッグ表示
- `safeMaterial=1` : 安全マテリアルで表示
- `poseMirror=1` : 左右ミラー対応
- `poseYSign=<number>` : Y軸符号補正（例: `-1`, `1`）
- `armShoulderYOffset=<number>` : 肩Y補正
- `armElbowYOffset=<number>` : 肘Y補正
- `armWristYOffset=<number>` : 手首Y補正

例:

```text
http://localhost:5173/?sideView=1&pose=1
```

## ビルド

```bash
npm run build
```

成果物は `dist/` に出力されます。

## トラブルシュート

### モデルが表示されない

- `public/models/model.pmx` が存在するか確認
- ブラウザコンソールに読み込みエラーがないか確認

### テクスチャが反映されない

- `public/textures/` に必要な画像があるか確認
- PMX が参照するファイル名と一致しているか確認

### カメラが使えない

- ブラウザのカメラ許可設定を確認
- デバイスが無い場合は擬似ランドマークへフォールバック

## Git運用メモ

`.gitignore` では以下を除外済みです。

- `public/models/`
- `public/textures/`

すでに追跡済みの場合は `.gitignore` 追加だけでは除外されないため、`git rm --cached` でインデックスから外してください。
