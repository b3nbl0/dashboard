// Elpris från elprisetjustnu.se (gratis, ingen nyckel). Spotpris per kvart.
(function () {
  const titleEl = document.getElementById('power-title');
  const nowEl = document.getElementById('power-now');
  const chartEl = document.getElementById('power-chart');
  const extEl = document.getElementById('power-extremes');

  const LEVELS = {
    cheap: { label: 'Billigt', color: 'var(--good)' },
    normal: { label: 'Normalt', color: 'var(--warning)' },
    dear: { label: 'Dyrt', color: 'var(--critical)' }
  };

  let days = []; // [{ date: Date, quarters: [{start, end, sek}] }]

  function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return { y: d.getFullYear(), md: p(d.getMonth() + 1) + '-' + p(d.getDate()) };
  }

  async function fetchDay(date, area) {
    const { y, md } = ymd(date);
    const res = await fetch('https://www.elprisetjustnu.se/api/v1/prices/' + y + '/' + md + '_' + area + '.json');
    if (!res.ok) return null; // tomorrow's prices are not out yet
    const rows = await res.json();
    return {
      date,
      quarters: rows.map(r => ({ start: new Date(r.time_start), end: new Date(r.time_end), sek: r.SEK_per_kWh }))
    };
  }

  async function load() {
    const area = Store.get('area');
    titleEl.textContent = 'Elpris · ' + area;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      const [a, b] = await Promise.all([fetchDay(today, area), fetchDay(tomorrow, area).catch(() => null)]);
      if (!a) throw new Error('no data');
      days = [a, b].filter(Boolean);
      render();
    } catch (e) {
      nowEl.replaceChildren(Util.el('p', { class: 'muted', text: 'Kunde inte hämta elpriset just nu. Försöker igen om en stund.' }));
      chartEl.replaceChildren();
      extEl.textContent = '';
    }
  }

  // Spot price in öre/kWh including 25 % VAT (excluding grid fee and energy tax).
  const ore = sek => sek * 100 * 1.25;

  // Average the four quarter-hours into one bar per hour.
  function hourly(day) {
    const hours = new Map();
    day.quarters.forEach(q => {
      const key = q.start.getHours() + '-' + q.start.getDate();
      if (!hours.has(key)) hours.set(key, { start: q.start, sum: 0, n: 0 });
      const h = hours.get(key); h.sum += q.sek; h.n++;
    });
    return [...hours.values()].map(h => ({ start: h.start, sek: h.sum / h.n }));
  }

  // Cheap / normal / expensive = bottom, middle, top third of that day's prices.
  function levelFn(values) {
    const s = [...values].sort((a, b) => a - b);
    const lo = s[Math.floor(s.length / 3)], hi = s[Math.floor(2 * s.length / 3)];
    return v => (v < lo ? 'cheap' : v >= hi ? 'dear' : 'normal');
  }

  const hh = d => String(d.getHours()).padStart(2, '0');

  function render() {
    const now = new Date();
    const today = days[0];
    const levelToday = levelFn(today.quarters.map(q => q.sek));
    const cur = today.quarters.find(q => q.start <= now && now < q.end);

    // Current price
    if (cur) {
      const lvl = LEVELS[levelToday(cur.sek)];
      const t = d => hh(d) + ':' + String(d.getMinutes()).padStart(2, '0');
      nowEl.replaceChildren(
        Util.el('span', { class: 'p-value', text: Util.fmt(ore(cur.sek), 1) }),
        Util.el('span', { class: 'p-unit', text: 'öre/kWh inkl. moms · ' + t(cur.start) + '–' + t(cur.end) }),
        Util.el('span', { class: 'badge' }, Util.el('span', { class: 'dot', style: 'background:' + lvl.color }), lvl.label)
      );
    } else {
      nowEl.replaceChildren(Util.el('p', { class: 'muted', text: 'Inget pris för just nu.' }));
    }

    // Chart: one bar per hour, today (+ tomorrow if published)
    const bars = [];
    days.forEach((day, di) => {
      const lv = levelFn(day.quarters.map(q => q.sek));
      hourly(day).forEach(h => bars.push({ ...h, day: di, level: lv(h.sek) }));
    });
    drawChart(bars, now);

    // Today's cheapest / most expensive hour
    const th = hourly(today);
    const min = th.reduce((a, b) => (b.sek < a.sek ? b : a));
    const max = th.reduce((a, b) => (b.sek > a.sek ? b : a));
    const span = h => 'kl ' + hh(h.start) + '–' + String((h.start.getHours() + 1) % 24).padStart(2, '0');
    extEl.textContent = 'Idag billigast ' + span(min) + ' (' + Util.fmt(ore(min.sek), 0) + ' öre), dyrast '
      + span(max) + ' (' + Util.fmt(ore(max.sek), 0) + ' öre).'
      + (days.length < 2 ? ' Morgondagens priser kommer vid lunchtid.' : '');
  }

  function drawChart(bars, now) {
    // Draw at the real pixel width so text stays readable at any size.
    const W = Math.max(280, chartEl.clientWidth || 600), H = 170, padL = 34, padR = 4, padT = 8, padB = 22;
    const vals = bars.map(b => ore(b.sek));
    const maxV = Math.max(...vals, 1);
    const minV = Math.min(...vals, 0);
    const niceStep = (() => {
      const raw = (maxV - minV) / 3;
      const p = Math.pow(10, Math.floor(Math.log10(raw)));
      return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw);
    })();
    const top = Math.ceil(maxV / niceStep) * niceStep;
    const bottom = Math.floor(minV / niceStep) * niceStep;
    const y = v => padT + (top - v) / (top - bottom) * (H - padT - padB);
    const slot = (W - padL - padR) / bars.length;
    const gap = Math.min(2, slot * 0.25);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Elpris per timme');
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(ns, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      svg.append(n); return n;
    };

    for (let v = bottom; v <= top + 1e-9; v += niceStep) {
      add('line', { class: v === 0 ? 'baseline' : 'grid-line', x1: padL, x2: W - padR, y1: y(v), y2: y(v) });
      add('text', { class: 'axis-label', x: padL - 6, y: y(v) + 4, 'text-anchor': 'end' }, Math.round(v));
    }

    const tip = Util.el('div', { class: 'tooltip' });
    bars.forEach((b, i) => {
      const v = ore(b.sek);
      const x = padL + i * slot + gap / 2;
      const w = Math.max(1, slot - gap);
      const y0 = y(0), y1 = y(v);
      const h = Math.max(1, Math.abs(y0 - y1));
      const isPast = b.start.getTime() + 3600000 <= now.getTime();
      // Bar with rounded data end, square at the baseline.
      const r = Math.min(4, w / 2, h);
      const yTop = Math.min(y0, y1);
      const d = v >= 0
        ? `M${x},${y0} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + w - r} Q${x + w},${yTop} ${x + w},${yTop + r} V${y0} Z`
        : `M${x},${y0} V${yTop + h - r} Q${x},${yTop + h} ${x + r},${yTop + h} H${x + w - r} Q${x + w},${yTop + h} ${x + w},${yTop + h - r} V${y0} Z`;
      add('path', { d, fill: LEVELS[b.level].color, class: 'bar' + (isPast ? ' past' : ''), style: isPast ? 'opacity:.4' : '' });

      const hit = add('rect', { class: 'hit', x: padL + i * slot, y: padT, width: slot, height: H - padT - padB });
      const label = (b.day === 1 ? 'Imorgon ' : 'Idag ') + 'kl ' + hh(b.start) + '–'
        + String((b.start.getHours() + 1) % 24).padStart(2, '0') + ': ' + Util.fmt(v, 1) + ' öre/kWh · ' + LEVELS[b.level].label;
      hit.addEventListener('mouseenter', () => {
        tip.textContent = label;
        tip.style.display = 'block';
        const px = padL + (i + 0.5) * slot;
        tip.style.left = Math.min(Math.max(px, 110), W - 110) + 'px';
        tip.style.top = yTop + 'px';
      });
      hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      hit.addEventListener('click', () => hit.dispatchEvent(new Event('mouseenter')));

      // x-axis labels every 6 hours
      if (b.start.getHours() % 6 === 0) {
        add('text', { class: 'axis-label', x: padL + i * slot, y: H - 6 },
          b.start.getHours() === 0 && b.day === 1 ? 'imorgon' : hh(b.start));
      }
      if (b.day === 1 && b.start.getHours() === 0) {
        add('line', { class: 'day-sep', x1: padL + i * slot, x2: padL + i * slot, y1: padT, y2: H - padB });
      }
    });

    // "Now" marker
    const first = bars[0].start.getTime();
    const nowX = padL + ((now.getTime() - first) / 3600000) * slot;
    if (nowX >= padL && nowX <= W - padR) {
      add('line', { class: 'now-line', x1: nowX, x2: nowX, y1: padT, y2: H - padB });
    }

    const legend = Util.el('div', { class: 'legend' },
      ...Object.values(LEVELS).map(l => Util.el('span', {}, Util.el('i', { style: 'background:' + l.color }), l.label)),
      Util.el('span', { text: '(jämfört med resten av dygnet)' })
    );
    chartEl.replaceChildren(svg, tip, legend);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (days.length) render(); }, 150);
  });


  load();
  // Refresh right after each quarter-hour.
  const msToQuarter = 900000 - (Date.now() % 900000) + 2000;
  setTimeout(() => { load(); setInterval(load, 900000); }, msToQuarter);
  Store.on('area', load);
})();
