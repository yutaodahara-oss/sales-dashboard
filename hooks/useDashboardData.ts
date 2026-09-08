'use client';
import { useState, useEffect, useCallback } from 'react';
import { SnapshotDeal, Section, LIVE_SHEET_GIDS, SNAPSHOT_LOG_SHEET, TARGET_GID, TargetMap, TEAMS, MEMBERS, TeamName } from '@/lib/types';
import { parseGvizResponse, parseDealsFromGviz, parseGvizDate, isTargetMember, getTeamName } from '@/lib/utils';

// ============================================================
// 共通フェッチ
// ============================================================

async function fetchGviz(params: { gid?: string; sheet?: string }): Promise<ReturnType<typeof parseGvizResponse>> {
  const query = params.gid ? `gid=${params.gid}` : `sheet=${encodeURIComponent(params.sheet || '')}`;
  const res = await fetch(`/api/sheets?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parseGvizResponse(text);
}

// ============================================================
// ライブシートから今日分の SnapshotDeal を取得
// ============================================================
// SFDCレポートタブ（MRR / ストック売上 / フロー売上）は1シートに
// 確定・見込みの商談が混在しているため、1シートにつき1回の取得で
// 実績(確定)・着地_Pipeline(見込みのみ) の両方を算出する。

async function fetchLiveDeals(today: string): Promise<SnapshotDeal[]> {
  const sections = Object.keys(LIVE_SHEET_GIDS) as Section[];

  const results = await Promise.all(
    sections.map(async section => {
      const parsed = await fetchGviz({ gid: LIVE_SHEET_GIDS[section] });
      if (!parsed) return [];
      return parseDealsFromGviz(parsed.cols, parsed.rows, section, today);
    })
  );
  return results.flat();
}

// ============================================================
// 目標シートから目標値を取得
// ============================================================

async function fetchTargets(): Promise<TargetMap> {
  // 「目標値」シート: A列=担当者(姓 名 フルネーム) B列=チーム C列=NET売上目標 D列=MRR目標
  const parsed = await fetchGviz({ gid: TARGET_GID });
  if (!parsed) return { mrr: {}, net: {} };

  const net: Record<string, number> = {};
  const mrr: Record<string, number> = {};

  for (const row of parsed.rows) {
    const name = String(row?.c?.[0]?.v ?? '').trim();
    if (!name || !isTargetMember(name)) continue;
    net[name] = Number(row?.c?.[2]?.v ?? 0);
    mrr[name] = Number(row?.c?.[3]?.v ?? 0);
  }

  // チーム合計をメンバーから計算
  for (const team of TEAMS) {
    net[team] = MEMBERS[team as TeamName].reduce((s, m) => s + (net[m] ?? 0), 0);
    mrr[team] = MEMBERS[team as TeamName].reduce((s, m) => s + (mrr[m] ?? 0), 0);
  }

  return { mrr, net };
}

// ============================================================
// SnapshotLog シートから蓄積データを取得
// ============================================================

// スナップショットログ_明細 のヘッダー列（10_snapshot.gs の DETAIL_HEADER と完全一致させること）
// [0]取得日時 [1]section [2]商談名 [3]商談所有者 [4]チーム [5]フェーズ [6]確定フラグ
// [7]期待値売上金額 [8]計上金額_売上（管理会計） [9]完了予定月 [10]取引先名 [11]提案製品区分
async function fetchSnapshotLog(): Promise<SnapshotDeal[]> {
  const parsed = await fetchGviz({ sheet: SNAPSHOT_LOG_SHEET });
  if (!parsed || parsed.rows.length === 0) return [];

  const deals: SnapshotDeal[] = [];
  for (const row of parsed.rows) {
    if (!row?.c || row.c.length < 12) continue;
    const owner = String(row.c[3]?.v ?? '').trim();
    if (!owner || !isTargetMember(owner)) continue;

    const confirmedFlag = String(row.c[6]?.v ?? '').trim();

    deals.push({
      date:           parseGvizDate(row.c[0]) || String(row.c[0]?.v ?? '').slice(0, 10),
      section:        String(row.c[1]?.v ?? '') as Section,
      type:           confirmedFlag === '確定' ? '実績' : '着地_Pipeline',
      dealName:       String(row.c[2]?.v ?? ''),
      owner,
      team:           String(row.c[4]?.v ?? '') || getTeamName(owner),
      expectedAmount: Number(row.c[7]?.v ?? 0),
      pipelineAmount: Number(row.c[8]?.v ?? 0),
      closeDate:      parseGvizDate(row.c[9]) || String(row.c[9]?.v ?? ''),
      accountName:    String(row.c[10]?.v ?? ''),
      product:        String(row.c[11]?.v ?? ''),
      stage:          String(row.c[5]?.v ?? ''),
    });
  }
  return deals;
}

// ============================================================
// フック本体
// ============================================================

export interface DashboardData {
  /** 蓄積済み日次データ（折れ線グラフ用） */
  logDeals: SnapshotDeal[];
  /** 今日のライブデータ（棒グラフ・案件一覧の最新値） */
  liveDeals: SnapshotDeal[];
  /** SnapshotLog に記録されている日付一覧（昇順） */
  availableDates: string[];
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  hasSnapshotLog: boolean;
  targets: TargetMap;
  refresh: () => void;
}

export function useDashboardData(): DashboardData {
  const [logDeals,       setLogDeals]       = useState<SnapshotDeal[]>([]);
  const [liveDeals,      setLiveDeals]      = useState<SnapshotDeal[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [hasSnapshotLog, setHasSnapshotLog] = useState(false);
  const [targets,        setTargets]        = useState<TargetMap>({ mrr: {}, net: {} });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD

      const [log, live, tgts] = await Promise.all([
        fetchSnapshotLog().catch(() => []),
        fetchLiveDeals(today),
        fetchTargets().catch(() => ({ mrr: {}, net: {} })),
      ]);

      // SnapshotLog にすでに今日のデータがあればライブより優先しない（重複を避ける）
      const logDates = [...new Set(log.map(d => d.date))].sort();
      const todayInLog = logDates.includes(today);

      setLogDeals(log);
      // ライブデータ：今日がログにない場合は表示用に保持
      setLiveDeals(todayInLog ? [] : live);
      setAvailableDates(todayInLog ? logDates : [...logDates, today].filter((v, i, a) => a.indexOf(v) === i).sort());
      setHasSnapshotLog(log.length > 0);
      setTargets(tgts);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // 4時間ごとに自動更新
    const interval = setInterval(load, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  return { logDeals, liveDeals, availableDates, lastUpdated, loading, error, hasSnapshotLog, targets, refresh: load };
}
