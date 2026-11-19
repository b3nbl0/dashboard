# Personal Dashboard — Plan

_Created 2026-11-19 · updated 2026-11-19 (Trafikverket map, electricity price and stock market added)_

## Status (2026-11-19)
- **Done:** all phases (1–11): weather, electricity price, stock market, settings, and the Trafikverket map (väglag, vägväder, kameror — all three layers on by default). Tested in Chrome with live data.
- **Online:** https://b3nbl0.github.io/dashboard/ (GitHub Pages from the public repo https://github.com/b3nbl0/dashboard; updates go live about a minute after a push).
- **Map data (checked 2026-11-19):** `RoadCondition` (Road.TrafficInfo 1.3, county 14) ≈ 133 road sections; `WeatherMeasurepoint` (Road.WeatherInfo 2.1, box around the county) ≈ 169 stations; `Camera` (namespace **Road.Infrastructure**, version 1, county 14) ≈ 459 cameras. Camera photos load without a key. The key is entered in settings per device; for local testing it lives in the git-ignored `trafikverket-key.txt`.
- **Next:** nothing planned. Ideas below.
- Checked while building: TradingView widgets work **without** a TradingView account, including OMXS30 and winners/losers for Sweden.

## Goal
A personal web app showing the daily basics on one screen: **clock, weather, electricity price, the Swedish stock market, to-dos, notes and a road map of Västra Götaland** with live road conditions, road weather and traffic cameras from Trafikverket.
Open it by double-clicking `start.bat` on the PC, or from a web address on the phone. No Python and no install steps for you.

