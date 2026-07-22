# 議員実績MAP 汎用ツール 設計書（v0.1 ドラフト）

## 0. 目的・スコープ
議員・候補者が「地元で何をやったか」を、**現地で撮影した写真つきで地図に残せる**汎用ツール。
1つのサイト専用でなく、**どの議員HPにも独立して載せられる**部品にする。
政策動画（`policy-motion-comic`）に続く2本目の横展開プロダクト。

- 公開側：来訪者は地図で実績ピン＋写真を閲覧（読み取り専用）。
- 運用側：議員・スタッフが現地でスマホ撮影→GPS＋方位つきで自動ピン化。

---

## 1. 再利用マップ（何を流用し、何を作り直すか）

社内に**動く実装が2つ**ある。これらを合成するのが最短。

| 部品 | 出どころ | 扱い |
|---|---|---|
| 現地撮影ロジック（GPS watchPosition・コンパス・視野コーン・撮影→POST→写真PUT） | 沖田園NEW `capture.tsx`（536行・実証済み） | **ロジック流用**（Reactを外して静的JSへ） |
| 写真保存API（D1保存＋R2アップロード＋配信） | 沖田園NEW `functions/api/[[path]].ts` | **設計流用**（Honoを外しPages Functionsへ軽量化） |
| データモデル | 沖田園NEW `photo_points` テーブル | **流用＋汎用化**（カテゴリ・色・年次を追加） |
| 公開地図の見せ方（Leaflet＋緯度経度＋テアドロップピン＋サイドバー＋ポップアップ） | SHIBANO `map.html`（既存・稼働中） | **表示層に採用** |
| 議員ごとの個性（配色・地図中心/ズーム・カテゴリ・ロゴ） | 新規（`policy-motion-comic` のthemes.md方式） | **新規（config化）** |
| 認証（投稿できる人を絞る） | 新規 | **新規（要方式決定）** |

要点：**沖田園＝撮影側の頭脳／SHIBANO＝公開地図／config＝議員ごとの個性**。

---

## 2. アーキテクチャ（推奨：サイト別ドロップイン）

各議員の**自分のCloudflare**にキットを設置。データも各議員が所有（政治案件では混在させない）。

```
[議員HP(静的)]
  ├─ map.html         公開MAP（Leaflet, /api/pins をfetchして表示）
  ├─ capture.html     現地撮影（要ログイン｜GPS＋コンパス＋写真アップ）
  └─ functions/api/
        ├─ pins            GET(一覧) / POST(作成)
        ├─ pins/:id/photo  PUT(写真アップ→R2)
        └─ photos/*        GET(写真配信)
  ├─ D1: <議員>-map-db     ピンのメタデータ
  └─ R2: <議員>-map-photos 写真本体
```

- 公開MAPは誰でも閲覧、撮影ページだけ認証。
- 新議員への設置＝「D1/R2作成→バインド→config記入→デプロイ」＝**スキル化して繰り返す**。

（対案B：こちらが1つの共有サービスで全議員を管理＝設置は楽だが別会派のデータ集約で責任・漏えいリスク大。政治案件では非推奨。）

---

## 3. データモデル（`pins` ＝ 沖田園photo_points＋SHIBANO実績の合成）

```
pins(
  id            INTEGER PK
  title         TEXT   -- 「バス停付近 歩道整備」
  category      TEXT   -- インフラ/福祉医療/スポーツ文化…（色に対応）
  color         TEXT   -- ピン色（カテゴリ既定色でも可）
  year          TEXT   -- 「整備済み」「2024」など
  desc          TEXT   -- 説明
  latitude      REAL   -- 現地GPS
  longitude     REAL
  bearing       REAL   -- 撮影方位（任意）
  photo_key     TEXT   -- R2キー（任意：写真なしピンも可）
  captured      BOOL
  captured_at   TS
  published     BOOL   -- 公開MAPに出すか（下書き→確認→公開）
  created_at / updated_at
)
```
- 沖田園にあった `mapX/mapY`（独自SVG座標）は**不要**（Leafletは緯度経度で足りる）。
- SHIBANOの `streetview` は任意フィールドとして残せる（写真が無い地点用）。
- `published` を足すのが肝：**現地で撮る→あとで文言整えて公開**、の運用に。

