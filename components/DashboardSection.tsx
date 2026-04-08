'use client';
import { useState, useMemo } from 'react';
import { SnapshotDeal, FilterState, Section, MetricKey, TargetMap, TEAMS } from '@/lib/types';
import { applyFilters, applyNonDateFilters, filterBySection, buildTrendData, buildBarData } from '@/lib/utils';
import TrendLineChart from './TrendLineChart';
import SummaryBarChart from './SummaryBarChart';
import DealsList from './DealsList';
import TeamSummaryTable from './TeamSummaryTable';

interface Props {
  type: 'net' | 'mrr';
  logDeals: SnapshotDeal[];
  liveDeals: SnapshotDeal[];
  filters: FilterState;
  targets: TargetMap;
}

const NET_SECTIONS: Section[] = ['フロー', 'ストック'];
const MRR_SECTIONS: Section[] = ['MRR'];

export default function DashboardSection({ type, logDeals, liveDeals, filters, targets }: Props) {
  const [selectedDate,   setSelectedDate]   = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);

  const sections = type === 'net' ? NET_SECTIONS : MRR_SECTIONS;
  const title    = type === 'net' ? 'NET売上' : '獲得MRR';
  const accent   = type === 'net' ? 'bg-orange-400' : 'bg-purple-400';

  // このセクション用の目標マップ
  const targetMap = type === 'net' ? targets.net : targets.mrr;

  // フィルター適用後の目標合計（折れ線・棒グラフ用）
  const targetTotal = useMemo(() => {
    if (filters.owners.length > 0) {
      return filters.owners.reduce((sum, name) => sum + (targetMap[name] ?? 0), 0);
    }
    if (filters.teams.length > 0) {
      return filters.teams.reduce((sum, team) => sum + (targetMap[team] ?? 0), 0);
    }
    return TEAMS.reduce((sum, team) => sum + (targetMap[team] ?? 0), 0);
  }, [filters, targetMap]);

  // 折れ線グラフ：SnapshotLog × 全フィルター適用
  const trendDeals = useMemo(() =>
    filterBySection(applyFilters(logDeals, filters), sections),
    [logDeals, filters, sections]
  );
  const trendData = useMemo(() => buildTrendData(trendDeals), [trendDeals]);

  // 棒グラフ・案件一覧：日付指定があればその日のログ、なければライブ
  // チーム/個人フィルターのみ（日付フィルターはトレンドのみに効かせる）
  const baseForBar = useMemo(() => {
    if (selectedDate) {
      return logDeals.filter(d => d.date === selectedDate);
    }
    return liveDeals.length > 0 ? liveDeals : (
      // ライブなし → ログの最新日
      (() => {
        const dates = [...new Set(logDeals.map(d => d.date))].sort();
        const latest = dates[dates.length - 1];
        return latest ? logDeals.filter(d => d.date === latest) : [];
      })()
    );
  }, [selectedDate, logDeals, liveDeals]);

  const barDeals = useMemo(() =>
    filterBySection(applyNonDateFilters(baseForBar, filters), sections),
    [baseForBar, filters, sections]
  );
  const barData = useMemo(() => buildBarData(barDeals), [barDeals]);

  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${accent}`} />
        {title}
        {selectedDate && (
          <span className="text-sm font-normal text-blue-500">
            — {selectedDate} のスナップショット表示中
          </span>
        )}
      </h2>

      {/* チーム別サマリーテーブル */}
      <TeamSummaryTable deals={barDeals} snapshotDate={selectedDate} targets={targetMap} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 左：折れ線グラフ */}
        <TrendLineChart
          data={trendData}
          title={title}
          selectedDate={selectedDate}
          onDateClick={date => { setSelectedDate(date); setSelectedMetric(null); }}
          target={targetTotal}
        />

        {/* 中：棒グラフ */}
        <SummaryBarChart
          data={barData}
          title={title}
          selectedDate={selectedDate}
          selectedMetric={selectedMetric}
          onMetricClick={setSelectedMetric}
          target={targetTotal}
        />

        {/* 右：案件一覧 */}
        <DealsList
          deals={barDeals}
          selectedMetric={selectedMetric}
          selectedDate={selectedDate}
          title={title}
        />
      </div>
    </section>
  );
}
