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
// "Today" as a YYYY-MM-DD date in the device's own (NZ) time zone.
// Don't use new Date().toISOString().slice(0,10) for this — that's the UTC
// date, which is a day behind NZ every morning until 12/1pm.
function todayLocal(){ return localDateOf(new Date()); }
function localDateOf(d){
  d = new Date(d);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
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

/* Per-hui CSV export — used by all three apps' ⬇ CSV buttons. */
function exportCSV(t){
  const rows = [['#','Date','Whanau / Hapu','Type','Amount (NZD)','Food / Item Description','Note','Entered']];
  const ordered = [...t.entries].sort((a,b)=>a.ts-b.ts);
  ordered.forEach((e,i)=>{
    rows.push([
      i+1,
      e.date || '',
      e.name||'',
      e.type,
      e.type==='food' ? '' : (Number(e.amount)||0).toFixed(2),
      e.foodDesc||'',
      e.note||'',
      new Date(e.ts).toLocaleString('en-NZ')
    ]);
  });
  const totals = huiTotals(t);
  rows.push([]);
  rows.push(['','','TOTAL CASH KOHA', totals.cash.toFixed(2)]);
  rows.push(['','','TOTAL KOHA ENTRIES', totals.total]);

  if((t.expenses||[]).length){
    rows.push([]);
    rows.push(['EXPENSES']);
    rows.push(['#','Date','Description','Amount (NZD)']);
    const orderedEx = [...t.expenses].sort((a,b)=>a.ts-b.ts);
    orderedEx.forEach((ex,i)=>{
      rows.push([i+1, ex.date||'', ex.description||'', (Number(ex.amount)||0).toFixed(2)]);
    });
  }
  rows.push([]);
  rows.push(['','','TOTAL EXPENSES', totals.expenses.toFixed(2)]);
  rows.push(['','','NET (CASH KOHA - EXPENSES)', totals.net.toFixed(2)]);

  const csv = rows.map(r => r.map(cell=>{
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(',')).join('\n');

  // Leading \uFEFF (BOM) tells Excel the file is UTF-8, so macrons
  // (whānau, hapū) don't come out garbled.
  const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (t.name||'hui').replace(/[^a-z0-9]+/gi,'-').toLowerCase();
  a.href = url;
  a.download = `koha-${safeName}-${t.date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
