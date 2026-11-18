# Load test (NFR5: 95% of staff online at once)

Simulates 2,850 employees (95% of 3,000 staff) against the production build, on a separate
database (`iu_hr_load`) so dev data is never touched.

```bash
npm run load:setup                      # create + migrate + seed iu_hr_load, write loadtest/load.env
npm run build && npm run load:server    # production build on port 4100 (keep running)
npm run load:run -- --label=after       # in another terminal; ~5 minutes
```

Scenario: every user signs in within 60 s (morning rush), loads the dashboard and opens a live
(Socket.IO) connection; for the next 4 minutes each opens a page every 30–60 s with all of that
page's API calls at once, and 5% of page views send Kudos to a colleague (live-notification delay
measured). Results: `results/<label>.md` (raw numbers in a git-ignored JSON next to it).

Knobs: `USERS`, `RAMP_S`, `STEADY_S` (load:run); `STAFF` (load:setup).

Caveat: API, database and load generator share one laptop, so absolute numbers are pessimistic for a
real server and optimistic for network latency. Compare runs on the same machine.
