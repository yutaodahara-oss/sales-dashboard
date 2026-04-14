/**
 * 営業FSダッシュボード - 日次スナップショット GAS スクリプト
 *
 * 【使い方】
 * 1. Googleスプレッドシートを開く → 拡張機能 → Apps Script
 * 2. このコードを全文コピー＆ペースト → 保存
 * 3. 関数を「setupFourHourTrigger」に切り替えて「実行」→ 4時間ごとに自動スナップショット開始
 * 4. 「deployAsWebApp」を実行してWebアプリURLを取得 → .env.localに設定
 */

// ============================================================
// 設定
// ============================================================

// スナップショットを記録するシート名
var SNAPSHOT_SHEET_NAME = '📸SnapshotLog';

// 対象メンバーとチーム定義
var TEAMS = {
  '阪納軍': ['阪納 章加', '小川 裕真', '上西 秀明', '三田村 暢也'],
  '村岡軍': ['村岡 利彰', '和田 昂樹', '下川 太一'],
  '横山軍': ['横山 大輝', '篠田 龍一'],
  '小田原': ['小田原 祐太'],
};

// 全対象メンバー（Set）
var TARGET_MEMBERS = (function() {
  var set = {};
  Object.keys(TEAMS).forEach(function(team) {
    TEAMS[team].forEach(function(name) { set[name] = team; });
  });
  return set;
})();

// データソース定義（GID で識別）
var SOURCES = [
  { section: 'フロー',   type: '実績',        gid: 156746383  },
  { section: 'フロー',   type: '着地_Pipeline', gid: 227275377  },
  { section: 'ストック', type: '実績',        gid: 404852902  },
  { section: 'ストック', type: '着地_Pipeline', gid: 50390764   },
  { section: 'MRR',     type: '実績',        gid: 827037548  },
  { section: 'MRR',     type: '着地_Pipeline', gid: 0          },
];

// 列インデックス（0始まり）
// ※ SFDCレポートに [0]=フェーズ, [1]=確度(%) が追加されたため全列+2シフト済み
var COL = {
  PHASE:           0,   // フェーズ（新列）
  DEAL_NAME:       2,   // 商談名
  EXPECTED_AMT:    4,   // 期待値売上金額（着地見込み）
  PIPELINE_AMT:    5,   // 計上金額_売上（管理会計）（Pipeline）
  STAGE:           8,   // ヨミ_商談
  PRODUCT:        10,   // 提案製品-大区分_商談
  OWNER:          11,   // 商談 所有者
  ACCOUNT:        13,   // 取引先名
  CLOSE_DATE:     15,   // 完了予定月
};

// SnapshotLog ヘッダー（A〜M列）
var HEADER = [
  '取得日', 'section', 'type',
  '商談名', '担当者', '軍',
  '期待値売上金額', '計上金額_売上（管理会計）',
  '完了予定月', '取引先名', '製品区分', 'ヨミ', 'フェーズ'
];

// ============================================================
// メイン関数 - スナップショット取得
// ============================================================

function takeSnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  Logger.log('スナップショット開始: ' + today);

  // SnapshotLog シートを取得または作成
  var logSheet = ss.getSheetByName(SNAPSHOT_SHEET_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(SNAPSHOT_SHEET_NAME);
    logSheet.appendRow(HEADER);
    logSheet.setFrozenRows(1);
    logSheet.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
    Logger.log('SnapshotLog シートを新規作成しました');
  }

  // 今日分がすでにある場合は削除（冪等性）
  var existing = logSheet.getDataRange().getValues();
  var rowsToDelete = [];
  for (var i = 1; i < existing.length; i++) {
    if (existing[i][0] === today) rowsToDelete.push(i + 1);
  }
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    logSheet.deleteRow(rowsToDelete[j]);
  }
  if (rowsToDelete.length > 0) {
    Logger.log('既存の今日分 ' + rowsToDelete.length + ' 行を削除しました');
  }

  // 各ソースシートからデータ取得
  var allRows = [];
  var allSheets = ss.getSheets();

  SOURCES.forEach(function(src) {
    // GID でシートを特定
    var srcSheet = null;
    for (var k = 0; k < allSheets.length; k++) {
      if (allSheets[k].getSheetId() === src.gid) {
        srcSheet = allSheets[k];
        break;
      }
    }
    if (!srcSheet) {
      Logger.log('シートが見つかりません GID=' + src.gid);
      return;
    }

    var data = srcSheet.getDataRange().getValues();
    var count = 0;

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var owner = String(row[COL.OWNER] || '').trim();
      if (!TARGET_MEMBERS[owner]) continue; // 対象外メンバーはスキップ

      var closeDate = '';
      if (row[COL.CLOSE_DATE] instanceof Date) {
        closeDate = Utilities.formatDate(row[COL.CLOSE_DATE], 'Asia/Tokyo', 'yyyy-MM-dd');
      } else if (row[COL.CLOSE_DATE]) {
        closeDate = String(row[COL.CLOSE_DATE]);
      }

      allRows.push([
        today,                                  // A: 取得日
        src.section,                            // B: section
        src.type,                               // C: type
        String(row[COL.DEAL_NAME] || ''),       // D: 商談名
        owner,                                  // E: 担当者
        TARGET_MEMBERS[owner],                  // F: 軍
        Number(row[COL.EXPECTED_AMT] || 0),     // G: 期待値売上金額
        Number(row[COL.PIPELINE_AMT] || 0),     // H: 計上金額_売上
        closeDate,                              // I: 完了予定月
        String(row[COL.ACCOUNT] || ''),         // J: 取引先名
        String(row[COL.PRODUCT] || ''),         // K: 製品区分
        String(row[COL.STAGE] || ''),           // L: ヨミ
        String(row[COL.PHASE] || ''),           // M: フェーズ
      ]);
      count++;
    }
    Logger.log(src.section + ' ' + src.type + ': ' + count + '件取得');
  });

  // 一括書き込み
  if (allRows.length > 0) {
    var startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, allRows.length, HEADER.length).setValues(allRows);
    Logger.log('合計 ' + allRows.length + ' 行を書き込みました');
  }

  Logger.log('スナップショット完了: ' + today);
  return { date: today, rows: allRows.length };
}

// ============================================================
// Web App エンドポイント（Next.jsアプリから呼び出し）
// ============================================================

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  try {
    if (action === 'snapshot') {
      var result = takeSnapshot();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, date: result.date, rows: result.rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'status') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName(SNAPSHOT_SHEET_NAME);
      if (!logSheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ exists: false, dates: [], totalRows: 0 }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = logSheet.getDataRange().getValues();
      var dates = Array.from(new Set(
        data.slice(1).map(function(r) { return r[0]; }).filter(Boolean)
      )).sort();
      return ContentService
        .createTextOutput(JSON.stringify({ exists: true, dates: dates, totalRows: data.length - 1 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'action パラメータが必要です (snapshot / status)' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// セットアップ用関数（初回1回だけ実行）
// ============================================================

/** 4時間ごとに takeSnapshot を自動実行するトリガーを作成 */
function setupFourHourTrigger() {
  // 既存の takeSnapshot トリガーをすべて削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'takeSnapshot') ScriptApp.deleteTrigger(t);
  });
  // 4時間ごとのトリガーを新規作成
  ScriptApp.newTrigger('takeSnapshot')
    .timeBased()
    .everyHours(4)
    .create();
  Logger.log('✅ 4時間ごとのトリガーを設定しました');
}

/** 今すぐ手動でスナップショットを取得（テスト用） */
function runNow() {
  var result = takeSnapshot();
  Logger.log('手動実行完了: ' + JSON.stringify(result));
}
