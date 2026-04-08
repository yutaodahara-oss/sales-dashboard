'use client';
import { SnapshotDeal, MetricKey } from '@/lib/types';
import { formatAmount } from '@/lib/utils';

interface Props {
  deals: SnapshotDeal[];
  selectedMetric: MetricKey | null;
  selectedDate: string | null;
  title: string;
}

const METRIC_COLORS: Record<MetricKey, string> = {
  '実績':    'bg-orange-100 text-orange-700',
  '着地見込み': 'bg-green-100 text-green-700',
  'Pipeline総額': 'bg-slate-100 text-slate-600',
};

function dealToMetric(d: SnapshotDeal): MetricKey {
  return d.type === '実績' ? '実績' : '着地見込み';
}

export default function DealsList({ deals, selectedMetric, selectedDate, title }: Props) {
  const filtered = deals.filter(d => {
    if (!selectedMetric) return true;
    if (selectedMetric === '実績') return d.type === '実績';
    if (selectedMetric === '着地見込み') return d.type === '着地_Pipeline';
    if (selectedMetric === 'Pipeline総額') return d.type === '着地_Pipeline';
    return true;
  });

  // 棒グラフの「Pipeline総額」クリック時は計上金額を、「着地見込み」クリック時は期待値を表示
  const getAmount = (d: SnapshotDeal): number =>
    selectedMetric === 'Pipeline総額' ? d.pipelineAmount : d.expectedAmount || d.pipelineAmount;

  const sorted = [...filtered].sort((a, b) => getAmount(b) - getAmount(a));
  const total = sorted.reduce((s, d) => s + getAmount(d), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">
          {title} 案件一覧
          {selectedDate && <span className="text-xs font-normal text-blue-500 ml-1">({selectedDate.slice(5)})</span>}
        </h3>
        <span className="text-xs text-gray-500">
          {sorted.length}件 / {formatAmount(total)}
        </span>
      </div>

      {selectedMetric && (
        <div className={`text-xs px-2 py-1 rounded mb-2 inline-flex w-fit ${METRIC_COLORS[selectedMetric] || 'bg-gray-100 text-gray-600'}`}>
          {selectedMetric} で絞り込み中
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight: '420px' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500 whitespace-nowrap">商談名</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500 whitespace-nowrap">担当</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500 whitespace-nowrap">区分</th>
              <th className="text-right py-1.5 px-2 font-medium text-gray-500 whitespace-nowrap">金額</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-1 px-2 text-gray-800 max-w-[160px]">
                  <div className="truncate" title={d.dealName}>{d.dealName || '—'}</div>
                  {d.accountName && (
                    <div className="text-gray-400 truncate text-xs" title={d.accountName}>{d.accountName}</div>
                  )}
                </td>
                <td className="py-1 px-2 text-gray-600 whitespace-nowrap">{d.owner.split(' ')[0]}</td>
                <td className="py-1 px-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${METRIC_COLORS[dealToMetric(d)]}`}>
                    {dealToMetric(d)}
                  </span>
                </td>
                <td className="py-1 px-2 text-right font-medium text-gray-800 whitespace-nowrap">
                  {formatAmount(getAmount(d))}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">データなし</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
