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

  function open() {
    cityIn.value = Store.get('city').name;
    cityMsg.textContent = '';
    areaIn.value = Store.get('area');
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
      const name = cityIn.value.trim();
      if (name && name.toLowerCase() !== Store.get('city').name.toLowerCase()) {
        cityMsg.textContent = 'Söker…';
        let city = null;
        try { city = await findCity(name); } catch (err) { /* handled below */ }
        if (!city) { cityMsg.textContent = 'Hittade inte "' + name + '". Prova en annan stavning.'; return; }
        Store.set('city', city); Store.emit('city');
      }
      if (areaIn.value !== Store.get('area')) { Store.set('area', areaIn.value); Store.emit('area'); }

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