---

## 4. API契約（沖田園を汎用化）

| メソッド | パス | 用途 | 認証 |
|---|---|---|---|
| GET | `/api/pins?published=1` | 公開MAP用の一覧 | 不要 |
| GET | `/api/pins` | 全件（下書き含む） | 要 |
| POST | `/api/pins` | ピン作成（撮影時にlat/lng/bearing） | 要 |
| PATCH | `/api/pins/:id` | 文言・カテゴリ・公開フラグ更新 | 要 |
| DELETE | `/api/pins/:id` | 削除（R2写真も削除） | 要 |
| PUT | `/api/pins/:id/photo` | 写真アップロード（本体bytes→R2） | 要 |
| GET | `/api/photos/*` | 写真配信（長期キャッシュ） | 不要 |

沖田園の実装がほぼこの形（`photo-points`→`pins` に改名するだけ）。写真は生bytesをPUT、R2に
`pins/:id/時刻.jpg` で保存、`captured=true` に更新、という流れも実証済み。

---

## 5. 画面構成
1. **公開MAP**（`map.html`）… SHIBANO既存を汎用化。`/api/pins?published=1` を読む。
2. **現地撮影**（`capture.html`・認証）… 沖田園capture.tsxの静的JS版。
   衛星地図＋現在地マーカー＋精度表示＋方角コンパス＋視野コーン＋「撮影して登録」。
3. **台帳/編集**（任意・認証）… 撮った地点の文言整え・公開切替（沖田園photo-registry.tsx相当）。

---

## 5.5 現地入力UX（GOLF JOURNEY流用・重要）
**撮影＝即保存は不可。必ず「撮る→確認→反映ボタン」の2段。**（`published` で担保）

現地の議員が片手で素早く・電波が悪くても入力できることが要件。GOLF JOURNEYの実証済み資産を流用：

| ほしい機能 | GOLF JOURNEYの該当 | 実績MAPでの実装 |
|---|---|---|
| ワンタップ簡易入力 | スコアのボタン1回記録 | カテゴリ／定型案件を**プリセットボタン**化（例:「ガードレール強化」「道路ミラー設置」「歩道整備」「街路樹」「側溝・水路」…議員が現地で対応しがちな案件） |
| 声によるデータ入力 | Telegram音声→**Whisper文字起こし**（worker実装済み） | 説明文を音声で。方式2択：(a)Web Speech API=サーバー不要・即時だが端末差/要オンライン (b)録音→サーバーWhisper=精度/一貫性◎・オフライン相性良（**推奨**、GOLF JOURNEY流用） |
| 圏外でも記録 | 「圏外でも記録OK」オフライン設計 | **オフライン下書き**（localStorage/キュー）→電波復帰で同期 |
| 使い捨てリンク認証 | Telegram link-code（1時間有効） | 認証方式の候補（下記6） |

## 6. 認証（要決定）
撮影・編集は本人/スタッフだけ。候補：
- (a) Cloudflare Access（メール/Google認証、設定だけで堅牢・おすすめ）
- (b) 合言葉＋Pages Functionsで簡易トークン（SHIBANOで一度使ったパスワードゲート方式の発展）
公開MAPと写真配信は認証不要。

---

## 7. config（議員ごとの差し替え）
```js
{ name:"しばの勝利", accent:"#E8720C",
  mapCenter:[35.83,139.80], zoom:13, minZoom:12, maxZoom:16,
  tiles:"gsi",            // 公開MAP=国土地理院 / 撮影=衛星(Esri)
  categories:[{name:"インフラ・まちづくり",color:"#ca8a04"}, ...] }
```

---

## 8. 段階リリース
- **P1**：しばので1本通す（D1/R2作成→capture.html→公開MAP接続→認証）。実データで検証。
- **P2**：config化・テーマ分離してキット化。
- **P3**：スキル化（新議員は手順を回すだけ）。田中HPへ2例目展開。

