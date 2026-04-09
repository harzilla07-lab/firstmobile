// loads.js
let editingLoad = null;

function renderLoads(filter = '', statusFilter = '') {
  const loads     = DB.get('loads');
  const customers = DB.get('customers');
  const carriers  = DB.get('carriers');

  let data = loads;
  if (statusFilter) data = data.filter(l => l.status === statusFilter);
  if (filter) {
    const f = filter.toLowerCase();
    data = data.filter(l =>
      l.loadNumber.toLowerCase().includes(f) ||
      l.origin.toLowerCase().includes(f) ||
      l.destination.toLowerCase().includes(f) ||
      l.commodity.toLowerCase().includes(f)
    );
  }
  data = [...data].sort((a,b) => b.id - a.id);

  const tbody = document.getElementById('loads-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📦</div><h3>No loads found</h3><p>Try adjusting filters or add a new load.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(l => {
    const shipper   = customers.find(c => c.id === l.shipperId);
    const consignee = customers.find(c => c.id === l.consigneeId);
    const carrier   = carriers.find(c => c.id === l.carrierId);
    return `<tr>
      <td><span style="font-weight:700;color:var(--primary)">${esc(l.loadNumber)}</span></td>
      <td>
        <div style="font-weight:500">${esc(l.origin)}</div>
        <div style="color:var(--text-muted);font-size:0.78rem">→ ${esc(l.destination)}</div>
      </td>
      <td>
        <div style="font-size:0.82rem">${esc(shipper?.name || '—')}</div>
        <div style="color:var(--text-muted);font-size:0.75rem">${esc(consignee?.name || '—')}</div>
      </td>
      <td style="white-space:nowrap">${fmtDate(l.pickupDate)}</td>
      <td>${badge(l.status)}</td>
      <td>${esc(carrier?.name || '<span style="color:var(--text-muted)">Unassigned</span>')}</td>
      <td style="font-weight:600">${fmt$(l.rate)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="editLoad(${l.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLoad(${l.id},'${esc(l.loadNumber)}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openLoadModal(load = null) {
  editingLoad = load;
  const customers = DB.get('customers');
  const carriers  = DB.get('carriers');

  const shippers   = customers.filter(c => ['shipper','both'].includes(c.type));
  const consignees = customers.filter(c => ['consignee','both'].includes(c.type));

  const f = (arr, sel) => arr.map(c => `<option value="${c.id}" ${sel==c.id?'selected':''}>${esc(c.name)}</option>`).join('');
  const cOpts = [['','— Select Carrier —'], ...carriers.filter(c=>c.status==='active').map(c=>[c.id,c.name])];

  document.getElementById('load-modal-title').textContent = load ? `Edit Load – ${load.loadNumber}` : 'New Load';

  const lv = (k, d='') => load ? (load[k] ?? d) : d;

  document.getElementById('load-form').innerHTML = `
    <div class="form-grid">
      <div class="form-section-title">Shipment Details</div>

      <div class="form-group">
        <label>Load Number</label>
        <input name="loadNumber" value="${esc(lv('loadNumber', nextLoadNumber()))}" required>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          ${['pending','dispatched','in-transit','delivered','cancelled'].map(s=>`<option value="${s}" ${lv('status')==s?'selected':''}>${s.replace(/-/g,' ')}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Origin</label>
        <input name="origin" placeholder="City, ST" value="${esc(lv('origin'))}" required>
      </div>
      <div class="form-group">
        <label>Destination</label>
        <input name="destination" placeholder="City, ST" value="${esc(lv('destination'))}" required>
      </div>

      <div class="form-group">
        <label>Pickup Date</label>
        <input type="date" name="pickupDate" value="${esc(lv('pickupDate'))}" required>
      </div>
      <div class="form-group">
        <label>Delivery Date</label>
        <input type="date" name="deliveryDate" value="${esc(lv('deliveryDate'))}">
      </div>

      <div class="form-section-title">Customer</div>

      <div class="form-group">
        <label>Shipper</label>
        <select name="shipperId" required>
          <option value="">— Select Shipper —</option>
          ${f(shippers, lv('shipperId'))}
        </select>
      </div>
      <div class="form-group">
        <label>Consignee</label>
        <select name="consigneeId" required>
          <option value="">— Select Consignee —</option>
          ${f(consignees, lv('consigneeId'))}
        </select>
      </div>

      <div class="form-section-title">Freight Info</div>

      <div class="form-group">
        <label>Commodity</label>
        <input name="commodity" placeholder="e.g. Auto Parts" value="${esc(lv('commodity'))}" required>
      </div>
      <div class="form-group">
        <label>Rate ($)</label>
        <input type="number" name="rate" placeholder="0.00" value="${esc(lv('rate'))}" min="0" step="0.01" required>
      </div>
      <div class="form-group">
        <label>Weight (lbs)</label>
        <input type="number" name="weight" placeholder="0" value="${esc(lv('weight'))}" min="0">
      </div>
      <div class="form-group">
        <label>Pieces</label>
        <input type="number" name="pieces" placeholder="0" value="${esc(lv('pieces'))}" min="0">
      </div>

      <div class="form-section-title">Carrier Assignment</div>

      <div class="form-group">
        <label>Carrier</label>
        <select name="carrierId">
          ${cOpts.map(([v,t])=>`<option value="${v}" ${lv('carrierId')==v?'selected':''}>${esc(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea name="notes">${esc(lv('notes'))}</textarea>
      </div>
    </div>`;

  openModal('load-modal');
}

function editLoad(id) {
  openLoadModal(DB.find('loads', id));
}

function deleteLoad(id, name) {
  confirmDelete(name, () => {
    DB.delete('loads', id);
    toast(`${name} deleted`);
    renderLoads(
      document.getElementById('load-search').value,
      document.getElementById('load-status-filter').value
    );
  });
}

function saveLoad(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = Object.fromEntries(fd.entries());

  // coerce numerics
  ['rate','weight','pieces','shipperId','consigneeId','carrierId'].forEach(k => {
    obj[k] = obj[k] ? +obj[k] : null;
  });
  obj.driverId = editingLoad?.driverId || null;

  if (editingLoad) {
    obj.id = editingLoad.id;
    obj.createdAt = editingLoad.createdAt;
    DB.update('loads', obj);
    toast('Load updated');
  } else {
    obj.createdAt = new Date().toISOString().split('T')[0];
    DB.add('loads', obj);
    toast('Load created');
  }

  closeModal('load-modal');
  renderLoads(
    document.getElementById('load-search').value,
    document.getElementById('load-status-filter').value
  );
}

document.addEventListener('DOMContentLoaded', () => {
  renderLoads();

  document.getElementById('load-search').addEventListener('input', e =>
    renderLoads(e.target.value, document.getElementById('load-status-filter').value));
  document.getElementById('load-status-filter').addEventListener('change', e =>
    renderLoads(document.getElementById('load-search').value, e.target.value));

  document.getElementById('load-form').addEventListener('submit', saveLoad);
  document.getElementById('btn-new-load').addEventListener('click', () => openLoadModal());
});
