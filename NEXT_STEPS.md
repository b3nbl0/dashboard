# Next steps

Where the dashboard stands and what to do next. Update this file at the end of each work session.
The full plan, decisions and data sources are in [PLAN.md](PLAN.md).

_Last updated: 2026-11-20_

## Where we are

All planned phases are done, and the dashboard is live at **https://b3nbl0.github.io/dashboard/**.

- **Panels:**
  - Väder (Göteborg by default; change the city in settings)
  - Elpris (SE3, always including VAT; energy tax optional in settings)
  - Dagens vinnare & förlorare
  - Trafik · Västra Götaland (the traffic map)
  - Börsen (OMXS30 + a watchlist wide enough for all columns)
- **Traffic map:** Trafikverket's open API with three layers: väglag, vägväder and kameror. All three are on by default. A link opens Trafikverket's own map in a new tab.
- **Removed on request:** the clock, notes and to-do panels.
- **Home screen:** the dashboard has its own icon and a web app manifest. Added to the home screen, it opens like an app, without the browser's address bar. The phone's status bar at the top stays visible.
- **Using it:**
  - On the PC, open the web address. You can also double-click `start.bat`, which opens the copy of the files on the PC instead of the website. That copy keeps its own settings, so the key has to be entered there too, and it only has the latest changes after a `git pull`.
  - On the phone, open the web address in Chrome → ⋮ → "Lägg till på startskärmen".
- **Settings (⚙)** are saved in each browser separately: city, price area, energy tax, watchlist and the Trafikverket API key. Each device and browser needs the key entered once. On the PC that's once for the web address and once for `start.bat`.
- **Testing locally:** the Trafikverket key lives in `trafikverket-key.txt`, which git ignores. It is never committed.
- **How it's tested:** headless Chrome on the PC, with screenshots and scripted checks.

## Open questions for you

- **Home screen app:** does the icon and app mode look right on your Android phone? This hasn't been tried on a real phone yet.
- **Energy tax for 2027:** the default rate (36,0 öre/kWh) is Skatteverket's rate for 2026, in `js/storage.js`. It needs updating when the 2027 rate is known. Until then, if energy tax is on, type the new rate in settings.
- **Stock data:** is 15-minute delayed data good enough? Real-time would need a paid data source.

## Possible next steps

Nothing is planned. Ideas if you want more:

1. **Total electricity cost:** add your grid fee (elnätsavgift) and supplier markup in settings, so the price matches your bill.
2. **More map layers:** accidents, roadworks and queues (`Situation`), or pavement wear (`PavementData`).
3. **Remember map choices:** keep the layer switches the way you left them instead of resetting on each visit.
4. **Sync between PC and phone:** settings and the key entered once for all devices. This needs a small online database and a login.
5. **Calendar panel,** if you want it back on the table.