---

## 9. 決定事項・未決事項
### 決定済み ✅（2026-07-18）
- **データ保持：サイト別ドロップイン方式**。各議員が自分のCloudflareにキット設置・データ所有。政治案件のためデータ混在させない。
- **撮影の公開粒度：下書き→確認→反映ボタン→公開**（`published`）。撮影＝即保存は不可。
- **認証：Cloudflare Access**。capture.html と書き込みAPI（POST/PUT/PATCH）にAccessの壁。指定メール/Googleのみ通す。読み取り（公開MAP・GET）は誰でも可。
- **声入力：録音→サーバーWhisper**。GOLF JOURNEYの実装を流用。オフライン録音→復帰時に文字起こしとも相性良。

### 未決（このあと決める）
4. 写真の最適化：**クライアント側で縮小してから送る（推奨・暫定）**。回線負荷とR2容量を抑え、オフライン下書きにも収まりやすい。→ P1で実装しつつ最終確認。

---

## 10. P1 実装計画（しばの先行）

### P1-0 前提（★ユーザーのCloudflare操作が必要）
- R2バケット作成（写真保存用）
- D1データベース用意（しばの用。既存があれば流用）
- Cloudflare Access アプリ設定：`capture.html` と書き込みAPI（POST/PUT/PATCH）を保護。許可メール/Googleを登録
- Whisper APIキーをSecretに登録（GOLF JOURNEYのキー流用可か確認）
→ コードはこの前に先行実装可。設置時にまとめて手順書を出す。

### P1-1 データ層
- D1スキーマ `pins`：id / lat / lng / heading / category / title / note / photo_key / published / created_at（沖田園 `photo_points` 流用＋カテゴリ・色・公開フラグ追加）
- `functions/api/[[path]].ts`：
  - `GET /api/pins?published=1` 公開一覧（誰でも）
  - `POST /api/pins` 下書き作成（Access保護）
  - `PATCH /api/pins/:id` 編集・反映（published切替）
  - `PUT /api/pins/:id/photo` 写真アップ→R2
  - `POST /api/transcribe` 録音→Whisper→テキスト返却

### P1-2 撮影UI `capture.html`（静的HTML+JS｜沖田園ロジック移植）
- GPS watchPosition・コンパス・視野コーン（沖田園流用）
- 写真撮影（`<input capture>`）＋クライアント縮小
- プリセットカテゴリのワンタップボタン（初期セットは議員ヒアリング）
- 声入力：録音→`/api/transcribe`→説明欄に反映
- **下書き→確認→反映ボタン**の2段。オフライン下書き（localStorage）→復帰時同期

### P1-3 公開MAP改修 `map.html`
- 現状のピン直書き → `GET /api/pins?published=1` をfetchして描画に変更（★再デプロイ不要で反映）
- config（配色・中心座標・ズーム・カテゴリ）を分離

### P1-4 config化・汎用パッケージ
- 議員ごとの個性を1ファイルに集約 → 田中・自民会派へ横展開できる形に。`policy-motion-comic` 同様スキル化の土台。

### P1-5 検証・デプロイ
- 撮影→確認→反映→公開MAP反映の一連を検証（/verify）。しばのへデプロイ。

推奨着手順：**P1-1〜P1-4のコードを先行実装 → ユーザーがP1-0のCloudflare設定 → P1-5でデプロイ・検証**。
4. 写真の最適化：アップ時にサーバーで縮小するか、クライアントで縮小してから送るか。
5. ドメイン/デプロイ：しばのはドメイン移行フェーズと絡む（R2・Functions前提）。
6. 声入力の方式：Web Speech API（軽い）vs 録音→Whisper（推奨・GOLF JOURNEY流用）。
7. プリセットボタンの初期セット：議員がよく対応する案件の一覧をヒアリングして確定。
8. オフライン下書きの範囲：写真も含めてローカル保持するか（容量注意）／テキストのみか。
```
