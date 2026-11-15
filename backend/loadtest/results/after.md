# Load test: after

2026-11-15T12:29:05.973Z · 2850 simulated employees (95% of 3,000 staff) · 60 s sign-in spike + 240 s steady use
Machine: Apple M2 (8 cores), 8 GB RAM. API (production build, one Node process), PostgreSQL and the load generator all ran on this one machine.

## Verdict

| Check | Target | Result | |
| --- | --- | --- | --- |
| Users signed in and connected live | 2850 | 1199 (242 failed) | FAIL |
| Failed requests | 0 | 5248 of 47406 | FAIL |
| Page load p95 (all of a page's API calls) | < 1000 ms | 14668 ms | FAIL |
| Live notification delay p95 | < 1000 ms | 142 ms (415 delivered) | PASS |

Steady-state throughput: 153.6 requests/s. Load-generator event-loop lag (max): 1023 ms — high: the generator itself may have added delay.

## Sign-in spike (first 60 s)

| Request | Count | p50 ms | p95 ms | p99 ms | max ms | failed |
| --- | --- | --- | --- | --- | --- | --- |
| page: badges | 9 | 6427 | 8257 | 8257 | 8257 | 1 |
| page: dashboard | 1197 | 6030 | 11382 | 13736 | 15227 | 344 |
| page: kudos | 14 | 7858 | 9189 | 9189 | 9189 | 2 |
| page: leaderboard | 10 | 8138 | 11952 | 11952 | 11952 | 5 |
| page: profile | 6 | 7744 | 8075 | 8075 | 8075 | 3 |
| page: quests | 17 | 8181 | 9061 | 9061 | 9061 | 8 |
| page: squads | 6 | 9804 | 14968 | 14968 | 14968 | 2 |
| GET /activity/mine | 1289 | 3003 | 8096 | 9806 | 13868 | 203 |
| GET /assignments/mine | 1292 | 2974 | 8042 | 9930 | 12229 | 100 |
| GET /badges | 23 | 4666 | 8135 | 8136 | 8136 | 8 |
| GET /badges/mine | 1262 | 4666 | 9359 | 11413 | 15719 | 309 |
| GET /kudos | 14 | 7856 | 9188 | 9188 | 9188 | 2 |
| GET /leaderboard | 1220 | 5653 | 10689 | 13229 | 15226 | 204 |
| GET /notifications/mine | 1364 | 3207 | 8130 | 9482 | 12517 | 196 |
| GET /quests | 1258 | 4353 | 9151 | 11491 | 14629 | 180 |
| GET /squads/challenges | 7 | 8535 | 14967 | 14967 | 14967 | 1 |
| GET /squads/leaderboard | 13 | 8134 | 11948 | 11948 | 11948 | 8 |
| GET /squads/mine | 6 | 9457 | 11024 | 11024 | 11024 | 1 |
| POST /auth/login | 1537 | 12643 | 26588 | 28107 | 30011 | 148 |
| POST /kudos | 1 | 10591 | 10591 | 10591 | 10591 | 1 |

## Steady use

| Request | Count | p50 ms | p95 ms | p99 ms | max ms | failed |
| --- | --- | --- | --- | --- | --- | --- |
| page: badges | 679 | 298 | 11897 | 14920 | 20752 | 38 |
| page: dashboard | 2411 | 1573 | 16629 | 21855 | 24073 | 389 |
| page: kudos | 1015 | 345 | 13893 | 18615 | 21604 | 36 |
| page: leaderboard | 1057 | 531 | 19805 | 24316 | 28088 | 55 |
| page: profile | 339 | 360 | 10305 | 16382 | 17517 | 18 |
| page: quests | 1386 | 344 | 12967 | 18245 | 21718 | 64 |
| page: squads | 359 | 352 | 19558 | 23486 | 25656 | 9 |
| GET /activity/mine | 2664 | 371 | 8566 | 11601 | 15710 | 225 |
| GET /assignments/mine | 3719 | 391 | 10851 | 15357 | 18748 | 161 |
| GET /badges | 1044 | 158 | 8383 | 11692 | 14819 | 27 |
| GET /badges/mine | 3379 | 477 | 10896 | 14920 | 20752 | 360 |
| GET /kudos | 1015 | 338 | 13893 | 18614 | 21603 | 24 |
| GET /leaderboard | 3455 | 671 | 16359 | 21767 | 24075 | 207 |
| GET /notifications/mine | 7141 | 244 | 8601 | 12619 | 18293 | 354 |
| GET /quests | 3753 | 512 | 13321 | 17286 | 21718 | 207 |
| GET /squads/challenges | 358 | 309 | 16336 | 22289 | 25655 | 8 |
| GET /squads/leaderboard | 1054 | 517 | 19611 | 24308 | 28085 | 34 |
| GET /squads/mine | 359 | 352 | 17576 | 23329 | 23626 | 6 |
| POST /auth/login | 1313 | 30001 | 30039 | 30102 | 30300 | 1261 |
| POST /kudos | 361 | 960 | 20873 | 30002 | 30005 | 39 |

## Errors

- GET /notifications/mine -> TypeError: 550
- GET /leaderboard -> TypeError: 411
- GET /activity/mine -> TypeError: 428
- GET /badges/mine -> TypeError: 454
- GET /quests -> TypeError: 387
- GET /assignments/mine -> TypeError: 261
- POST /auth/login -> TypeError: 209
- GET /squads/leaderboard -> TypeError: 42
- GET /badges -> TypeError: 35
- GET /badges/mine -> 500: 215
- POST /kudos -> 500: 34
- GET /squads/challenges -> TypeError: 9
- GET /squads/mine -> TypeError: 7
- POST /auth/login -> TimeoutError: 1200
- GET /kudos -> TypeError: 26
- POST /kudos -> TypeError: 1
- POST /kudos -> TimeoutError: 5
