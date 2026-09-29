/**
 * Google Sheets storage for AI Loan Eligibility Checker
 * 1. Create a Google Sheet. Extensions > Apps Script. Paste this file.
 * 2. Deploy > New deployment > type "Web app".
 *    Execute as: Me. Who has access: Anyone.
 * 3. Copy the Web app URL into the app's Settings > Google Sheets Web App URL.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var d = JSON.parse(e.postData.contents);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Time','Tool','Name','Income','Existing EMI','Score','Loan','Rate','Years','EMI','Result']);
  }
  sheet.appendRow([d.time, d.type, d.name || '', d.income || '', d.existingEmi || '',
    d.score || '', d.loan || '', d.rate || '', d.years || '', d.emi || '', d.result || '']);
  return ContentService.createTextOutput('ok');
}
