# Load test: baseline

2026-11-15T11:03:11.868Z · 2850 simulated employees (95% of 3,000 staff) · 60 s sign-in spike + 240 s steady use
Machine: Apple M2 (8 cores), 8 GB RAM. API (production build, one Node process), PostgreSQL and the load generator all ran on this one machine.

## Verdict

| Check | Target | Result | |
| --- | --- | --- | --- |
| Users signed in and connected live | 2850 | 484 (0 failed) | FAIL |
| Failed requests | 0 | 2366 of 10037 | FAIL |
| Page load p95 (all of a page's API calls) | < 1000 ms | 864 ms | PASS |
| Live notification delay p95 | < 1000 ms | 96 ms (9 delivered) | PASS |

Steady-state throughput: 18.4 requests/s. Load-generator event-loop lag (max): 187 ms.

## Sign-in spike (first 60 s)

| Request | Count | p50 ms | p95 ms | p99 ms | max ms | failed |
| --- | --- | --- | --- | --- | --- | --- |
| page: badges | 22 | 24 | 349 | 715 | 715 | 0 |
| page: dashboard | 530 | 36 | 101 | 400 | 909 | 0 |
| page: kudos | 25 | 289 | 780 | 922 | 922 | 0 |
| page: leaderboard | 35 | 85 | 372 | 401 | 401 | 0 |
| page: profile | 7 | 25 | 488 | 488 | 488 | 0 |
| page: quests | 27 | 13 | 122 | 413 | 413 | 0 |
| page: squads | 9 | 81 | 313 | 313 | 313 | 0 |
| GET /activity/mine | 538 | 7.5 | 48 | 156 | 365 | 0 |
| GET /assignments/mine | 558 | 10 | 52 | 254 | 415 | 0 |
| GET /badges | 35 | 9.3 | 212 | 269 | 269 | 0 |
| GET /badges/mine | 559 | 35 | 115 | 447 | 908 | 0 |
| GET /kudos | 25 | 227 | 697 | 879 | 879 | 0 |
| GET /leaderboard | 566 | 17 | 90 | 282 | 714 | 0 |
| GET /notifications/mine | 655 | 17 | 122 | 278 | 432 | 0 |
| GET /quests | 558 | 10.0 | 59 | 269 | 430 | 0 |
| GET /squads/challenges | 9 | 81 | 313 | 313 | 313 | 0 |
| GET /squads/leaderboard | 35 | 83 | 368 | 397 | 397 | 0 |
| GET /squads/mine | 9 | 52 | 312 | 312 | 312 | 0 |
| POST /auth/login | 1423 | 30001 | 30013 | 30093 | 30195 | 939 |
| POST /kudos | 6 | 58 | 790 | 790 | 790 | 0 |

## Steady use

| Request | Count | p50 ms | p95 ms | p99 ms | max ms | failed |
| --- | --- | --- | --- | --- | --- | --- |
| page: badges | 58 | 96 | 1673 | 3030 | 3030 | 0 |
| page: dashboard | 168 | 136 | 1670 | 3003 | 3257 | 0 |
| page: kudos | 107 | 308 | 1043 | 1691 | 1811 | 0 |
| page: leaderboard | 85 | 128 | 1305 | 1881 | 1881 | 0 |
| page: profile | 36 | 117 | 2506 | 2957 | 2957 | 0 |
| page: quests | 142 | 33 | 864 | 1021 | 1546 | 0 |
| page: squads | 34 | 19 | 1584 | 1712 | 1712 | 0 |
| GET /activity/mine | 203 | 33 | 441 | 1008 | 1350 | 0 |
| GET /assignments/mine | 309 | 39 | 538 | 1130 | 1432 | 0 |
| GET /badges | 85 | 61 | 568 | 1225 | 1225 | 0 |
| GET /badges/mine | 262 | 123 | 1673 | 2988 | 3257 | 0 |
| GET /kudos | 107 | 249 | 996 | 1530 | 1753 | 0 |
| GET /leaderboard | 252 | 70 | 813 | 1603 | 1721 | 0 |
| GET /notifications/mine | 630 | 48 | 473 | 1164 | 1408 | 0 |
| GET /quests | 309 | 46 | 676 | 1228 | 1546 | 0 |
| GET /squads/challenges | 34 | 19 | 1567 | 1685 | 1685 | 0 |
| GET /squads/leaderboard | 85 | 126 | 1303 | 1868 | 1868 | 0 |
| GET /squads/mine | 34 | 13 | 1557 | 1712 | 1712 | 0 |
| POST /auth/login | 1427 | 30001 | 30045 | 30085 | 30141 | 1427 |
| POST /kudos | 39 | 24 | 2190 | 3215 | 3215 | 0 |

## Errors

- POST /auth/login -> TimeoutError: 2366
