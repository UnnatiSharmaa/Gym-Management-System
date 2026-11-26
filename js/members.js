/* ==========================================================================
   members.js  (Member3 - Vanshika Jain)
   Member CRUD for members-list.html using localStorage.
   C = enroll form   R = table + search/filters   U = Edit button   D = Delete button
   Extra: Renew button, live invoice preview, form validation.
   ========================================================================== */
(function () {
  'use strict';

  const PF = window.PulseFit;
  const { PLANS, priceFor, inr, esc, store, toast, openModal,
          today, parseISO, toISO, addDays, addMonths, fmtDate } = PF;

  const STORAGE_KEY = 'pulsefit_members_v1';
  const PREFILL_KEY = 'pulsefit_selected_plan';     // written by memberships.js

  const COACHES = {
    none: 'Floor Trainer', vikram: 'Vikramaditya R.', ananya: 'Ananya Deshmukh',
    rohan: 'Rohan Kapoor', meera: 'Meera Singhania', arjun: 'Arjun Negi'
  };
  const AVATARS = ['avatar-orange', 'avatar-blue', 'avatar-emerald', 'avatar-purple'];

  const $ = id => document.getElementById(id);
  const el = {
    tbody: $('members-tbody'), form: $('member-form'),
    search: $('member-search'), fPlan: $('filter-plan'), fStatus: $('filter-status'),
    reset: $('filter-reset'), count: $('result-count'), total: $('total-records'),
    fname: $('reg-fname'), lname: $('reg-lname'), email: $('reg-email'), phone: $('reg-phone'),
    emergency: $('reg-emergency'), gender: $('reg-gender'), plan: $('reg-plan'),
    duration: $('reg-duration'), coach: $('reg-coach'), shift: $('reg-shift'), locker: $('reg-locker'),
    summary: $('price-summary'), submit: $('submit-btn'), cancel: $('cancel-edit'),
    title: $('form-title'), badge: $('form-badge'), idLabel: $('id-label'), nextId: $('next-id'),
    card: $('add-member')
  };

  let members = loadMembers();
  let editingId = null;

  /* ====================== DATA LAYER ====================== */

  // First run: seed the 7 sample members. Expiry dates are relative to today
  // so the Active / Expiring / Expired badges always look right in a demo.
  function seedMembers() {
    const t = today();
    const rows = [
      // id,   first,       last,       phone,              plan,       months, coach,   expiry offset (days)
      [1042, 'Rahul',     'Sharma',   '+91 98721-00214', 'strength', 6,  'vikram',  60],
      [1039, 'Priya',     'Patel',    '+91 94125-66781', 'pro',      3,  'ananya',  45],
      [1038, 'Aman',      'Verma',    '+91 88992-12401', 'cardio',   1,  'rohan',    4],
      [1025, 'Neha',      'Gupta',    '+91 70172-88129', 'cardio',   1,  'none',   -30],
      [1011, 'Siddharth', 'Sen',      '+91 99881-44332', 'annual',  12,  'vikram', 200],
      [1008, 'Deepika',   'Rawat',    '+91 91402-33411', 'pro',      6,  'meera',   20],
      [994,  'Tarun',     'Kumar',    '+91 96340-99812', 'strength', 6,  'arjun',   90]
    ];
    return rows.map(r => {
      const expiry = addDays(t, r[7]);
      return {
        id: 'PF-MEM-' + String(r[0]).padStart(4, '0'),
        fname: r[1], lname: r[2], email: '', phone: r[3], emergency: '', gender: '',
        plan: r[4], months: r[5], coach: r[6], shift: 'evening', locker: false,
        join: toISO(addMonths(expiry, -r[5])), expiry: toISO(expiry)
      };
    });
  }

  function loadMembers() {
    const saved = store.get(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved;
    const seeded = seedMembers();
    store.set(STORAGE_KEY, seeded);
    return seeded;
  }
  function saveMembers() { store.set(STORAGE_KEY, members); }

  const num = id => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  const digits = s => String(s || '').replace(/\D/g, '');
  function nextNumber() { return Math.max(1042, ...members.map(m => num(m.id))) + 1; }
  function nextId() { return 'PF-MEM-' + String(nextNumber()).padStart(4, '0'); }
  const findMember = id => members.find(m => m.id === id);

  function statusOf(m) {
    const days = Math.round((parseISO(m.expiry) - today()) / 86400000);
    if (days < 0) return { key: 'expired', label: 'Expired', cls: 'badge-danger' };
    if (days <= 7) return { key: 'expiring', label: days === 0 ? 'Expires today' : 'Expiring in ' + days + 'd', cls: 'badge-warning' };
    return { key: 'active', label: m.plan === 'annual' ? 'Active VIP' : 'Active', cls: 'badge-success' };
  }

  /* ====================== READ (render + search/filter) ====================== */

  function rowHTML(m) {
    const s = statusOf(m);
    const name = m.fname + ' ' + m.lname;
    const initials = ((m.fname[0] || '') + (m.lname[0] || '')).toUpperCase();
    const planName = PLANS[m.plan] ? PLANS[m.plan].name : m.plan;
    return '<tr data-id="' + esc(m.id) + '">' +
      '<td><strong>' + esc(m.id) + '</strong></td>' +
      '<td><div class="member-cell"><div class="avatar ' + AVATARS[num(m.id) % AVATARS.length] + '">' + esc(initials) + '</div>' +
        '<div><span class="member-name">' + esc(name) + '</span><span class="member-email">' + esc(m.phone) + '</span></div></div></td>' +
      '<td>' + esc(planName) + '</td>' +
      '<td>' + fmtDate(parseISO(m.join)) + '</td>' +
      '<td>' + fmtDate(parseISO(m.expiry)) + '</td>' +
      '<td><span class="badge ' + s.cls + '"><span class="badge-dot"></span> ' + esc(s.label) + '</span></td>' +
      '<td>' + esc(COACHES[m.coach] || COACHES.none) + '</td>' +
      '<td><div class="action-btns">' +
        (s.key !== 'active' ? '<button type="button" class="btn btn-sm btn-primary" data-action="renew">Renew</button>' : '') +
        '<button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>' +
        '<button type="button" class="btn btn-sm btn-outline btn-delete" data-action="delete">Delete</button>' +
        '<a href="billing.html" class="btn btn-sm btn-outline" title="View Invoices">Fee</a>' +
      '</div></td></tr>';
  }

  function render() {
    const q = el.search.value.trim().toLowerCase();
    const qDigits = digits(q);
    const plan = el.fPlan.value, st = el.fStatus.value;

    const list = members.filter(m => {
      if (plan !== 'all' && m.plan !== plan) return false;
      if (st !== 'all' && statusOf(m).key !== st) return false;
      if (!q) return true;
      return m.id.toLowerCase().includes(q) ||
             (m.fname + ' ' + m.lname).toLowerCase().includes(q) ||
             (qDigits.length >= 3 && digits(m.phone).includes(qDigits));
    }).sort((a, b) => num(b.id) - num(a.id));

    el.tbody.innerHTML = list.length
      ? list.map(rowHTML).join('')
      : '<tr><td colspan="8" class="empty-row">No members match your search or filters.</td></tr>';

    el.count.textContent = 'Showing ' + list.length + ' of ' + members.length + ' members';
    el.total.textContent = members.length.toLocaleString('en-IN');
    if (!editingId) el.nextId.textContent = nextId();
  }

  /* ====================== FORM: validation + live invoice ====================== */

  function readForm() {
    return {
      fname: el.fname.value.trim(), lname: el.lname.value.trim(),
      email: el.email.value.trim().toLowerCase(), phone: el.phone.value.trim(),
      emergency: el.emergency.value.trim(), gender: el.gender.value,
      plan: el.plan.value, months: Number(el.duration.value),
      coach: el.coach.value, shift: el.shift.value, locker: el.locker.checked
    };
  }

  // Accepts 9876543210, 98765 43210, +91 98765 43210, 919876543210
  function normalisePhone(raw) {
    let d = digits(raw);
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  }

  function validate(d) {
    const err = {};
    const nameRe = /^[A-Za-z][A-Za-z .'-]{1,}$/;
    if (!nameRe.test(d.fname)) err.fname = 'Enter a valid first name (letters only).';
    if (!nameRe.test(d.lname)) err.lname = 'Enter a valid last name (letters only).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) err.email = 'Enter a valid email, e.g. member@gmail.com';

    const p = normalisePhone(d.phone);
    if (!p) err.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';

    const others = members.filter(m => m.id !== editingId);
    if (!err.email && others.some(m => m.email && m.email === d.email)) err.email = 'This email is already registered.';
    if (!err.phone && others.some(m => digits(m.phone).slice(-10) === p)) err.phone = 'This phone number is already registered.';
    return err;
  }

  const FIELD_ID = { fname: 'fname', lname: 'lname', email: 'email', phone: 'phone' };

  function clearErrors() {
    el.form.querySelectorAll('.field-error').forEach(n => n.remove());
    el.form.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid'));
  }
  function clearFieldError(input) {
    input.classList.remove('is-invalid');
    const n = input.parentNode.querySelector('.field-error');
    if (n) n.remove();
  }
  function showErrors(err) {
    clearErrors();
    Object.keys(err).forEach(k => {
      const input = el[FIELD_ID[k]];
      input.classList.add('is-invalid');
      const msg = document.createElement('div');
      msg.className = 'field-error';
      msg.textContent = err[k];
      input.parentNode.appendChild(msg);
    });
    const first = Object.keys(err)[0];
    if (first) el[FIELD_ID[first]].focus();
  }

  function updateSummary() {
    // Annual VIP is always a 12-month plan
    const annual = el.plan.value === 'annual';
    if (annual) el.duration.value = '12';
    el.duration.disabled = annual;
    const p = priceFor(el.plan.value, Number(el.duration.value));
    el.summary.innerHTML = 'Invoice preview: ' + inr(p.subtotal) +
      (p.discount ? ' (after ' + p.discount + '% tenure discount)' : '') +
      ' + 18% GST ' + inr(p.gst) + ' = <strong>' + inr(p.total) + '</strong>';
  }

  /* ====================== CREATE / UPDATE ====================== */

  function createMember(d) {
    const t = today();
    const m = Object.assign({}, d, {
      id: nextId(),
      phone: formatPhone(d.phone),
      join: toISO(t),
      expiry: toISO(addMonths(t, priceFor(d.plan, d.months).months))
    });
    m.months = priceFor(d.plan, d.months).months;
    members.push(m);
    saveMembers();
    el.search.value = ''; el.fPlan.value = 'all'; el.fStatus.value = 'all';   // make sure the new row is visible
    el.form.reset();
    render();
    toast(m.id + ' enrolled. Invoice total ' + inr(priceFor(m.plan, m.months).total) + ' (incl. GST).');
    document.querySelector('.filter-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateMember(d) {
    const m = findMember(editingId);
    if (!m) return exitEditMode();
    const planChanged = m.plan !== d.plan || m.months !== priceFor(d.plan, d.months).months;
    Object.assign(m, d, { phone: formatPhone(d.phone) });
    m.months = priceFor(d.plan, d.months).months;
    if (planChanged) m.expiry = toISO(addMonths(parseISO(m.join), m.months));
    saveMembers();
    const id = editingId;
    exitEditMode();
    render();
    toast(id + ' updated successfully.');
    document.querySelector('.filter-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formatPhone(raw) {
    const d = normalisePhone(raw);
    return d ? '+91 ' + d.slice(0, 5) + '-' + d.slice(5) : raw;
  }

  /* ---------- edit mode helpers ---------- */
  function enterEditMode(id) {
    const m = findMember(id);
    if (!m) return;
    editingId = id;
    clearErrors();
    el.fname.value = m.fname; el.lname.value = m.lname; el.email.value = m.email || '';
    el.phone.value = m.phone; el.emergency.value = m.emergency || '';
    el.gender.value = m.gender || 'male';
    el.plan.value = m.plan; el.duration.value = String(m.months);
    el.coach.value = m.coach; el.shift.value = m.shift || 'evening'; el.locker.checked = !!m.locker;
    updateSummary();

    el.title.textContent = 'Edit Member Details';
    el.badge.textContent = 'Update Record';
    el.idLabel.textContent = 'Editing:';
    el.nextId.textContent = m.id;
    el.submit.textContent = 'Update Member \u2192';
    el.cancel.hidden = false;
    el.card.classList.add('is-editing');
    el.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.fname.focus({ preventScroll: true });
  }

  function exitEditMode() {
    editingId = null;
    el.title.textContent = 'Enroll New Gym Member';
    el.badge.textContent = 'Registration Desk';
    el.idLabel.textContent = 'Auto Member ID:';
    el.nextId.textContent = nextId();
    el.submit.textContent = 'Save Member & Generate Invoice \u2192';
    el.cancel.hidden = true;
    el.card.classList.remove('is-editing');
    clearErrors();
  }

  /* ====================== DELETE + RENEW ====================== */

  async function deleteMember(id) {
    const m = findMember(id);
    if (!m) return;
    const ok = await openModal({
      title: 'Delete member?',
      bodyHTML: '<p>This will permanently remove <strong>' + esc(m.fname + ' ' + m.lname) + '</strong> (' + esc(m.id) + ') from the directory.</p>',
      confirmText: 'Yes, Delete', danger: true
    });
    if (!ok) return;
    members = members.filter(x => x.id !== id);
    saveMembers();
    if (editingId === id) { el.form.reset(); exitEditMode(); }
    render();
    toast(id + ' deleted.', 'danger');
  }

  async function renewMember(id) {
    const m = findMember(id);
    if (!m) return;
    const price = priceFor(m.plan, m.months);
    const start = parseISO(m.expiry) > today() ? parseISO(m.expiry) : today();
    const newExpiry = addMonths(start, price.months);
    const ok = await openModal({
      title: 'Renew membership',
      bodyHTML: '<p>Renew <strong>' + esc(m.fname + ' ' + m.lname) + '</strong> on <strong>' + esc(PLANS[m.plan].name) +
        '</strong> for ' + price.months + ' month' + (price.months > 1 ? 's' : '') + '?</p>' +
        '<p>New expiry: <strong>' + fmtDate(newExpiry) + '</strong><br>Amount: <strong>' + inr(price.total) + '</strong> (incl. 18% GST)</p>',
      confirmText: 'Renew Now'
    });
    if (!ok) return;
    m.expiry = toISO(newExpiry);
    saveMembers();
    render();
    toast(id + ' renewed till ' + fmtDate(newExpiry) + '.');
  }

  /* ====================== EVENTS ====================== */

  el.form.addEventListener('submit', e => {
    e.preventDefault();
    const d = readForm();
    const err = validate(d);
    showErrors(err);
    if (Object.keys(err).length) return;
    editingId ? updateMember(d) : createMember(d);
  });

  el.form.addEventListener('reset', () => {
    exitEditMode();
    setTimeout(updateSummary, 0);                // run after the browser restores defaults
  });
  el.cancel.addEventListener('click', () => { el.form.reset(); });

  el.form.addEventListener('input', e => { if (e.target.classList.contains('is-invalid')) clearFieldError(e.target); });
  el.plan.addEventListener('change', updateSummary);
  el.duration.addEventListener('change', updateSummary);

  el.tbody.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.action === 'edit') enterEditMode(id);
    else if (btn.dataset.action === 'delete') deleteMember(id);
    else if (btn.dataset.action === 'renew') renewMember(id);
  });

  el.search.addEventListener('input', render);
  el.fPlan.addEventListener('change', render);
  el.fStatus.addEventListener('change', render);
  el.reset.addEventListener('click', () => {
    el.search.value = ''; el.fPlan.value = 'all'; el.fStatus.value = 'all'; render();
  });

  /* ====================== INIT ====================== */
  render();
  updateSummary();

  // Coming from memberships.html -> "Select Plan": pre-fill the form
  const picked = store.get(PREFILL_KEY, null);
  if (picked && PLANS[picked.plan]) {
    el.plan.value = picked.plan;
    el.duration.value = String(picked.months || 1);
    updateSummary();
    store.remove(PREFILL_KEY);
    toast(PLANS[picked.plan].name + ' pre-selected. Fill in the member details below.');
  }
})();
