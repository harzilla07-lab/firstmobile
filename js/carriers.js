// carriers.js
let editingCarrier = null;
let editingDriver  = null;

function renderCarriers(filter = '', statusFilter = '') {
  let data = DB.get('carriers');
  if (statusFilter) data = data.filter(c => c.status === statusFilter);
  if (filter) {
    const f = filter.toLowerCase();
    data = data.filter(c =>
      c.name.toLowerCase().includes(f) ||
      (c.mc||'').toLowerCase().includes(f) ||
      (c.dot||'').toLowerCase().includes(f) ||
      (c.contact||'').toLowerCase().includes(f)
    );
  }

  const drivers = DB.get('drivers');
  const tbody = document.getElementById('carriers-tbody');

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="es-icon">🚛</div><h3>No carriers found</h3><p>Try adjusting filters or add a carrier.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => {
    const driverCount = drivers.filter(d => d.carrierId === c.id).length;
    const available   = drivers.filter(d => d.carrierId === c.id && d.status === 'available').length;
    return `<tr>
      <td><span style="font-weight:600">${esc(c.name)}</span></td>
      <td><div>${esc(c.mc||'—')}</div><div style="color:var(--text-muted);font-size:0.75rem">${esc(c.dot||'—')}</div></td>
      <td><div>${esc(c.contact||'—')}</div><div style="color:var(--text-muted);font-size:0.75rem">${esc(c.phone||'')}</div></td>
      <td>${esc(c.equipment||'—')}</td>
      <td>${driverCount} <span style="color:var(--text-muted);font-size:0.75rem">(${available} avail)</span></td>
      <td>${badge(c.status)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="editCarrier(${c.id})">Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="viewDrivers(${c.id})">Drivers</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCarrier(${c.id},'${esc(c.name)}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openCarrierModal(carrier = null) {
  editingCarrier = carrier;
  document.getElementById('carrier-modal-title').textContent = carrier ? `Edit – ${carrier.name}` : 'New Carrier';
  const v = (k,d='') => carrier ? (carrier[k]??d) : d;
  document.getElementById('carrier-form').innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Carrier Name</label><input name="name" value="${esc(v('name'))}" required placeholder="Company name"></div>
      <div class="form-group"><label>MC Number</label><input name="mc" value="${esc(v('mc'))}" placeholder="MC-123456"></div>
      <div class="form-group"><label>DOT Number</label><input name="dot" value="${esc(v('dot'))}" placeholder="DOT-987654"></div>
      <div class="form-group"><label>Contact Name</label><input name="contact" value="${esc(v('contact'))}"></div>
      <div class="form-group"><label>Phone</label><input name="phone" value="${esc(v('phone'))}" placeholder="(555) 000-0000"></div>
      <div class="form-group full"><label>Email</label><input type="email" name="email" value="${esc(v('email'))}"></div>
      <div class="form-group">
        <label>Equipment Type</label>
        <select name="equipment">
          ${['Dry Van','Reefer','Flatbed','Step Deck','Lowboy','Tanker','Intermodal','Other']
            .map(e=>`<option ${v('equipment')===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          <option value="active" ${v('status','active')==='active'?'selected':''}>Active</option>
          <option value="inactive" ${v('status')==='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
    </div>`;
  openModal('carrier-modal');
}

function editCarrier(id) { openCarrierModal(DB.find('carriers', id)); }

function deleteCarrier(id, name) {
  confirmDelete(name, () => {
    DB.delete('carriers', id);
    toast(`${name} removed`);
    renderCarriers(document.getElementById('carrier-search').value, document.getElementById('carrier-status-filter').value);
  });
}

function saveCarrier(e) {
  e.preventDefault();
  const obj = Object.fromEntries(new FormData(e.target).entries());
  if (editingCarrier) { obj.id = editingCarrier.id; DB.update('carriers', obj); toast('Carrier updated'); }
  else { DB.add('carriers', obj); toast('Carrier added'); }
  closeModal('carrier-modal');
  renderCarriers(document.getElementById('carrier-search').value, document.getElementById('carrier-status-filter').value);
}

// ── Drivers ───────────────────────────────────────────────────────────────────
function viewDrivers(carrierId) {
  const carrier = DB.find('carriers', carrierId);
  const drivers = DB.get('drivers').filter(d => d.carrierId === carrierId);
  document.getElementById('drivers-carrier-name').textContent = carrier?.name || '';
  document.getElementById('drivers-carrier-id').value = carrierId;

  const list = document.getElementById('drivers-list');
  list.innerHTML = drivers.length
    ? drivers.map(d => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:0.875rem">${esc(d.name)}</div>
          <div style="color:var(--text-muted);font-size:0.78rem">${esc(d.phone)} &bull; ${esc(d.license)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${badge(d.status)}
          <button class="btn btn-secondary btn-sm" onclick="editDriver(${d.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDriver(${d.id},'${esc(d.name)}')">Del</button>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:0.875rem;padding:16px 0">No drivers for this carrier.</p>';

  openModal('drivers-modal');
}

function openDriverModal(carrierId, driver = null) {
  editingDriver = driver;
  document.getElementById('driver-modal-title').textContent = driver ? 'Edit Driver' : 'Add Driver';
  const v = (k,d='') => driver ? (driver[k]??d) : d;
  document.getElementById('driver-form').innerHTML = `
    <input type="hidden" name="carrierId" value="${carrierId}">
    <div class="form-grid">
      <div class="form-group full"><label>Full Name</label><input name="name" value="${esc(v('name'))}" required></div>
      <div class="form-group"><label>Phone</label><input name="phone" value="${esc(v('phone'))}"></div>
      <div class="form-group"><label>CDL License #</label><input name="license" value="${esc(v('license'))}"></div>
      <div class="form-group full">
        <label>Status</label>
        <select name="status">
          <option value="available" ${v('status','available')==='available'?'selected':''}>Available</option>
          <option value="on-trip"   ${v('status')==='on-trip'?'selected':''}>On Trip</option>
          <option value="off-duty"  ${v('status')==='off-duty'?'selected':''}>Off Duty</option>
        </select>
      </div>
    </div>`;
  openModal('driver-modal');
}

function editDriver(id) {
  const driver = DB.find('drivers', id);
  openDriverModal(driver.carrierId, driver);
}

function deleteDriver(id, name) {
  confirmDelete(name, () => {
    const carrierId = DB.find('drivers', id)?.carrierId;
    DB.delete('drivers', id);
    toast(`${name} removed`);
    if (carrierId) viewDrivers(carrierId);
  });
}

function saveDriver(e) {
  e.preventDefault();
  const obj = Object.fromEntries(new FormData(e.target).entries());
  obj.carrierId = +obj.carrierId;
  const carrierId = obj.carrierId;
  if (editingDriver) { obj.id = editingDriver.id; DB.update('drivers', obj); toast('Driver updated'); }
  else { DB.add('drivers', obj); toast('Driver added'); }
  closeModal('driver-modal');
  viewDrivers(carrierId);
  renderCarriers(document.getElementById('carrier-search').value, document.getElementById('carrier-status-filter').value);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCarriers();

  document.getElementById('carrier-search').addEventListener('input', e =>
    renderCarriers(e.target.value, document.getElementById('carrier-status-filter').value));
  document.getElementById('carrier-status-filter').addEventListener('change', e =>
    renderCarriers(document.getElementById('carrier-search').value, e.target.value));

  document.getElementById('carrier-form').addEventListener('submit', saveCarrier);
  document.getElementById('driver-form').addEventListener('submit', saveDriver);
  document.getElementById('btn-new-carrier').addEventListener('click', () => openCarrierModal());
  document.getElementById('btn-add-driver').addEventListener('click', () => {
    const cid = +document.getElementById('drivers-carrier-id').value;
    openDriverModal(cid);
  });
});
