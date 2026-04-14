'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BarItem, MetricKey } from '@/lib/types';
import { formatAmount } from '@/lib/utils';

interface Props {
  data: BarItem[];
  title: string;
  selectedDate: string | null;
  selectedMetric: MetricKey | null;
  onMetricClick: (m: MetricKey | null) => void;
  target?: number;
}

const COLORS: Record<MetricKey, string> = {
  '実績':             '#f97316',
  '必要Pipeline総額': '#818cf8',
  'Pipeline総額':     '#94a3b8',
  '着地見込み':        '#34d399',
};

export default function SummaryBarChart({ data, title, selectedDate, selectedMetric, onMetricClick, target }: Props) {
  const handleClick = (entry: BarItem) => {
    onMetricClick(selectedMetric === entry.metric ? null : entry.metric);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-full">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {title} {selectedDate ? `${selectedDate.slice(5)} 時点` : '現時点'}
        </h3>
        {selectedMetric && (
          <button onClick={() => onMetricClick(null)}
            className="text-xs text-blue-500 hover:text-blue-700">絞込解除</button>
        )}
      </div>
      {target !== undefined && target > 0 && (
        <p className="text-xs text-gray-400 mb-1">
          目標: <span className="font-medium text-gray-600">{formatAmount(target)}</span>
        </p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={formatAmount} width={52} />
          <Tooltip formatter={(v) => formatAmount(Number(v))} />
          {target !== undefined && target > 0 && (
            <ReferenceLine y={target} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3"
              label={{ value: '目標', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />
          )}
          <Bar dataKey="amount" cursor="pointer" radius={[4, 4, 0, 0]}
            onClick={(entry: any) => handleClick(entry as BarItem)}>
            {data.map(entry => (
              <Cell key={entry.metric} fill={COLORS[entry.metric]}
                opacity={selectedMetric && selectedMetric !== entry.metric ? 0.35 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
