/* ================= Shared helpers ================= */
/* Used by index.html, view.html and koha-tracker-offline.html — keep these
   three files' logic identical by editing this file, not by copy-pasting
   the same fix into each one separately. */

function money(n){
  const v = Number(n)||0;
  return '$' + v.toLocaleString('en-NZ', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtDate(d){
  if(!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString('en-NZ', {day:'numeric', month:'short', year:'numeric'});
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function huiTotals(t){
  let cash = 0;
  t.entries.forEach(e=>{
    if(e.type==='cash' || e.type==='both') cash += Number(e.amount)||0;
  });
  const expenses = (t.expenses||[]).reduce((sum,ex)=> sum + (Number(ex.amount)||0), 0);
  return {cash, total: t.entries.length, expenses, net: cash - expenses};
}
