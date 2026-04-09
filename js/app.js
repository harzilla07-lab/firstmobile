// ── Navigation ────────────────────────────────────────────────────────────────
const NAV = [
  { href: 'index.html',     icon: '&#9689;',  label: 'Dashboard' },
  { href: 'loads.html',     icon: '&#128230;', label: 'Loads' },
  { href: 'carriers.html',  icon: '&#128665;', label: 'Carriers' },
  { href: 'customers.html', icon: '&#127970;', label: 'Customers' },
  { href: 'dispatch.html',  icon: '&#128203;', label: 'Dispatch Board' },
  { href: 'reports.html',   icon: '&#128202;', label: 'Reports' },
];

function renderNav() {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const cur = location.pathname.split('/').pop() || 'index.html';
  el.innerHTML = `
    <div class="sidebar-logo">
      <h2>Freight<span>Flow</span></h2>
      <small>Transportation Management</small>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Main Menu</div>
      ${NAV.map(n => `
        <a href="${n.href}" class="nav-item ${cur === n.href ? 'active' : ''}">
          <span class="ni">${n.icon}</span>${n.label}
        </a>`).join('')}
    </nav>
    <div class="sidebar-footer">FreightFlow TMS &bull; v1.0</div>`;
}

function initMobileNav() {
  const h = document.getElementById('hamburger');
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  h?.addEventListener('click', () => { s.classList.toggle('open'); o.classList.toggle('open'); });
  o?.addEventListener('click', () => { s.classList.remove('open'); o.classList.remove('open'); });
}

// ── Data Store ────────────────────────────────────────────────────────────────
const DB = {
  get(k)       { try { return JSON.parse(localStorage.getItem('ff_' + k)) || []; } catch { return []; } },
  set(k, v)    { localStorage.setItem('ff_' + k, JSON.stringify(v)); },
  nextId(k)    { const a = this.get(k); return a.length ? Math.max(...a.map(i => i.id)) + 1 : 1; },
  add(k, item) { const a = this.get(k); item.id = this.nextId(k); a.push(item); this.set(k, a); return item; },
  update(k, item) { const a = this.get(k); const i = a.findIndex(x => x.id === item.id); if (i > -1) { a[i] = item; this.set(k, a); } },
  delete(k, id) { this.set(k, this.get(k).filter(x => x.id !== id)); },
  find(k, id)  { return this.get(k).find(x => x.id === id); },
};

