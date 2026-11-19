// Börsen via TradingViews gratis widgets (ca 15 min fördröjning).
(function () {
  const BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';

  // "VOLV B | Volvo B"  ->  { name: "OMXSTO:VOLV_B", displayName: "Volvo B" }
  function parseLine(line) {
    const [rawTicker, rawName] = line.split('|').map(s => (s || '').trim());
    if (!rawTicker) return null;
    let ticker = rawTicker.toUpperCase().replace(/\s+/g, '_');
    if (!ticker.includes(':')) ticker = 'OMXSTO:' + ticker;
    return { name: ticker, displayName: rawName || rawTicker };
  }

  function mount(containerId, widget, config) {
    const box = document.getElementById(containerId);
    const wrap = Util.el('div', { class: 'tradingview-widget-container' },
      Util.el('div', { class: 'tradingview-widget-container__widget' }));
    const script = document.createElement('script');
    script.src = BASE + widget + '.js';
    script.async = true;
    script.textContent = JSON.stringify(config);
    wrap.append(script);
    box.replaceChildren(wrap);
  }

  function render() {
    const theme = Util.isDark() ? 'dark' : 'light';
    const common = { locale: 'sv_SE', colorTheme: theme, isTransparent: true };

    mount('tv-index', 'mini-symbol-overview', {
      ...common,
      symbol: 'OMXSTO:OMXS30',
      width: '100%',
      height: '100%',
      dateRange: '1D',
      trendLineColor: 'rgba(42, 120, 214, 1)',
      underLineColor: 'rgba(42, 120, 214, 0.15)',
      underLineBottomColor: 'rgba(42, 120, 214, 0)',
      chartOnly: false,
      noTimeScale: false
    });

    const symbols = Store.get('watchlist').map(parseLine).filter(Boolean);
    mount('tv-watch', 'market-quotes', {
      ...common,
      width: '100%',
      height: '100%',
      showSymbolLogo: true,
      symbolsGroups: [{ name: 'Bevakningslista', symbols }]
    });

    mount('tv-movers', 'hotlists', {
      ...common,
      exchange: 'OMXSTO',
      dateRange: '1D',
      showChart: false,
      width: '100%',
      height: '100%',
      showSymbolLogo: true,
      showFloatingTooltip: false
    });
  }

  render();
  Store.on('watchlist', render);
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  }
})();
