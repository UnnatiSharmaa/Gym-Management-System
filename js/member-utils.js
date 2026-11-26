/* ==========================================================================
   member-utils.js  (Member3 - Vanshika Jain)
   Shared helpers for memberships.html + members-list.html:
   plan data, price calculation, localStorage, dates, toast, modal.
   Load this BEFORE members.js / memberships.js.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- Plan catalogue (single source of truth) ---------- */
  const PLANS = {
    cardio:   { name: 'Cardio Basic',      monthly: 1499 },
    strength: { name: 'Strength Standard', monthly: 2499 },
    pro:      { name: 'Pro Athlete',       monthly: 3999 },
    annual:   { name: 'Annual Elite VIP',  yearly: 24999 }   // fixed 12 months
  };
  const DISCOUNT = { 1: 0, 3: 5, 6: 10, 12: 20 };            // % off by tenure
  const GST_RATE = 0.18;

  function priceFor(planKey, months) {
    const p = PLANS[planKey];
    if (!p) return { base: 0, discount: 0, subtotal: 0, gst: 0, total: 0, months: months };
    let base, discount, m = Number(months) || 1;
    if (p.yearly) { base = p.yearly; discount = 0; m = 12; }
    else { base = p.monthly * m; discount = DISCOUNT[m] || 0; }
    const subtotal = Math.round(base * (1 - discount / 100));
    const gst = Math.round(subtotal * GST_RATE);
    return { base: base, discount: discount, subtotal: subtotal, gst: gst, total: subtotal + gst, months: m };
  }

  const inr = n => '\u20B9' + Math.round(n).toLocaleString('en-IN');

  /* ---------- Safe HTML escaping (names go into innerHTML) ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ---------- localStorage wrapper (never throws) ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /* ---------- Date helpers (dates are stored as 'YYYY-MM-DD') ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseISO(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function toISO(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n) {                       // 31 Jan + 1 month = 28/29 Feb (clamped)
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(d.getDate(), last));
    return r;
  }
  function fmtDate(d) { return String(d.getDate()).padStart(2, '0') + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  /* ---------- Toast ---------- */
  function toast(message, type) {
    let box = document.getElementById('pf-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pf-toasts';
      box.className = 'pf-toast-container';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'pf-toast pf-toast-' + (type || 'success');
    t.textContent = message;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  /* ---------- Modal (returns a Promise<boolean>) ---------- */
  function openModal(opts) {
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const overlay = document.createElement('div');
      overlay.className = 'pf-modal-overlay';
      overlay.innerHTML =
        '<div class="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-modal-title">' +
          '<h3 id="pf-modal-title" class="pf-modal-title">' + esc(opts.title) + '</h3>' +
          '<div class="pf-modal-body">' + (opts.bodyHTML || '') + '</div>' +
          '<div class="pf-modal-actions">' +
            '<button type="button" class="btn btn-outline" data-act="cancel">' + esc(opts.cancelText || 'Cancel') + '</button>' +
            '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + esc(opts.confirmText || 'Confirm') + '</button>' +
          '</div>' +
        '</div>';

      function close(result) {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        document.body.classList.remove('pf-modal-open');
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }

      overlay.addEventListener('click', e => {
        if (e.target === overlay) return close(false);
        const btn = e.target.closest('[data-act]');
        if (btn) close(btn.dataset.act === 'ok');
      });
      document.addEventListener('keydown', onKey);
      document.body.classList.add('pf-modal-open');
      document.body.appendChild(overlay);
      overlay.querySelector('[data-act="ok"]').focus();
    });
  }

  global.PulseFit = {
    PLANS, DISCOUNT, GST_RATE, priceFor, inr, esc, store,
    today, parseISO, toISO, addDays, addMonths, fmtDate, toast, openModal
  };
})(window);
