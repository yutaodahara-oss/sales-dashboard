// ============================================================
// データソース定義
// ============================================================

export type Section = 'フロー' | 'ストック' | 'MRR';
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
export type MetricKey = '実績' | '着地見込み' | 'Pipeline総額';
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

export const TEAMS = ['阪納軍', '村岡軍', '横山軍', '小田原'] as const;
export type TeamName = typeof TEAMS[number];

export const MEMBERS: Record<TeamName, string[]> = {
  '阪納軍': ['阪納 章加', '小川 裕真', '上西 秀明', '三田村 暢也'],
  '村岡軍': ['村岡 利彰', '和田 昂樹', '下川 太一'],
  '横山軍': ['横山 大輝', '篠田 龍一'],
  '小田原': ['小田原 祐太'],
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

export const SOURCE_GIDS = {
  'フロー実績':        '156746383',
  'フロー着地_Pipeline': '227275377',
  'ストック実績':      '404852902',
  'ストック着地_Pipeline': '50390764',
  'MRR実績':          '827037548',
  'MRR着地_Pipeline': '0',
} as const;

// GAS が書き込む SnapshotLog のシート名
export const SNAPSHOT_LOG_SHEET = '📸SnapshotLog';

// 目標シートの GID
export const TARGET_GID = '1439703039';
