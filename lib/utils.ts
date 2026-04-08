import {
  SnapshotDeal, Section, FilterState, MetricKey,
  TrendPoint, BarItem, MetricSummary, ALL_MEMBERS,
} from './types';

// ============================================================
// チーム判定
// ============================================================

export function getTeamName(owner: string): string {
  if (/阪納|小川|上西|三田村/.test(owner)) return '阪納軍';
  if (/村岡|和田|下川/.test(owner)) return '村岡軍';
  if (/横山|篠田/.test(owner)) return '横山軍';
  if (/小田原/.test(owner)) return '小田原';
  return 'その他';
}

export function isTargetMember(owner: string): boolean {
  return ALL_MEMBERS.includes(owner);
}

// ============================================================
// フィルター適用
// ============================================================

export function applyFilters(deals: SnapshotDeal[], f: FilterState): SnapshotDeal[] {
  return deals.filter(d => {
    if (f.dateFrom && d.date < f.dateFrom) return false;
    if (f.dateTo && d.date > f.dateTo) return false;
    if (f.teams.length > 0 && !f.teams.includes(d.team as never)) return false;
    if (f.owners.length > 0 && !f.owners.includes(d.owner)) return false;
    return true;
  });
}

// 棒グラフ・案件一覧用：日付フィルターなし（チーム/担当者のみ）
export function applyNonDateFilters(deals: SnapshotDeal[], f: FilterState): SnapshotDeal[] {
  return deals.filter(d => {
    if (f.teams.length > 0 && !f.teams.includes(d.team as never)) return false;
    if (f.owners.length > 0 && !f.owners.includes(d.owner)) return false;
    return true;
  });
}

// ============================================================
// セクション絞り込み
// ============================================================

export function filterBySection(deals: SnapshotDeal[], sections: Section[]): SnapshotDeal[] {
  return deals.filter(d => sections.includes(d.section));
}

// ============================================================
// 集計
// ============================================================

/**
 * 3指標を計算する
 * - 実績     = type='実績' の pipelineAmount 合計
 * - 着地見込み = type='着地_Pipeline' の expectedAmount 合計
 * - Pipeline = type='着地_Pipeline' の pipelineAmount 合計
 */
export function calcMetrics(deals: SnapshotDeal[]): MetricSummary {
  let 実績 = 0, 着地見込み = 0, Pipeline総額 = 0;
  for (const d of deals) {
    if (d.type === '実績') {
      実績 += d.pipelineAmount;
    } else {
      着地見込み += d.expectedAmount;
      Pipeline総額 += d.pipelineAmount;
    }
  }
  return { 実績, 着地見込み, Pipeline総額 };
}

/** 日次トレンドデータを構築（Snapshot_Log の日付ごと） */
export function buildTrendData(deals: SnapshotDeal[]): TrendPoint[] {
  const byDate: Record<string, SnapshotDeal[]> = {};
  for (const d of deals) {
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ds]) => {
      const m = calcMetrics(ds);
      return { date, ...m };
    });
}

/** 棒グラフデータ（実績 → Pipeline総額 → 着地見込み の順） */
export function buildBarData(deals: SnapshotDeal[]): BarItem[] {
  const m = calcMetrics(deals);
  const METRIC_KEYS: MetricKey[] = ['実績', 'Pipeline総額', '着地見込み'];
  return METRIC_KEYS.map(k => ({ metric: k, amount: m[k] }));
}

// ============================================================
// 表示フォーマット
// ============================================================

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.slice(5).replace('-', '/'); // MM/DD
}

// ============================================================
// gviz レスポンスのパース
// ============================================================

interface GvizCell { v: string | number | boolean | null; f?: string }
interface GvizRow  { c: (GvizCell | null)[] }

export function parseGvizDate(cell: GvizCell | null): string {
  if (!cell || cell.v === null) return '';
  const v = String(cell.v);
  const m = v.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (m) {
    const year = parseInt(m[1]);
    const month = parseInt(m[2]) + 1;
    const day = parseInt(m[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (typeof cell.v === 'string') {
    const d = new Date(cell.v);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return '';
}

export function parseGvizResponse(text: string): { cols: {label: string, type: string}[], rows: GvizRow[] } | null {
  const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return { cols: data.table?.cols || [], rows: data.table?.rows || [] };
  } catch {
    return null;
  }
}

/**
 * ライブシート（GID指定）から SnapshotDeal[] を生成する
 * gviz の行から直接 deal を作る
 */
export function parseDealsFromGviz(
  rows: GvizRow[],
  section: Section,
  type: '実績' | '着地_Pipeline',
  snapshotDate: string
): SnapshotDeal[] {
  const deals: SnapshotDeal[] = [];
  for (const row of rows) {
    if (!row?.c || row.c.length < 10) continue;
    const owner = String(row.c[9]?.v ?? '').trim();
    if (!isTargetMember(owner)) continue;

    deals.push({
      date: snapshotDate,
      section,
      type,
      dealName:       String(row.c[0]?.v  ?? ''),
      owner,
      team:           getTeamName(owner),
      expectedAmount: Number(row.c[2]?.v  ?? 0),
      pipelineAmount: Number(row.c[3]?.v  ?? 0),
      closeDate:      parseGvizDate(row.c[13]),
      accountName:    String(row.c[11]?.v ?? ''),
      product:        String(row.c[8]?.v  ?? ''),
      stage:          String(row.c[6]?.v  ?? ''),
    });
  }
  return deals;
}
