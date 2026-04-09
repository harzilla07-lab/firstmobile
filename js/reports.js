// reports.js
function barChart(data, maxVal, colorFn) {
  if (!data.length) return '<p style="color:var(--text-muted);font-size:0.85rem">No data</p>';
  return data.map(({label, value, formatted}) => {
    const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;
    return `<div class="chart-bar-row">
      <div class="chart-bar-label">${esc(label)}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${pct}%;background:${colorFn(label)}"></div>
      </div>
      <div class="chart-bar-val">${formatted}</div>
    </div>`;
  }).join('');
}

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#6366f1','#ec4899','#14b8a6','#f97316'];
const colorOf = (i) => COLORS[i % COLORS.length];

document.addEventListener('DOMContentLoaded', () => {
  const loads     = DB.get('loads');
  const carriers  = DB.get('carriers');
  const customers = DB.get('customers');

  const delivered = loads.filter(l => l.status === 'delivered');
  const totalRev  = delivered.reduce((s,l) => s + (+l.rate||0), 0);
  const totalWt   = loads.reduce((s,l) => s + (+l.weight||0), 0);
  const avgRate   = delivered.length ? totalRev / delivered.length : 0;

  // ── Summary Stats ──
  document.getElementById('report-stats').innerHTML = [
    { icon:'💰', val: fmt$(totalRev),         label:'Total Revenue',      sub:'Delivered loads' },
    { icon:'📦', val: loads.length,            label:'Total Loads',        sub:'All statuses' },
    { icon:'✅', val: delivered.length,        label:'Delivered Loads',    sub:'Completed' },
    { icon:'📊', val: fmt$(avgRate),           label:'Avg Rate/Load',      sub:'Delivered' },
    { icon:'⚖',  val: (totalWt/2000).toFixed(1)+' T', label:'Total Tonnage', sub:'All loads' },
  ].map(s => `<div class="stat-card">
    <div class="stat-icon">${s.icon}</div>
    <div class="stat-value" style="font-size:1.5rem">${s.val}</div>
    <div class="stat-label">${s.label}</div>
    <div class="stat-sub">${s.sub}</div>
  </div>`).join('');

  // ── Revenue by Carrier ──
  const carrierRev = carriers.map((c,i) => {
    const rev = delivered.filter(l => l.carrierId === c.id).reduce((s,l) => s + (+l.rate||0), 0);
    return { label: c.name, value: rev, formatted: fmt$(rev), _i: i };
  }).filter(x => x.value > 0).sort((a,b) => b.value - a.value);
  const maxCR = carrierRev[0]?.value || 1;
  document.getElementById('carrier-revenue-chart').innerHTML =
    barChart(carrierRev, maxCR, (_,i) => colorOf(carrierRev.findIndex(x=>x.label===_)));

  // ── Loads by Status ──
  const statuses = ['pending','dispatched','in-transit','delivered','cancelled'];
  const statusColors = { pending:'#f59e0b', dispatched:'#3b82f6', 'in-transit':'#10b981', delivered:'#6366f1', cancelled:'#ef4444' };
  const statusData = statuses.map(s => ({
    label: s.replace(/-/g,' '),
    value: loads.filter(l => l.status === s).length,
    formatted: String(loads.filter(l => l.status === s).length),
    _s: s,
  })).filter(x => x.value > 0);
  const maxSt = Math.max(...statusData.map(x=>x.value), 1);
  document.getElementById('status-chart').innerHTML =
    barChart(statusData, maxSt, (lbl) => statusColors[lbl.replace(/\s/,'-')] || '#94a3b8');

  // ── Top Shippers ──
  const shipperRev = customers.filter(c=>['shipper','both'].includes(c.type)).map((c,i) => {
    const rev = delivered.filter(l => l.shipperId === c.id).reduce((s,l) => s + (+l.rate||0), 0);
    return { label: c.name, value: rev, formatted: fmt$(rev) };
  }).filter(x => x.value > 0).sort((a,b) => b.value - a.value).slice(0,6);
  const maxSR = shipperRev[0]?.value || 1;
  document.getElementById('shipper-chart').innerHTML =
    barChart(shipperRev, maxSR, (_,__,i) => colorOf(shipperRev.findIndex(x=>x.label===_)));

  // ── Commodity Volume ──
  const commMap = {};
  loads.forEach(l => {
    const c = l.commodity || 'Other';
    commMap[c] = (commMap[c]||0) + 1;
  });
  const commData = Object.entries(commMap)
    .map(([label, value]) => ({ label, value, formatted: `${value} loads` }))
    .sort((a,b) => b.value - a.value).slice(0,6);
  const maxCm = commData[0]?.value || 1;
  document.getElementById('commodity-chart').innerHTML =
    barChart(commData, maxCm, (_,__,i) => colorOf(commData.findIndex(x=>x.label===_)));

  // ── Summary Table ──
  const sorted = [...loads].sort((a,b) => b.id - a.id);
  document.getElementById('report-table-body').innerHTML = sorted.map(l => {
    const shipper = customers.find(c=>c.id===l.shipperId);
    const carrier = carriers.find(c=>c.id===l.carrierId);
    return `<tr>
      <td style="font-weight:700;color:var(--primary)">${esc(l.loadNumber)}</td>
      <td>${esc(shipper?.name||'—')}</td>
      <td><span style="font-size:0.8rem">${esc(l.origin)} → ${esc(l.destination)}</span></td>
      <td>${esc(l.commodity||'—')}</td>
      <td>${Number(l.weight||0).toLocaleString()} lbs</td>
      <td>${esc(carrier?.name||'—')}</td>
      <td>${badge(l.status)}</td>
      <td style="font-weight:600">${fmt$(l.rate)}</td>
    </tr>`;
  }).join('');
});
