'use client';
import { SnapshotDeal } from '@/lib/types';
import { MEMBERS, TEAMS, TeamName } from '@/lib/types';

interface Props {
  deals: SnapshotDeal[];
  snapshotDate: string | null;
  targets: Record<string, number>;
}

interface RowMetrics {
  実績: number;
  Pipeline総額: number;
  着地見込み: number;
}

function calcRow(deals: SnapshotDeal[], owner?: string, team?: string): RowMetrics {
  const filtered = deals.filter(d => {
    if (owner) return d.owner === owner;
    if (team)  return d.team === team;
    return true;
  });
  let 実績 = 0, Pipeline総額 = 0, 着地見込み = 0;
  for (const d of filtered) {
    if (d.type === '実績') {
      実績 += d.pipelineAmount;
    } else {
      Pipeline総額 += d.pipelineAmount;
      着地見込み   += d.expectedAmount;
    }
  }
  return { 実績, Pipeline総額, 着地見込み };
}

function fmt(n: number): string {
  return n === 0 ? '—' : n.toLocaleString('ja-JP');
}

function MetricCell({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <td className={`py-1.5 px-3 text-right text-xs tabular-nums whitespace-nowrap ${
      dim ? 'text-gray-300' : 'text-gray-700'
    }`}>
      {fmt(value)}
    </td>
  );
}

function TargetDiffCell({ diff, allZero }: { diff: number; allZero?: boolean }) {
  if (allZero) return <td className="py-1.5 px-3 text-right text-xs tabular-nums whitespace-nowrap text-gray-300">—</td>;
  const color = diff >= 0 ? 'text-blue-600' : 'text-red-500';
  const label = diff === 0 ? '—' : (diff > 0 ? '+' : '') + diff.toLocaleString('ja-JP');
  return (
    <td className={`py-1.5 px-3 text-right text-xs tabular-nums font-semibold whitespace-nowrap ${color}`}>
      {label}
    </td>
  );
}

export default function TeamSummaryTable({ deals, snapshotDate, targets }: Props) {
  const total = calcRow(deals);
  const totalTarget = TEAMS.reduce((sum, team) => sum + (targets[team] ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">チーム別サマリー</h3>
        <span className="text-xs text-gray-400">
          {snapshotDate ? `${snapshotDate} 時点` : '現時点（最新）'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-2 px-4 font-medium text-gray-500 w-44">チーム / 担当者</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 whitespace-nowrap">目標</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 whitespace-nowrap">実績</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 whitespace-nowrap">Pipeline総額</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 whitespace-nowrap">着地見込み</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 whitespace-nowrap">目標－着地見込み</th>
            </tr>
          </thead>
          <tbody>
            {TEAMS.map(team => {
              const teamMetrics = calcRow(deals, undefined, team);
              const teamTarget = targets[team] ?? 0;
              const members = MEMBERS[team as TeamName];
              return [
                /* チーム行 */
                <tr key={`team-${team}`} className="bg-indigo-50 border-t border-gray-100">
                  <td className="py-2 px-4 font-bold text-gray-800">{team}</td>
                  <td className="py-2 px-3 text-right text-xs tabular-nums font-semibold whitespace-nowrap text-gray-700">
                    {fmt(teamTarget)}
                  </td>
                  <MetricCell value={teamMetrics.実績} />
                  <MetricCell value={teamMetrics.Pipeline総額} />
                  <MetricCell value={teamMetrics.着地見込み} />
                  <TargetDiffCell diff={teamMetrics.着地見込み - teamTarget} />
                </tr>,
                /* メンバー行 */
                ...members.map(member => {
                  const m = calcRow(deals, member);
                  const memberTarget = targets[member] ?? 0;
                  const allZero = m.実績 === 0 && m.Pipeline総額 === 0 && m.着地見込み === 0;
                  return (
                    <tr key={member} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className={`py-1.5 px-4 pl-8 ${allZero ? 'text-gray-300' : 'text-gray-600'}`}>
                        {member}
                      </td>
                      <td className={`py-1.5 px-3 text-right text-xs tabular-nums whitespace-nowrap ${allZero ? 'text-gray-300' : 'text-gray-500'}`}>
                        {fmt(memberTarget)}
                      </td>
                      <MetricCell value={m.実績}        dim={allZero} />
                      <MetricCell value={m.Pipeline総額} dim={allZero} />
                      <MetricCell value={m.着地見込み}   dim={allZero} />
                      <TargetDiffCell diff={m.着地見込み - memberTarget} allZero={allZero} />
                    </tr>
                  );
                }),
              ];
            })}

            {/* 合計行 */}
            <tr className="bg-gray-100 border-t-2 border-gray-200 font-bold">
              <td className="py-2 px-4 text-gray-800 text-xs">合 計</td>
              <td className="py-2 px-3 text-right text-xs tabular-nums text-gray-800 whitespace-nowrap">
                {totalTarget.toLocaleString('ja-JP')}
              </td>
              <td className="py-2 px-3 text-right text-xs tabular-nums text-gray-800 whitespace-nowrap">
                {total.実績.toLocaleString('ja-JP')}
              </td>
              <td className="py-2 px-3 text-right text-xs tabular-nums text-gray-800 whitespace-nowrap">
                {total.Pipeline総額.toLocaleString('ja-JP')}
              </td>
              <td className="py-2 px-3 text-right text-xs tabular-nums text-gray-800 whitespace-nowrap">
                {total.着地見込み.toLocaleString('ja-JP')}
              </td>
              <td className={`py-2 px-3 text-right text-xs tabular-nums font-bold whitespace-nowrap ${
                total.着地見込み - totalTarget >= 0 ? 'text-blue-600' : 'text-red-500'
              }`}>
                {totalTarget === 0 ? '—' : (total.着地見込み - totalTarget > 0 ? '+' : '') + (total.着地見込み - totalTarget).toLocaleString('ja-JP')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
