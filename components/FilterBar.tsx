'use client';
import { FilterState, TEAMS, MEMBERS, TeamName } from '@/lib/types';

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  availableOwners: string[];
}

export default function FilterBar({ filters, onChange, availableOwners }: Props) {
  const toggleTeam = (team: TeamName) => {
    const teams = filters.teams.includes(team)
      ? filters.teams.filter(t => t !== team)
      : [...filters.teams, team];
    const teamMembers = MEMBERS[team];
    const owners = filters.teams.includes(team)
      ? filters.owners.filter(o => !teamMembers.includes(o))
      : filters.owners;
    onChange({ ...filters, teams, owners });
  };

  const toggleOwner = (owner: string) => {
    const owners = filters.owners.includes(owner)
      ? filters.owners.filter(o => o !== owner)
      : [...filters.owners, owner];
    onChange({ ...filters, owners });
  };

  const clearAll = () => onChange({ ...filters, teams: [], owners: [] });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 w-8">期間</span>
          <input type="date" value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span className="text-gray-400 text-sm">〜</span>
          <input type="date" value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          {(filters.dateFrom || filters.dateTo) && (
            <button onClick={() => onChange({ ...filters, dateFrom: '', dateTo: '' })}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">クリア</button>
          )}
        </div>
        <div className="w-px h-8 bg-gray-200 self-center hidden md:block" />
        <div className="flex items-start gap-2">
          <span className="text-xs font-semibold text-gray-500 w-12 mt-1.5">チーム</span>
          <div className="flex flex-wrap gap-1.5">
            {TEAMS.map(team => (
              <button key={team} onClick={() => toggleTeam(team)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  filters.teams.includes(team)
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                }`}>
                {team}
              </button>
            ))}
          </div>
        </div>
        <div className="w-px h-8 bg-gray-200 self-center hidden md:block" />
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-500 w-8 mt-1.5">個人</span>
          <div className="flex flex-wrap gap-1">
            {availableOwners.map(owner => (
              <button key={owner} onClick={() => toggleOwner(owner)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                  filters.owners.includes(owner)
                    ? 'bg-blue-100 text-blue-700 border-blue-400'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                }`}>
                {owner.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        {(filters.teams.length > 0 || filters.owners.length > 0) && (
          <button onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-600 transition-colors self-center flex-shrink-0">
            絞り込み解除
          </button>
        )}
      </div>
    </div>
  );
}
