// All saving and loading goes through here, so sync between devices can be
// added later by changing only this file.
window.Store = (function () {
  const PREFIX = 'dash.';

  const DEFAULTS = {
    city: { name: 'Göteborg', lat: 57.70716, lon: 11.96679 },
    area: 'SE3',
    energyTax: false,
    energyTaxRate: 36.0, // öre/kWh excl. VAT, Skatteverket's rate for 2026
    watchlist: [
      'VOLV B | Volvo B',
      'ERIC B | Ericsson B',
      'INVE B | Investor B',
      'ATCO A | Atlas Copco A',
      'HM B | H&M B'
    ],
    todos: [],
    notes: '',
    tvKey: ''
  };

  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) { /* storage blocked or bad data: fall back to default */ }
    const d = DEFAULTS[key];
    return d && typeof d === 'object' ? JSON.parse(JSON.stringify(d)) : d;
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Simple change notifications so panels can redraw when settings change.
  const listeners = {};
  function on(key, fn) { (listeners[key] = listeners[key] || []).push(fn); }
  function emit(key) { (listeners[key] || []).forEach(fn => fn(get(key))); }

  return { get, set, on, emit };
})();

// Small shared helpers.
window.Util = {
  el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    children.flat().forEach(c => node.append(c));
    return node;
  },
  isDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  fmt(n, digits) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
};
