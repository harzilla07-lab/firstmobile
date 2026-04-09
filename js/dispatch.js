// dispatch.js
const COLUMNS = [
  { status: 'pending',    label: 'Pending',    color: '#f59e0b' },
  { status: 'dispatched', label: 'Dispatched', color: '#3b82f6' },
  { status: 'in-transit', label: 'In Transit', color: '#10b981' },
  { status: 'delivered',  label: 'Delivered',  color: '#6366f1' },
];

function renderBoard() {
  const loads     = DB.get('loads');
  const customers = DB.get('customers');
  const carriers  = DB.get('carriers');
  const drivers   = DB.get('drivers');

  document.getElementById('dispatch-board').innerHTML = COLUMNS.map(col => {
    const colLoads = loads.filter(l => l.status === col.status);
    const cards = colLoads.map(l => {
      const shipper   = customers.find(c => c.id === l.shipperId);
      const consignee = customers.find(c => c.id === l.consigneeId);
      const carrier   = carriers.find(c => c.id === l.carrierId);
      const driver    = drivers.find(d => d.id === l.driverId);
      return `
        <div class="load-card" onclick="openDispatch(${l.id})">
          <div class="load-card-number">${esc(l.loadNumber)}</div>
          <div class="load-card-route">${esc(l.origin)} → ${esc(l.destination)}</div>
          <div class="load-card-meta">
            📅 ${fmtDate(l.pickupDate)}<br>
            📦 ${esc(l.commodity)} &bull; ${Number(l.weight||0).toLocaleString()} lbs<br>
            ${carrier ? `🚛 ${esc(carrier.name)}` : '<span style="color:#ef4444">⚠ Unassigned</span>'}
            ${driver  ? `<br>👤 ${esc(driver.name)}` : ''}
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:0.875rem;color:var(--primary)">${fmt$(l.rate)}</span>
            <span style="font-size:0.72rem;color:var(--text-muted)">${esc(shipper?.name||'')}</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="dispatch-col">
        <div class="dispatch-col-header">
          <span style="color:${col.color}">${col.label}</span>
          <span class="count">${colLoads.length}</span>
        </div>
        ${cards || '<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:16px 0">No loads</p>'}
      </div>`;
  }).join('');
}

function openDispatch(loadId) {
  const load      = DB.find('loads', loadId);
  const customers = DB.get('customers');
  const carriers  = DB.get('carriers').filter(c => c.status === 'active');
  const drivers   = DB.get('drivers');

  const shipper   = customers.find(c => c.id === load.shipperId);
  const consignee = customers.find(c => c.id === load.consigneeId);

  document.getElementById('dispatch-modal-title').textContent = `Assign – ${load.loadNumber}`;
  document.getElementById('dispatch-load-info').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase">Route</div>
        <div style="font-weight:600">${esc(load.origin)}</div>
        <div style="color:var(--text-muted)">→ ${esc(load.destination)}</div>
      </div>
      <div><div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase">Freight</div>
        <div>${esc(load.commodity)}</div>
        <div style="color:var(--text-muted)">${Number(load.weight||0).toLocaleString()} lbs</div>
      </div>
      <div><div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase">Shipper</div><div>${esc(shipper?.name||'—')}</div></div>
      <div><div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase">Rate</div><div style="font-weight:700;color:var(--primary)">${fmt$(load.rate)}</div></div>
    </div>`;

  // Carrier select
  const cSelect = document.getElementById('dispatch-carrier-select');
  cSelect.innerHTML = '<option value="">— Unassigned —</option>' +
    carriers.map(c => `<option value="${c.id}" ${load.carrierId==c.id?'selected':''}>${esc(c.name)} (${esc(c.equipment)})</option>`).join('');

  // Driver select — filter by carrier on change
  function populateDrivers(carrierId) {
    const dSelect = document.getElementById('dispatch-driver-select');
    const filtered = carrierId ? drivers.filter(d => d.carrierId === +carrierId) : drivers;
    dSelect.innerHTML = '<option value="">— No Driver —</option>' +
      filtered.map(d => `<option value="${d.id}" ${load.driverId==d.id?'selected':''}>${esc(d.name)} (${badge(d.status).replace(/<[^>]+>/g,'')})</option>`).join('');
  }
  populateDrivers(load.carrierId);
  cSelect.addEventListener('change', e => populateDrivers(e.target.value));

  // Status
  document.getElementById('dispatch-status-select').value = load.status;
  document.querySelector('#dispatch-form [name="loadId"]').value = loadId;

  openModal('dispatch-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  renderBoard();

  document.getElementById('btn-save-dispatch').addEventListener('click', () => {
    const fd   = new FormData(document.getElementById('dispatch-form'));
    const loadId    = +fd.get('loadId');
    const carrierId = fd.get('carrierId') ? +fd.get('carrierId') : null;
    const driverId  = fd.get('driverId')  ? +fd.get('driverId')  : null;
    const status    = fd.get('status');

    const load = DB.find('loads', loadId);
    load.carrierId = carrierId;
    load.driverId  = driverId;
    load.status    = status;
    DB.update('loads', load);

    // Update driver status
    if (driverId) {
      const driver = DB.find('drivers', driverId);
      if (driver) {
        driver.status = ['in-transit','dispatched'].includes(status) ? 'on-trip' : 'available';
        DB.update('drivers', driver);
      }
    }

    toast('Assignment saved');
    closeModal('dispatch-modal');
    renderBoard();
  });
});
