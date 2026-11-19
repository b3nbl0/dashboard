// Väder från Open-Meteo (gratis, ingen nyckel).
(function () {
  const nowEl = document.getElementById('weather-now');
  const daysEl = document.getElementById('weather-days');
  const titleEl = document.getElementById('weather-title');

  // WMO weather codes -> [Swedish text, day icon, night icon]
  const CODES = {
    0: ['Klart', '☀️', '🌙'],
    1: ['Mestadels klart', '🌤️', '🌙'],
    2: ['Halvklart', '⛅', '☁️'],
    3: ['Mulet', '☁️', '☁️'],
    45: ['Dimma', '🌫️', '🌫️'],
    48: ['Rimfrostdimma', '🌫️', '🌫️'],
    51: ['Lätt duggregn', '🌦️', '🌧️'],
    53: ['Duggregn', '🌦️', '🌧️'],
    55: ['Kraftigt duggregn', '🌧️', '🌧️'],
    56: ['Underkylt duggregn', '🌧️', '🌧️'],
    57: ['Underkylt duggregn', '🌧️', '🌧️'],
    61: ['Lätt regn', '🌦️', '🌧️'],
    63: ['Regn', '🌧️', '🌧️'],
    65: ['Kraftigt regn', '🌧️', '🌧️'],
    66: ['Underkylt regn', '🌧️', '🌧️'],
    67: ['Underkylt regn', '🌧️', '🌧️'],
    71: ['Lätt snöfall', '🌨️', '🌨️'],
    73: ['Snöfall', '🌨️', '🌨️'],
    75: ['Kraftigt snöfall', '🌨️', '🌨️'],
    77: ['Snökorn', '🌨️', '🌨️'],
    80: ['Lätta regnskurar', '🌦️', '🌧️'],
    81: ['Regnskurar', '🌧️', '🌧️'],
    82: ['Kraftiga regnskurar', '🌧️', '🌧️'],
    85: ['Snöbyar', '🌨️', '🌨️'],
    86: ['Kraftiga snöbyar', '🌨️', '🌨️'],
    95: ['Åska', '⛈️', '⛈️'],
    96: ['Åska med hagel', '⛈️', '⛈️'],
    99: ['Åska med hagel', '⛈️', '⛈️']
  };
  function code(c, isDay) {
    const e = CODES[c] || ['Okänt', '❔', '❔'];
    return { text: e[0], icon: isDay === 0 ? e[2] : e[1] };
  }

  const WIND_DIRS = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'];
  const windDir = deg => WIND_DIRS[Math.round(deg / 45) % 8];
  const dayFmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'short' });
  const round = n => Math.round(n).toString().replace('-', '−');

  async function load() {
    const city = Store.get('city');
    titleEl.textContent = 'Väder · ' + city.name;
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + city.lat + '&longitude=' + city.lon
      + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'
      + '&timezone=Europe%2FStockholm&wind_speed_unit=ms&forecast_days=7';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      render(await res.json());
    } catch (e) {
      nowEl.replaceChildren(Util.el('p', { class: 'muted', text: 'Kunde inte hämta väder just nu. Försöker igen om en stund.' }));
    }
  }

  function render(data) {
    const c = data.current;
    const w = code(c.weather_code, c.is_day);
    nowEl.replaceChildren(
      Util.el('span', { class: 'w-icon', 'aria-hidden': 'true', text: w.icon }),
      Util.el('div', {},
        Util.el('div', { class: 'w-temp', text: round(c.temperature_2m) + '°' }),
        Util.el('div', { class: 'w-desc', text: w.text + ' · känns som ' + round(c.apparent_temperature) + '°' }),
        Util.el('div', { class: 'w-desc', text: 'Vind ' + Math.round(c.wind_speed_10m) + ' m/s ' + windDir(c.wind_direction_10m) })
      )
    );

    const d = data.daily;
    daysEl.replaceChildren(...d.time.map((iso, i) => {
      const date = new Date(iso + 'T12:00:00');
      const name = i === 0 ? 'Idag' : dayFmt.format(date).replace('.', '');
      const dw = code(d.weather_code[i], 1);
      const rain = d.precipitation_sum[i];
      return Util.el('li', { title: dw.text + (rain > 0 ? ', ' + Util.fmt(rain, 1) + ' mm' : '') },
        Util.el('span', { class: 'd-name', text: name.charAt(0).toUpperCase() + name.slice(1) }),
        Util.el('span', { class: 'd-icon', 'aria-label': dw.text, text: dw.icon }),
        Util.el('span', { class: 'd-max', text: round(d.temperature_2m_max[i]) + '°' }),
        Util.el('span', { class: 'd-min', text: round(d.temperature_2m_min[i]) + '°' })
      );
    }));
  }

  load();
  setInterval(load, 30 * 60 * 1000);
  Store.on('city', load);
})();
