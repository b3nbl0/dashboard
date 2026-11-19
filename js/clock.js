// Klocka & datum
(function () {
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  const greetEl = document.getElementById('greeting');

  const timeFmt = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ISO 8601 week number (weeks start on Monday), as used in Sweden.
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }

  function greeting(h) {
    if (h < 5) return 'God natt';
    if (h < 10) return 'God morgon';
    if (h < 12) return 'God förmiddag';
    if (h < 18) return 'God eftermiddag';
    return 'God kväll';
  }

  function tick() {
    const now = new Date();
    clockEl.textContent = timeFmt.format(now);
    const d = dateFmt.format(now);
    dateEl.textContent = '';
    dateEl.append(d.charAt(0).toUpperCase() + d.slice(1) + ' ');
    dateEl.append(Util.el('span', { class: 'week', text: '· v. ' + isoWeek(now) }));
    greetEl.textContent = greeting(now.getHours());
  }

  tick();
  // Update right after each new minute starts, then every minute.
  setTimeout(function () { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000) + 50);
})();
