'use client';
import { useState, useEffect, useCallback } from 'react';
import { SnapshotDeal, Section, SOURCE_GIDS, SNAPSHOT_LOG_SHEET, TargetMap, TEAMS, MEMBERS, TeamName, ALL_MEMBERS } from '@/lib/types';
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

async function fetchLiveDeals(today: string): Promise<SnapshotDeal[]> {
  const LIVE_SOURCES: Array<{ key: keyof typeof SOURCE_GIDS; section: Section; type: '実績' | '着地_Pipeline' }> = [
    { key: 'フロー実績',          section: 'フロー',   type: '実績' },
    { key: 'フロー着地_Pipeline', section: 'フロー',   type: '着地_Pipeline' },
    { key: 'ストック実績',         section: 'ストック', type: '実績' },
    { key: 'ストック着地_Pipeline',section: 'ストック', type: '着地_Pipeline' },
    { key: 'MRR実績',             section: 'MRR',     type: '実績' },
    { key: 'MRR着地_Pipeline',    section: 'MRR',     type: '着地_Pipeline' },
  ];

  const results = await Promise.all(
    LIVE_SOURCES.map(async src => {
      const parsed = await fetchGviz({ gid: SOURCE_GIDS[src.key] });
      if (!parsed) return [];
      return parseDealsFromGviz(parsed.rows, src.section, src.type, today);
    })
  );
  return results.flat();
}

// ============================================================
// 目標シートから目標値を取得
// ============================================================

async function fetchTargets(): Promise<TargetMap> {
  // サマリーシート（GID=920575235）のcol[1]=目標からNET/MRR目標を取得
  // 構造: NET行 → 「■ 獲得MRR」行 → MRR行
  const parsed = await fetchGviz({ gid: '920575235' });
  if (!parsed) return { mrr: {}, net: {} };

  const net: Record<string, number> = {};
  const mrr: Record<string, number> = {};
  let block: 'net' | 'mrr' = 'net';

  // 「阪納」→「阪納 章加」のように名字+スペースで前方一致して正式名を返す
  const toFullName = (short: string): string | undefined =>
    ALL_MEMBERS.find(m => m.startsWith(short + ' ') || m === short);

  for (const row of parsed.rows) {
    const name = String(row?.c?.[0]?.v ?? '').trim();
    const raw  = row?.c?.[1]?.v;

    if (!name) continue;
    if (name.includes('獲得MRR') || name === '■ 獲得MRR') { block = 'mrr'; continue; }
    if (name.includes('チーム') || name.includes('担当者')) continue;
    if (name.includes('合計') || name.startsWith('更新')) continue;
    if (raw === null || raw === undefined) continue;

    const amount = Number(raw);
    const dest   = block === 'net' ? net : mrr;
    const fullName = toFullName(name);
    if (fullName) dest[fullName] = amount;
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

async function fetchSnapshotLog(): Promise<SnapshotDeal[]> {
  const parsed = await fetchGviz({ sheet: SNAPSHOT_LOG_SHEET });
  if (!parsed || parsed.rows.length === 0) return [];

  const deals: SnapshotDeal[] = [];
  for (const row of parsed.rows) {
    if (!row?.c || row.c.length < 8) continue;
    const owner = String(row.c[4]?.v ?? '').trim();
    if (!isTargetMember(owner)) continue;

    deals.push({
      date:           parseGvizDate(row.c[0]) || String(row.c[0]?.v ?? ''),
      section:        String(row.c[1]?.v ?? '') as Section,
      type:           String(row.c[2]?.v ?? '') as '実績' | '着地_Pipeline',
      dealName:       String(row.c[3]?.v ?? ''),
      owner,
      team:           String(row.c[5]?.v ?? '') || getTeamName(owner),
      expectedAmount: Number(row.c[6]?.v ?? 0),
      pipelineAmount: Number(row.c[7]?.v ?? 0),
      closeDate:      parseGvizDate(row.c[8]) || String(row.c[8]?.v ?? ''),
      accountName:    String(row.c[9]?.v ?? ''),
      product:        String(row.c[10]?.v ?? ''),
      stage:          String(row.c[11]?.v ?? ''),
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
