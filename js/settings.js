// Inställningar
(function () {
  const dialog = document.getElementById('settings');
  const form = document.getElementById('settings-form');
  const cityIn = document.getElementById('set-city');
  const cityMsg = document.getElementById('set-city-msg');
  const areaIn = document.getElementById('set-area');
  const watchIn = document.getElementById('set-watch');
  const keyIn = document.getElementById('set-tvkey');
  const saveBtn = document.getElementById('settings-save');
  const etaxIn = document.getElementById('set-etax');
  const etaxRateIn = document.getElementById('set-etax-rate');
  const etaxMsg = document.getElementById('set-etax-msg');

  const fmtRate = n => Util.fmt(n, 1);
  // Accepts "36", "36,0" or "36.0".
  const parseRate = s => {
    const n = Number(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && n < 1000 ? n : null;
  };
  function syncRateField() { etaxRateIn.disabled = !etaxIn.checked; }
  etaxIn.addEventListener('change', syncRateField);

  function open() {
    cityIn.value = Store.get('city').name;
    cityMsg.textContent = '';
    areaIn.value = Store.get('area');
    etaxIn.checked = !!Store.get('energyTax');
    etaxRateIn.value = fmtRate(Number(Store.get('energyTaxRate')));
    etaxMsg.textContent = '';
    syncRateField();
    watchIn.value = Store.get('watchlist').join('\n');
    keyIn.value = Store.get('tvKey');
    dialog.showModal();
  }

  // Look up the city's coordinates with Open-Meteo's free place search.
  async function findCity(name) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=sv&format=json&name=' + encodeURIComponent(name);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const r = data.results && data.results[0];
    return r ? { name: r.name, lat: r.latitude, lon: r.longitude } : null;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    saveBtn.disabled = true;
    try {
      // Check the tax rate first, so nothing is half-saved if it's wrong.
      const rate = parseRate(etaxRateIn.value);
      if (etaxIn.checked && rate === null) {
        etaxMsg.textContent = 'Skriv energiskatten som ett tal, t.ex. 36,0.';
        etaxRateIn.focus();
        return;
      }

      const name = cityIn.value.trim();
      if (name && name.toLowerCase() !== Store.get('city').name.toLowerCase()) {
        cityMsg.textContent = 'Söker…';
        let city = null;
        try { city = await findCity(name); } catch (err) { /* handled below */ }
        if (!city) { cityMsg.textContent = 'Hittade inte "' + name + '". Prova en annan stavning.'; return; }
        Store.set('city', city); Store.emit('city');
      }
      if (areaIn.value !== Store.get('area')) { Store.set('area', areaIn.value); Store.emit('area'); }

      const newRate = rate === null ? Store.get('energyTaxRate') : rate;
      if (etaxIn.checked !== !!Store.get('energyTax') || newRate !== Store.get('energyTaxRate')) {
        Store.set('energyTax', etaxIn.checked);
        Store.set('energyTaxRate', newRate);
        Store.emit('energyTax');
      }

      const watch = watchIn.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (watch.join('\n') !== Store.get('watchlist').join('\n')) { Store.set('watchlist', watch); Store.emit('watchlist'); }

      if (keyIn.value.trim() !== Store.get('tvKey')) { Store.set('tvKey', keyIn.value.trim()); Store.emit('tvKey'); }
      dialog.close();
    } finally {
      saveBtn.disabled = false;
    }
  });

  document.getElementById('open-settings').addEventListener('click', open);
  document.getElementById('settings-cancel').addEventListener('click', () => dialog.close());
})();
