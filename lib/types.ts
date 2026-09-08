// ============================================================
// データソース定義
// ============================================================

// GAS(10_snapshot.gs)が REPORT_SHEETS として書き込む値と完全一致させること
export type Section = 'フロー売上' | 'ストック売上' | 'MRR';
export type DataType = '実績' | '着地_Pipeline';

// GAS が SnapshotLog に書き込む1件分のレコード
export interface SnapshotDeal {
  date: string;           // YYYY-MM-DD
  section: Section;
  type: DataType;
  dealName: string;       // 商談名
  owner: string;          // 商談 所有者
  team: string;           // 軍名
  expectedAmount: number; // 期待値売上金額（着地見込みの元値）
  pipelineAmount: number; // 計上金額_売上（管理会計）（実績/Pipelineの元値）
  closeDate: string;      // 完了予定月
  accountName: string;    // 取引先名
  product: string;        // 製品区分
  stage: string;          // ヨミ
}

// ============================================================
// ダッシュボード集計型
// ============================================================

// 3指標のサマリー
export interface MetricSummary {
  実績: number;
  着地見込み: number;
  Pipeline総額: number;
}

// 折れ線グラフ用（日付 × 3指標）
export interface TrendPoint {
  date: string;
  実績: number;
  着地見込み: number;
  Pipeline総額: number;
}

// 棒グラフ用
export type MetricKey = '実績' | '必要Pipeline総額' | 'Pipeline総額' | '着地見込み';
export interface BarItem {
  metric: MetricKey;
  amount: number;
}

// 目標データ
export interface TargetMap {
  mrr: Record<string, number>;
  net: Record<string, number>;
}

// ============================================================
// フィルター
// ============================================================

// ※チーム構成の唯一の定義元は Google Apps Script 側の 00_teamMaster.gs。
//   変更する場合は必ず両方を同時に更新すること。
export const TEAMS = ['CGグループ', 'EPグループ', 'MMグループ阪納チーム', 'MMグループ横山チーム'] as const;
export type TeamName = typeof TEAMS[number];

export const MEMBERS: Record<TeamName, string[]> = {
  'CGグループ': ['山本 侑紀', '高橋 優太', '名畑 一生'],
  'EPグループ': ['村岡 利彰', '関 優大', '和中 北斗'],
  'MMグループ阪納チーム': ['阪納 章加', '小川 裕真', '和田 昂樹', '篠田 龍一'],
  'MMグループ横山チーム': ['横山 大輝', '下川 太一', '上西 秀明', '外山 桂子', '高村 拓樹'],
};

export const ALL_MEMBERS = Object.values(MEMBERS).flat();

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  teams: TeamName[];
  owners: string[];
}

// ============================================================
// データソース GID 定義
// ============================================================

// ライブ取得（SnapshotLogにまだ今日分が無いときのフォールバック）用の
// SFDCレポートタブ。各シートに フェーズ/確定フラグ相当の列があり、
// 1シートから 実績(確定) と 着地_Pipeline(見込みのみ) の両方を算出する。
export const LIVE_SHEET_GIDS: Record<Section, string> = {
  'MRR':      '1163889015',
  'ストック売上': '893564459',
  'フロー売上':  '306831779',
};

// GAS(10_snapshot.gs)が書き込む スナップショットログ のシート名
export const SNAPSHOT_LOG_SHEET = 'スナップショットログ_明細';

// 目標シート（担当者ごとの NET売上目標 / MRR目標）の GID
export const TARGET_GID = '489242425';
