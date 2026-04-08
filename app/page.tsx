'use client';
import { useState, useMemo } from 'react';
import { FilterState, ALL_MEMBERS } from '@/lib/types';
import { useDashboardData } from '@/hooks/useDashboardData';
import FilterBar from '@/components/FilterBar';
import DashboardSection from '@/components/DashboardSection';

export default function Dashboard() {
  const { logDeals, liveDeals, availableDates, lastUpdated, loading, error, hasSnapshotLog, targets, refresh } = useDashboardData();

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', teams: [], owners: [],
  });

  const availableOwners = useMemo(() => {
    const owners = new Set<string>();
    [...logDeals, ...liveDeals].forEach(d => { if (ALL_MEMBERS.includes(d.owner)) owners.add(d.owner); });
    return [...owners].sort();
  }, [logDeals, liveDeals]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">EX FS ダッシュボード</h1>
            <p className="text-xs text-gray-400">Salesforce 定点観測 — 毎日0時スナップショット蓄積</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">最終更新: {lastUpdated.toLocaleString('ja-JP')}</span>
            )}
            <button onClick={refresh} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm rounded-lg transition-colors">
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {loading ? '読込中...' : '更新'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-5">

        {/* GASセットアップ案内バナー */}
        {!loading && !hasSnapshotLog && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-lg flex-shrink-0">⚙️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">GASスナップショットがまだ設定されていません</p>
                <p className="text-xs text-amber-700 mt-1">
                  現在はライブデータ（最新値のみ）を表示しています。日次推移グラフを使うには以下のセットアップが必要です。
                </p>
                <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal ml-4">
                  <li>スプレッドシートを開く → 拡張機能 → Apps Script</li>
                  <li><code className="bg-amber-100 px-1 rounded">gas/snapshot.gs</code> の内容をコピー＆ペースト → 保存</li>
                  <li>関数を <code className="bg-amber-100 px-1 rounded">createTrigger</code> に切り替えて実行（毎日0時に自動記録開始）</li>
                  <li>関数を <code className="bg-amber-100 px-1 rounded">runNow</code> に切り替えて実行（今すぐ初回スナップショット取得）</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {hasSnapshotLog && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-5 flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-xs text-green-700">
              スナップショット蓄積中 — {availableDates.length}日分のデータあり
              （{availableDates[0]} 〜 {availableDates[availableDates.length - 1]}）
            </span>
          </div>
        )}

        {/* エラー表示 */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-red-600 text-sm font-medium">データ取得エラー</p>
            <p className="text-red-500 text-xs mt-1">{error}</p>
            <button onClick={refresh} className="mt-2 text-xs text-red-600 underline">再試行</button>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-gray-400">Salesforceデータを読み込んでいます...</p>
          </div>
        )}

        {!loading && (
          <>
            <FilterBar filters={filters} onChange={setFilters} availableOwners={availableOwners} />
            <DashboardSection type="net" logDeals={logDeals} liveDeals={liveDeals} filters={filters} targets={targets} />
            <DashboardSection type="mrr" logDeals={logDeals} liveDeals={liveDeals} filters={filters} targets={targets} />
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-3 px-6 mt-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between">
          <p className="text-xs text-gray-400">営業FSグループ 売上ダッシュボード v2</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400">最終更新: {lastUpdated.toLocaleString('ja-JP')}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
