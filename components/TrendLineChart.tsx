'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendPoint } from '@/lib/types';
import { formatAmount } from '@/lib/utils';

interface Props {
  data: TrendPoint[];
  title: string;
  selectedDate: string | null;
  onDateClick: (date: string | null) => void;
  target?: number;
}

const COLORS = { '実績': '#f97316', '着地見込み': '#34d399', 'Pipeline総額': '#94a3b8' };

export default function TrendLineChart({ data, title, selectedDate, onDateClick, target }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (d: any) => {
    const label = d?.activeLabel;
    if (!label || typeof label !== 'string') return;
    onDateClick(selectedDate === label ? null : label);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-full">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-semibold text-gray-700">{title} 日次推移</h3>
        {selectedDate && (
          <button onClick={() => onDateClick(null)}
            className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            {selectedDate.slice(5)} 選択中 <span>×</span>
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">日付クリック → 右2グラフがその日に切替</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-xs text-gray-400">
          GASスナップショット蓄積後にトレンドが表示されます
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} onClick={handleClick} style={{ cursor: 'pointer' }}
            margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={formatAmount} width={52} />
            <Tooltip formatter={(v) => formatAmount(Number(v))} labelFormatter={l => `${l}`} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            {selectedDate && <ReferenceLine x={selectedDate} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />}
            {target !== undefined && target > 0 && (
              <ReferenceLine y={target} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3"
                label={{ value: '目標', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />
            )}
            {(['実績', '着地見込み', 'Pipeline総額'] as const).map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[k]}
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
