// Trafikkarta för Västra Götaland: väglag, vägväder och kameror från
// Trafikverkets öppna API. Nyckeln läggs in i inställningarna.
(function () {
  const API = 'https://api.trafikinfo.trafikverket.se/v2/data.json';
  const COUNTY = 14; // Västra Götalands län
  // Rough box around the county (WGS84 lon/lat), used where data has no county number.
  const BOX = { w: 10.9, s: 57.1, e: 14.7, n: 59.35 };
  const REFRESH_MS = 10 * 60 * 1000;

  const mapEl = document.getElementById('traffic-map');
  const statusEl = document.getElementById('traffic-status');
  const legendEl = document.getElementById('traffic-legend');
  const toggles = {
    roads: document.getElementById('layer-roads'),
    weather: document.getElementById('layer-weather'),
    cameras: document.getElementById('layer-cameras')
  };

  // Väglag: Trafikverket's condition codes -> colour + Swedish label.
  const ROAD = {
    1: { label: 'Normalt', color: '#0ca30c' },
    2: { label: 'Besvärligt', color: '#fab219' },
    3: { label: 'Mycket besvärligt', color: '#ec835a' },
    4: { label: 'Is- och snövägbana', color: '#d03b3b' }
  };

  let map = null;
  const layers = {};
  let timer = null;

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timeFmt = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const when = iso => (iso ? timeFmt.format(new Date(iso)) : '');
  const num = v => (v && typeof v === 'object' && 'Value' in v ? v.Value : v);
  const deg = v => (v == null || isNaN(v) ? '–' : Util.fmt(Number(v), 1).replace('-', '−') + '°');

  // "LINESTRING (lon lat, lon lat)" / "MULTILINESTRING ((…),(…))" / "POINT (lon lat)" -> Leaflet [lat, lon] arrays
  function parseWkt(wkt) {
    if (!wkt) return null;
    const type = wkt.trim().split(/\s|\(/)[0].toUpperCase();
    const groups = [];
    const re = /\(([^()]+)\)/g;
    let m;
    while ((m = re.exec(wkt))) {
      groups.push(m[1].split(',').map(p => {
        const [lon, lat] = p.trim().split(/\s+/).map(Number);
        return [lat, lon];
      }));
    }
    return { type, groups };
  }

  async function query(xmlQuery) {
    const key = Store.get('tvKey');
    const body = '<REQUEST><LOGIN authenticationkey="' + esc(key) + '"/>' + xmlQuery + '</REQUEST>';
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body });
    const data = await res.json().catch(() => null);
    const result = data && data.RESPONSE && data.RESPONSE.RESULT && data.RESPONSE.RESULT[0];
    if (!res.ok || !result || result.ERROR) {
      const msg = result && result.ERROR ? result.ERROR.MESSAGE : 'HTTP ' + res.status;
      const err = new Error(msg);
      err.auth = res.status === 401 || /authentication/i.test(msg);
      throw err;
    }
    return result;
  }

  // ---------- layers ----------
  async function loadRoads() {
    const r = await query(
      '<QUERY objecttype="RoadCondition" namespace="Road.TrafficInfo" schemaversion="1.3">' +
        '<FILTER><EQ name="CountyNo" value="' + COUNTY + '"/><EQ name="Deleted" value="false"/></FILTER>' +
        '<INCLUDE>ConditionCode</INCLUDE><INCLUDE>ConditionText</INCLUDE><INCLUDE>ConditionInfo</INCLUDE>' +
        '<INCLUDE>Warning</INCLUDE><INCLUDE>Measure</INCLUDE><INCLUDE>LocationText</INCLUDE>' +
        '<INCLUDE>RoadNumber</INCLUDE><INCLUDE>StartTime</INCLUDE><INCLUDE>ModifiedTime</INCLUDE>' +
        '<INCLUDE>Geometry.WGS84</INCLUDE>' +
      '</QUERY>');
    const group = L.layerGroup();
    const items = r.RoadCondition || [];
    // Draw the worst conditions last so they end up on top.
    items.sort((a, b) => (a.ConditionCode || 0) - (b.ConditionCode || 0));
    items.forEach(rc => {
      const geo = parseWkt(rc.Geometry && rc.Geometry.WGS84);
      if (!geo || !geo.groups.length) return;
      const style = ROAD[rc.ConditionCode] || { label: rc.ConditionText || 'Okänt', color: '#898781' };
      const html = '<strong>' + esc(rc.RoadNumber || 'Väg') + '</strong>' +
        (rc.LocationText ? '<br>' + esc(rc.LocationText) : '') +
        '<br><span class="pop-key">Väglag:</span> ' + esc(rc.ConditionText || style.label) +
        (rc.ConditionInfo && rc.ConditionInfo.length ? '<br>' + esc(rc.ConditionInfo.join(', ')) : '') +
        (rc.Warning && rc.Warning.length ? '<br><span class="pop-key">Varning:</span> ' + esc(rc.Warning.join(', ')) : '') +
        (rc.Measure && rc.Measure.length ? '<br><span class="pop-key">Åtgärd:</span> ' + esc(rc.Measure.join(', ')) : '') +
        '<br><span class="pop-time">Uppdaterat ' + esc(when(rc.ModifiedTime || rc.StartTime)) + '</span>';
      if (geo.type.indexOf('POINT') !== -1) {
        L.circleMarker(geo.groups[0][0], { radius: 6, color: style.color, weight: 2, fillOpacity: 0.8 }).bindPopup(html).addTo(group);
      } else {
        // A wide transparent line underneath makes thin roads easy to tap.
        geo.groups.forEach(line => {
          L.polyline(line, { color: style.color, weight: 4, opacity: 0.95 }).bindPopup(html).addTo(group);
          L.polyline(line, { color: '#000', weight: 16, opacity: 0 }).bindPopup(html).addTo(group);
        });
      }
    });
    return { group, count: items.length };
  }

  function surfaceStatus(t) {
    if (t == null || isNaN(t)) return { color: '#898781', label: 'Okänd vägtemperatur' };
    if (t <= 0) return { color: '#d03b3b', label: 'Minusgrader i vägbanan' };
    if (t <= 2) return { color: '#fab219', label: 'Nära noll' };
    return { color: '#0ca30c', label: 'Plusgrader' };
  }

  async function loadWeather() {
    const box = BOX.w + ' ' + BOX.s + ', ' + BOX.e + ' ' + BOX.n;
    const r = await query(
      '<QUERY objecttype="WeatherMeasurepoint" namespace="Road.WeatherInfo" schemaversion="2.1">' +
        '<FILTER><WITHIN name="Geometry.WGS84" shape="box" value="' + box + '"/><EQ name="Deleted" value="false"/></FILTER>' +
        '<INCLUDE>Name</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE><INCLUDE>Observation.Sample</INCLUDE>' +
        '<INCLUDE>Observation.Surface.Temperature.Value</INCLUDE><INCLUDE>Observation.Air.Temperature.Value</INCLUDE>' +
        '<INCLUDE>Observation.Wind.Speed.Value</INCLUDE><INCLUDE>Observation.Weather.Precipitation</INCLUDE>' +
      '</QUERY>');
    const group = L.layerGroup();
    const items = r.WeatherMeasurepoint || [];
    items.forEach(p => {
      const geo = parseWkt(p.Geometry && p.Geometry.WGS84);
      if (!geo || !geo.groups.length) return;
      const o = p.Observation || {};
      const surface = num(o.Surface && o.Surface.Temperature);
      const air = num(o.Air && o.Air.Temperature);
      const windObj = Array.isArray(o.Wind) ? o.Wind[0] : o.Wind;
      const wind = windObj && num(windObj.Speed);
      const st = surfaceStatus(surface);
      const precip = o.Weather && o.Weather.Precipitation;
      const precipText = { no: 'Ingen nederbörd', rain: 'Regn', snow: 'Snö', sleet: 'Snöblandat regn', drizzle: 'Duggregn', hail: 'Hagel' }[precip] || precip;
      const html = '<strong>' + esc(p.Name || 'Väderstation') + '</strong>' +
        '<br><span class="pop-key">Vägbana:</span> ' + deg(surface) + ' · ' + esc(st.label) +
        '<br><span class="pop-key">Luft:</span> ' + deg(air) +
        (wind != null ? ' · <span class="pop-key">Vind:</span> ' + Util.fmt(Number(wind), 1) + ' m/s' : '') +
        (precipText ? '<br>' + esc(precipText) : '') +
        (o.Sample ? '<br><span class="pop-time">Mätt ' + esc(when(o.Sample)) + '</span>' : '');
      L.circleMarker(geo.groups[0][0], {
        radius: 7, color: '#ffffff', weight: 2, fillColor: st.color, fillOpacity: 1
      }).bindPopup(html).bindTooltip(deg(surface), { direction: 'top', offset: [0, -6] }).addTo(group);
    });
    return { group, count: items.length };
  }

  async function loadCameras() {
    const r = await query(
      '<QUERY objecttype="Camera" namespace="Road.Infrastructure" schemaversion="1">' +
        '<FILTER><EQ name="CountyNo" value="' + COUNTY + '"/><EQ name="Active" value="true"/><EQ name="Deleted" value="false"/></FILTER>' +
        '<INCLUDE>Name</INCLUDE><INCLUDE>Description</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>PhotoTime</INCLUDE>' +
        '<INCLUDE>HasFullSizePhoto</INCLUDE><INCLUDE>Type</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE>' +
      '</QUERY>');
    const group = L.layerGroup();
    const items = r.Camera || [];
    const icon = L.divIcon({ className: 'cam-icon', html: '<span aria-hidden="true">📷</span>', iconSize: [24, 24], iconAnchor: [12, 12] });
    items.forEach(c => {
      const geo = parseWkt(c.Geometry && c.Geometry.WGS84);
      if (!geo || !geo.groups.length || !c.PhotoUrl) return;
      const full = c.HasFullSizePhoto ? c.PhotoUrl + '?type=fullsize' : c.PhotoUrl;
      const html = '<strong>' + esc(c.Name || 'Kamera') + '</strong>' +
        (c.Type ? '<span class="pop-time">' + esc(c.Type) + ' · klicka på bilden för större</span>' : '') +
        '<a href="' + esc(full) + '" target="_blank" rel="noopener"><img class="cam-photo" src="' + esc(c.PhotoUrl) + '" alt="Kamerabild ' + esc(c.Name) + '" loading="lazy"></a>' +
        (c.PhotoTime ? '<span class="pop-time">Foto ' + esc(when(c.PhotoTime)) + '</span>' : '');
      L.marker(geo.groups[0][0], { icon, title: c.Name }).bindPopup(html, { maxWidth: 340, minWidth: 280 }).addTo(group);
    });
    return { group, count: items.length };
  }

  const LOADERS = { roads: loadRoads, weather: loadWeather, cameras: loadCameras };

  // ---------- map ----------
  function ensureMap() {
    if (map) return;
    mapEl.replaceChildren();
    // Whole zoom levels only: in-between levels scale the tiles and leave hairline gaps.
    map = L.map(mapEl, { scrollWheelZoom: false, zoomSnap: 1 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      className: 'osm-tiles',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Trafikdata &copy; Trafikverket'
    }).addTo(map);
    // Show the county as large as possible: use one zoom level closer than a strict
    // fit when the county is still (almost) fully visible at that level.
    const home = () => {
      const b = L.latLngBounds([BOX.s, BOX.w], [BOX.n, BOX.e]);
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const fit = map.getBoundsZoom(b);
      const nw = map.project(b.getNorthWest(), fit + 1), se = map.project(b.getSouthEast(), fit + 1);
      const closer = (se.x - nw.x) <= size.x * 1.1 && (se.y - nw.y) <= size.y * 1.25;
      map.setView(b.getCenter(), closer ? fit + 1 : fit);
    };
    home();
    // Leaflet measures its box once at start, before the page has its final size.
    // Re-measure whenever the box changes, and re-fit until the user has moved the map.
    let userMoved = false;
    map.on('dragstart', () => { userMoved = true; });
    mapEl.addEventListener('wheel', () => { userMoved = true; }, { passive: true });
    map.zoomControl.getContainer().addEventListener('click', () => { userMoved = true; });
    new ResizeObserver(() => {
      map.invalidateSize();
      if (!userMoved) home();
    }).observe(mapEl);
    // Scroll-zoom only after the map has been clicked, so the page still scrolls normally.
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
  }

  function showMissingKey() {
    if (map) { map.remove(); map = null; }
    Object.keys(layers).forEach(k => delete layers[k]);
    const btn = Util.el('button', { type: 'button', class: 'btn', text: 'Öppna inställningar' });
    btn.addEventListener('click', () => document.getElementById('open-settings').click());
    mapEl.replaceChildren(Util.el('div', { class: 'map-message' },
      Util.el('p', { text: 'Lägg in din API-nyckel från Trafikverket i inställningarna för att se väglag, vägväder och kameror.' }),
      btn));
    statusEl.textContent = '';
    legendEl.replaceChildren();
  }

  let run = 0; // each refresh gets a number; older, slower ones give up
  async function refresh() {
    clearTimeout(timer);
    const myRun = ++run;
    if (!Store.get('tvKey')) { showMissingKey(); return; }
    ensureMap();
    statusEl.textContent = 'Hämtar trafikdata…';
    const counts = [];
    let failed = null;
    for (const name of Object.keys(LOADERS)) {
      if (!toggles[name].checked) {
        if (layers[name]) { layers[name].remove(); delete layers[name]; }
        continue;
      }
      try {
        const { group, count } = await LOADERS[name]();
        if (myRun !== run) return; // a newer refresh has started
        if (layers[name]) layers[name].remove();
        layers[name] = group.addTo(map);
        counts.push(count + ' ' + { roads: 'vägsträckor', weather: 'väderstationer', cameras: 'kameror' }[name]);
      } catch (e) {
        if (myRun !== run) return;
        failed = e;
        if (e.auth) break;
      }
    }
    if (failed && failed.auth) {
      statusEl.textContent = 'Trafikverket godkände inte nyckeln. Kontrollera den i inställningarna.';
    } else if (failed) {
      statusEl.textContent = 'Kunde inte hämta all trafikdata just nu (' + failed.message + '). Försöker igen om 10 min.';
    } else if (!counts.length) {
      statusEl.textContent = 'Välj vad som ska visas på kartan.';
    } else {
      statusEl.textContent = counts.join(' · ') + ' · uppdaterat ' + timeFmt.format(new Date());
    }
    drawLegend();
    timer = setTimeout(refresh, REFRESH_MS);
  }

  function drawLegend() {
    const parts = [];
    if (toggles.roads.checked) {
      parts.push(Util.el('span', { class: 'legend-title', text: 'Väglag:' }));
      Object.values(ROAD).forEach(r => parts.push(Util.el('span', {}, Util.el('i', { class: 'line', style: 'background:' + r.color }), r.label)));
      const m = new Date().getMonth();
      if (m >= 4 && m <= 9) parts.push(Util.el('span', { class: 'muted', text: '(väglag rapporteras bara 1 nov–30 apr)' }));
    }
    if (toggles.weather.checked) {
      parts.push(Util.el('span', { class: 'legend-title', text: 'Vägbana:' }));
      [['#d03b3b', '≤ 0°'], ['#fab219', '0–2°'], ['#0ca30c', '> 2°'], ['#898781', 'ingen mätning']].forEach(([c, t]) =>
        parts.push(Util.el('span', {}, Util.el('i', { class: 'dot', style: 'background:' + c }), t)));
    }
    legendEl.replaceChildren(...parts);
  }

  Object.values(toggles).forEach(t => t.addEventListener('change', refresh));
  Store.on('tvKey', refresh);
  refresh();
})();