## Tech choices
- **Plain HTML + CSS + JavaScript.** No build step, no server code. It's easy to change and runs anywhere.
- **Weather:** [Open-Meteo](https://open-meteo.com): free, no account or API key.
- **Road data:** [Trafikverket API Öppna Data](https://data.trafikverket.se/documentation/datacache/intro): free, but you need an account and an API key (see "Your to-dos").
  You send it a query by POST to `https://api.trafikinfo.trafikverket.se/v2/data.json` and get JSON back. Web pages may call it directly (checked 2026-11-19), so no relay is needed.
- **Electricity price:** [elprisetjustnu.se](https://www.elprisetjustnu.se) API: free, no key, and web pages may call it directly (checked 2026-11-19).
  `https://www.elprisetjustnu.se/api/v1/prices/YYYY/MM-DD_SE3.json` returns the day's 96 quarter-hour spot prices in SEK/kWh. These are excluding VAT, grid fee and energy tax. Tomorrow's prices usually appear in the early afternoon.
- **Stock market:** free [TradingView widgets](https://www.tradingview.com/widget-docs/) embedded in the panel. No key. Prices are about 15 min delayed. They support Nasdaq Stockholm (`OMXSTO:` symbols), including "market movers" for Sweden (checked 2026-11-19). They use TradingView's own look, but in Swedish and following light/dark mode.
  Why not our own panel: there's no free Stockholm data source that a web page can call directly. Yahoo and Stooq block web pages, and Twelve Data's free plan only covers US stocks (checked 2026-11-19).
- **Map:** [Leaflet](https://leafletjs.com) with OpenStreetMap tiles: free, no key.
- **Storage:** to-dos, notes, the watchlist and the Trafikverket key are saved in the browser. The storage code sits in one file (`storage.js`), so PC/phone sync can be added later without rewriting the panels.
- **Hosting:** GitHub Pages (free) gives a web address you can open on your phone. On a free GitHub plan the repo has to be public. That's fine here: the code holds no personal data, and the API key is **not** in the code (you paste it into the settings panel once per device). Locally, `start.bat` just opens `index.html`.
- **Look:** a card grid that stacks into one column on a phone. Follows the system light/dark mode.
- **Language:** Swedish throughout (e.g. "onsdag 19 november · v. 47"), 24-hour clock, °C, weeks start on Monday.

## Layout
```
+-------------+-------------+-----------+
| Clock &     | Weather     | Elpris    |
| date,       | (now + next | SE3 now + |
| week number | 7 days)     | day graph |
+-------------+-------------+-----------+
|  Börsen: OMXS30 +   |  Dagens       |
|  bevakningslista    |  vinnare /    |
|                     |  förlorare    |
+---------------------+---------------+
|  Trafikkarta – Västra Götaland        |
|  (full width; layer toggles:          |
|   Väglag · Vägväder · Kameror)        |
+-------------------+-------------------+
|  To-dos           |  Notes            |
|                   |  (autosaves)      |
+-------------------+-------------------+
```
On a phone the map gets a "full screen" button.

## Phases
1. **Skeleton:** `index.html`, `style.css`, `app.js`, `storage.js`, `start.bat`. Card grid, light/dark mode, phone layout.
2. **Klocka & datum:** live time, weekday, date, week number, greeting (God morgon / God kväll).
3. **Väder (Göteborg):** current temperature, conditions icon, wind, and a 7-day forecast. Refreshes every 30 min.
4. **Elpris (SE3):** the price right now in öre/kWh, coloured cheap/normal/expensive compared with the rest of the day. A bar graph of today (and tomorrow, once published) with the current quarter-hour marked. Also shows today's cheapest and most expensive hours. Always shown including 25 % VAT. Updates every quarter-hour.
5. **Börsen (TradingView widgets):**
   - **OMXS30:** index level, today's change in %, small intraday graph (`OMXSTO:OMXS30`).
   - **Bevakningslista:** your chosen stocks with price and today's change. Starts with a few large caps as examples (Volvo B, Ericsson B, Investor B, Atlas Copco A, H&M B); you edit the list in settings.
   - **Dagens vinnare / förlorare:** biggest risers and fallers on Nasdaq Stockholm today ("market movers", exchange Sweden).
   - The widgets are added with TradingView's standard embed code. If they turn out to require a (free) TradingView account to embed, you'll create one; I'll check this first.
6. **Att göra:** add, tick off, delete, reorder. Option to clear finished items. Saved automatically.
7. **Anteckningar:** one free-text notepad that saves as you type.
8. **Inställningar:** city (Göteborg by default), electricity price area (SE3 by default), stock watchlist, and a field for your Trafikverket API key.
9. **Trafikkarta – väglag:** Leaflet map of Västra Götaland. Road stretches coloured by road condition (`RoadCondition`): green = dry/good, yellow = wet/risk, red = ice/snow/slippery. Click a stretch for details and time of update. Refreshes every 10 min.
   - Väglag is only updated **1 November – 30 April**. Outside that period the layer shows "Inget väglag under sommaren".
10. **Vägväder & kameror:** markers for road weather stations (`WeatherMeasurepoint` / `WeatherObservation`): road surface temperature, air temperature, wind, rain/snow, with a warning colour when the road is near or below 0 °C. Camera markers (`Camera`): click to see the latest photo.
11. **Publish:** push to a GitHub repo and turn on GitHub Pages; test on your phone.

Each phase ends with something you can open and try.

## Your to-dos (before phase 9)
- Register a free account at [data.trafikverket.se](https://data.trafikverket.se/documentation/datacache/intro) (needs an e-mail address and accepting their licence), then click **Skapa nyckel** to create an API key. I won't do this for you: it's your account. Keep the key handy; you'll paste it into the dashboard's settings.
- Decide which stocks go on your watchlist (can be done any time in settings).

## Decisions (2026-11-19)
- Weather city: **Göteborg**.
- Language: **Swedish**.
- Calendar: **skipped for now**.
- Sync/login: no preference given. **Default: no sync and no login.** Each device keeps its own to-dos and notes, and the web address is unlisted rather than protected. This can be upgraded later (see below).
- Road map: **väglag + road weather + cameras**, area **Västra Götaland**.
- Electricity price: **SE3** (Göteborg), spot price always shown including VAT.
- Energy tax: optional, turned on in settings (default rate 36,0 öre/kWh excl. VAT, Skatteverket 2026; VAT added on top).
- Clock & date, Anteckningar (notes) and Att göra (to-dos) panels: **removed** (2026-11-19).
- Layout (2026-11-19): top row weather · elpris · vinnare/förlorare, then Börsen full width (OMXS30 + watchlist wide enough for all its columns, ~920px; stacked below 1300px). Below 1100px: two columns with vinnare/förlorare full width. One column on phones.
- Stock market: **OMXS30 + watchlist + today's winners/losers**, via **TradingView widgets** (~15 min delayed).

## Risks / not yet checked
- **Filtering to Västra Götaland:** planned via the county number (Västra Götaland = 14) or a map box around the county. Exact field names will be checked in Trafikverket's Testbänk first.
- **Amount of data:** the county has many road stretches and cameras. If the map gets slow, it will load cameras only when you zoom in.

## Later ideas (not in scope now)
- Calendar panel (Google, Outlook or built-in).
- Sync to-dos and notes between PC and phone, with a login (free Supabase database).
- Traffic incidents (accidents, roadworks, queues — `Situation`) and pavement quality (ruts, bumpiness — `PavementData`/`MeasurementData`) layers on the same map.
- My holdings (your shares, total value, today's gain/loss): needs its own data source, e.g. a GitHub scheduled job or a paid API.
- Tiles linking to your other projects.
- Garmin steps/sleep, food prices.
