// customers.js
let editingCustomer = null;

function renderCustomers(filter = '', typeFilter = '') {
  let data = DB.get('customers');
  if (typeFilter) data = data.filter(c => c.type === typeFilter);
  if (filter) {
    const f = filter.toLowerCase();
    data = data.filter(c =>
      c.name.toLowerCase().includes(f) ||
      (c.contact||'').toLowerCase().includes(f) ||
      (c.email||'').toLowerCase().includes(f)
    );
  }

  const loads = DB.get('loads');
  const tbody = document.getElementById('customers-tbody');

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="es-icon">🏢</div><h3>No customers found</h3><p>Try adjusting filters or add a customer.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => {
    const loadCount = loads.filter(l => l.shipperId === c.id || l.consigneeId === c.id).length;
    const revenue   = loads.filter(l => l.shipperId === c.id && l.status === 'delivered').reduce((s,l) => s + (+l.rate||0), 0);
    return `<tr>
      <td><span style="font-weight:600">${esc(c.name)}</span></td>
      <td>${badge(c.type)}</td>
      <td><div>${esc(c.contact||'—')}</div><div style="color:var(--text-muted);font-size:0.75rem">${esc(c.phone||'')}</div></td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${esc(c.address||'—')}</td>
      <td>${loadCount}</td>
      <td style="font-weight:600">${revenue > 0 ? fmt$(revenue) : '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="editCustomer(${c.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id},'${esc(c.name)}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openCustomerModal(customer = null) {
  editingCustomer = customer;
  document.getElementById('customer-modal-title').textContent = customer ? `Edit – ${customer.name}` : 'New Customer';
  const v = (k,d='') => customer ? (customer[k]??d) : d;

  document.getElementById('customer-form').innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Company Name</label><input name="name" value="${esc(v('name'))}" required placeholder="e.g. Acme Corp"></div>
      <div class="form-group">
        <label>Customer Type</label>
        <select name="type">
          <option value="shipper"   ${v('type','shipper')==='shipper'  ?'selected':''}>Shipper</option>
          <option value="consignee" ${v('type')==='consignee'           ?'selected':''}>Consignee</option>
          <option value="both"      ${v('type')==='both'                ?'selected':''}>Both</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          <option value="active"   ${v('status','active')==='active'  ?'selected':''}>Active</option>
          <option value="inactive" ${v('status')==='inactive'          ?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-group"><label>Contact Name</label><input name="contact" value="${esc(v('contact'))}"></div>
      <div class="form-group"><label>Phone</label><input name="phone" value="${esc(v('phone'))}" placeholder="(555) 000-0000"></div>
      <div class="form-group full"><label>Email</label><input type="email" name="email" value="${esc(v('email'))}"></div>
      <div class="form-group full"><label>Address</label><input name="address" value="${esc(v('address'))}" placeholder="Street, City, ST ZIP"></div>

      <div class="form-section-title">Billing</div>
      <div class="form-group">
        <label>Credit Limit ($)</label>
        <input type="number" name="creditLimit" value="${esc(v('creditLimit'))}" min="0" step="100" placeholder="0">
      </div>
      <div class="form-group">
        <label>Payment Terms</label>
        <select name="paymentTerms">
          ${['Net 15','Net 30','Net 45','Net 60','COD','Prepaid']
            .map(t=>`<option ${v('paymentTerms')===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>`;

  openModal('customer-modal');
}

function editCustomer(id) { openCustomerModal(DB.find('customers', id)); }

function deleteCustomer(id, name) {
  confirmDelete(name, () => {
    DB.delete('customers', id);
    toast(`${name} removed`);
    renderCustomers(document.getElementById('customer-search').value, document.getElementById('customer-type-filter').value);
  });
}

function saveCustomer(e) {
  e.preventDefault();
  const obj = Object.fromEntries(new FormData(e.target).entries());
  obj.creditLimit = +obj.creditLimit || 0;
  if (editingCustomer) { obj.id = editingCustomer.id; DB.update('customers', obj); toast('Customer updated'); }
  else { DB.add('customers', obj); toast('Customer added'); }
  closeModal('customer-modal');
  renderCustomers(document.getElementById('customer-search').value, document.getElementById('customer-type-filter').value);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCustomers();

  document.getElementById('customer-search').addEventListener('input', e =>
    renderCustomers(e.target.value, document.getElementById('customer-type-filter').value));
  document.getElementById('customer-type-filter').addEventListener('change', e =>
    renderCustomers(document.getElementById('customer-search').value, e.target.value));

  document.getElementById('customer-form').addEventListener('submit', saveCustomer);
  document.getElementById('btn-new-customer').addEventListener('click', () => openCustomerModal());
});