// ── Seed Demo Data ────────────────────────────────────────────────────────────
function seed() {
  if (DB.get('_seeded').length) return;

  DB.set('customers', [
    { id:1, name:'Apex Manufacturing',   type:'shipper',   contact:'John Smith',    phone:'(312) 555-0101', email:'jsmith@apex.com',      address:'1200 Industrial Dr, Chicago, IL 60601',    creditLimit:50000, paymentTerms:'Net 30', status:'active'   },
    { id:2, name:'Harbor Distributors',  type:'consignee', contact:'Maria Garcia',  phone:'(213) 555-0202', email:'mgarcia@harbor.com',   address:'4400 Port Ave, Los Angeles, CA 90001',     creditLimit:75000, paymentTerms:'Net 30', status:'active'   },
    { id:3, name:'Summit Retail Group',  type:'both',      contact:'David Lee',     phone:'(214) 555-0303', email:'dlee@summit.com',      address:'800 Commerce Blvd, Dallas, TX 75201',      creditLimit:100000,paymentTerms:'Net 15', status:'active'   },
    { id:4, name:'Northgate Foods',      type:'shipper',   contact:'Sarah Johnson', phone:'(404) 555-0404', email:'sjohnson@north.com',   address:'2200 Food Park Ln, Atlanta, GA 30301',     creditLimit:30000, paymentTerms:'Net 30', status:'active'   },
    { id:5, name:'Pacific Imports Co',   type:'consignee', contact:'Kevin Park',    phone:'(503) 555-0505', email:'kpark@pacific.com',    address:'900 Harbor Blvd, Portland, OR 97201',      creditLimit:45000, paymentTerms:'Net 45', status:'active'   },
  ]);

  DB.set('carriers', [
    { id:1, name:'Swift Freight LLC',     mc:'MC-123456', dot:'DOT-987654', contact:'Tom Williams', phone:'(615) 555-0501', email:'dispatch@swiftfreight.com', equipment:'Dry Van', status:'active'   },
    { id:2, name:'Blue Ridge Transport',  mc:'MC-234567', dot:'DOT-876543', contact:'Lisa Brown',   phone:'(704) 555-0602', email:'ops@blueridge.com',          equipment:'Flatbed', status:'active'   },
    { id:3, name:'Lone Star Carriers',    mc:'MC-345678', dot:'DOT-765432', contact:'Mike Davis',   phone:'(817) 555-0703', email:'mike@lonestar.com',           equipment:'Reefer',  status:'active'   },
    { id:4, name:'Mountain Peak Trucking',mc:'MC-456789', dot:'DOT-654321', contact:'Ann Torres',   phone:'(303) 555-0804', email:'dispatch@mountpeak.com',      equipment:'Dry Van', status:'inactive' },
  ]);

  DB.set('drivers', [
    { id:1, carrierId:1, name:'James Wilson',   phone:'(615) 555-1001', license:'TN-CDL-112233', status:'available' },
    { id:2, carrierId:1, name:'Carlos Mendez',  phone:'(615) 555-1002', license:'TN-CDL-223344', status:'on-trip'   },
    { id:3, carrierId:2, name:'Robert Taylor',  phone:'(704) 555-1003', license:'NC-CDL-334455', status:'available' },
    { id:4, carrierId:3, name:'Patricia Moore', phone:'(817) 555-1004', license:'TX-CDL-445566', status:'off-duty'  },
    { id:5, carrierId:2, name:'Derek Nguyen',   phone:'(704) 555-1005', license:'NC-CDL-556677', status:'on-trip'   },
  ]);

  DB.set('loads', [
    { id:1, loadNumber:'LD-0001', status:'delivered',  shipperId:1, consigneeId:2, origin:'Chicago, IL',  destination:'Los Angeles, CA', pickupDate:'2026-04-01', deliveryDate:'2026-04-04', commodity:'Auto Parts',    weight:42000, pieces:24, rate:3800, carrierId:1, driverId:2, notes:'',                          createdAt:'2026-03-28' },
    { id:2, loadNumber:'LD-0002', status:'in-transit', shipperId:4, consigneeId:3, origin:'Atlanta, GA',  destination:'Dallas, TX',      pickupDate:'2026-04-07', deliveryDate:'2026-04-09', commodity:'Frozen Foods',  weight:38000, pieces:40, rate:2900, carrierId:3, driverId:null,notes:'Temperature: -10°F',      createdAt:'2026-04-05' },
    { id:3, loadNumber:'LD-0003', status:'dispatched', shipperId:1, consigneeId:3, origin:'Chicago, IL',  destination:'Dallas, TX',      pickupDate:'2026-04-09', deliveryDate:'2026-04-11', commodity:'Steel Coils',   weight:44000, pieces:8,  rate:3200, carrierId:2, driverId:3, notes:'',                          createdAt:'2026-04-07' },
    { id:4, loadNumber:'LD-0004', status:'pending',    shipperId:3, consigneeId:2, origin:'Dallas, TX',   destination:'Los Angeles, CA', pickupDate:'2026-04-12', deliveryDate:'2026-04-15', commodity:'Electronics',   weight:18000, pieces:60, rate:4100, carrierId:null,driverId:null,notes:'High value – signature reqd', createdAt:'2026-04-08' },
    { id:5, loadNumber:'LD-0005', status:'pending',    shipperId:4, consigneeId:5, origin:'Atlanta, GA',  destination:'Portland, OR',    pickupDate:'2026-04-14', deliveryDate:'2026-04-18', commodity:'Produce',       weight:35000, pieces:50, rate:5200, carrierId:null,driverId:null,notes:'Temp controlled',           createdAt:'2026-04-08' },
    { id:6, loadNumber:'LD-0006', status:'delivered',  shipperId:3, consigneeId:5, origin:'Dallas, TX',   destination:'Portland, OR',    pickupDate:'2026-04-02', deliveryDate:'2026-04-06', commodity:'Furniture',     weight:22000, pieces:30, rate:4400, carrierId:1, driverId:1, notes:'',                          createdAt:'2026-03-30' },
  ]);

  DB.set('_seeded', [1]);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function $$(sel, ctx = document) { return ctx.querySelector(sel); }
function fmt$( n) { return '$' + Number(n||0).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d) { if (!d) return '—'; const [y,m,day] = d.split('-'); return `${m}/${day}/${y}`; }
function badge(status) { return `<span class="badge badge-${status.replace(/\s+/g,'-')}">${status.replace(/-/g,' ')}</span>`; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${ok?'#10b981':'#ef4444'};color:#fff;padding:11px 18px;border-radius:8px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.15);animation:slideUp .2s ease`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function confirmDelete(name, cb) {
  if (confirm(`Delete "${name}"? This cannot be undone.`)) cb();
}

function nextLoadNumber() {
  const loads = DB.get('loads');
  if (!loads.length) return 'LD-0001';
  const nums = loads.map(l => parseInt(l.loadNumber.replace('LD-', '')) || 0);
  return 'LD-' + String(Math.max(...nums) + 1).padStart(4, '0');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  seed();
  renderNav();
  initMobileNav();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
  // Close modal buttons
  document.querySelectorAll('.modal-close, [data-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay')?.classList.remove('open'));
  });
});
