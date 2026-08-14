# Treasury Bill Date Repair Preview Report

_Generated: 2026-08-14T08:39:05Z (READ-ONLY — no production writes)_

## Summary

| Metric | Count |
|--------|-------|
| Publications scanned | 52 |
| Records scanned | 156 |
| Records requiring correction | 156 |
| Already-correct records (not in scope) | 3 |
| High-confidence detections | 52 |
| Medium-confidence detections | 0 |
| Missing auction dates | 0 |
| Missing issue dates | 0 |
| Source conflicts | 0 |
| Unusual settlement gaps | 0 |
| Ambiguous publications | 0 |
| PDF fetch errors | 0 |

> **GO: No blocking issues found. Preview is clean.**
> All publications are resolved at HIGH or MEDIUM confidence.
> Production repair may proceed after independent verification.

## Already-Correct Records (not in scope)

These records have `auction_date != issue_date` and will not be touched:

- `2695/091` tenor=91d auction=2026-08-13 issue=2026-08-17
- `2669/182` tenor=182d auction=2026-08-13 issue=2026-08-17
- `2624/364` tenor=364d auction=2026-08-13 issue=2026-08-17

## Publications Detail

_Grouped by CBK publication (one PDF = three tenors)._

### [1] `107989597_RESULTS 2643-091 2617-182 2571-364 DATED 18-08-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-08-14` |
| Detected issue_date | `2025-08-18` |
| Footer date | `2025-08-14` |
| Next-auction bids deadline (Section D) | `2025-08-21` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2643/091` | 91d | `2025-08-18` | `2025-08-14` | → | `2025-08-18` | `2025-08-18` | ✅ CORRECT (ready to repair) |
| `2617/182` | 182d | `2025-08-18` | `2025-08-14` | → | `2025-08-18` | `2025-08-18` | ✅ CORRECT (ready to repair) |
| `2572/364` | 364d | `2025-08-18` | `2025-08-14` | → | `2025-08-18` | `2025-08-18` | ✅ CORRECT (ready to repair) |

### [2] `1149340265_RESULTS 2649-091 2623-182 2577-364 DATED 29-09-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-09-25` |
| Detected issue_date | `2025-09-29` |
| Footer date | `2025-09-25` |
| Next-auction bids deadline (Section D) | `2025-10-02` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2649/091` | 91d | `2025-09-29` | `2025-09-25` | → | `2025-09-29` | `2025-09-29` | ✅ CORRECT (ready to repair) |
| `2623/182` | 182d | `2025-09-29` | `2025-09-25` | → | `2025-09-29` | `2025-09-29` | ✅ CORRECT (ready to repair) |
| `2578/364` | 364d | `2025-09-29` | `2025-09-25` | → | `2025-09-29` | `2025-09-29` | ✅ CORRECT (ready to repair) |

### [3] `1360253624_RESULTS 2665-091 2639-182 2594-364 DATED 19-01-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-01-15` |
| Detected issue_date | `2026-01-19` |
| Footer date | `2026-01-15` |
| Next-auction bids deadline (Section D) | `2026-01-22` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2665/091` | 91d | `2026-01-19` | `2026-01-15` | → | `2026-01-19` | `2026-01-19` | ✅ CORRECT (ready to repair) |
| `2639/182` | 182d | `2026-01-19` | `2026-01-15` | → | `2026-01-19` | `2026-01-19` | ✅ CORRECT (ready to repair) |
| `2594/364` | 364d | `2026-01-19` | `2026-01-15` | → | `2026-01-19` | `2026-01-19` | ✅ CORRECT (ready to repair) |

### [4] `1648782608_RESULTS 2673-091 2647-182 2602-364 DATED 16-03-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-03-12` |
| Detected issue_date | `2026-03-16` |
| Footer date | `2026-03-12` |
| Next-auction bids deadline (Section D) | `2026-03-19` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2673/091` | 91d | `2026-03-16` | `2026-03-12` | → | `2026-03-16` | `2026-03-16` | ✅ CORRECT (ready to repair) |
| `2647/182` | 182d | `2026-03-16` | `2026-03-12` | → | `2026-03-16` | `2026-03-16` | ✅ CORRECT (ready to repair) |
| `2602/364` | 364d | `2026-03-16` | `2026-03-12` | → | `2026-03-16` | `2026-03-16` | ✅ CORRECT (ready to repair) |

### [5] `1863205270_RESULTS 2681-091 2655-182 2610-364 DATED 11-05-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-05-07` |
| Detected issue_date | `2026-05-11` |
| Footer date | `2026-05-07` |
| Next-auction bids deadline (Section D) | `2026-05-14` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2681/091` | 91d | `2026-05-11` | `2026-05-07` | → | `2026-05-11` | `2026-05-11` | ✅ CORRECT (ready to repair) |
| `2655/182` | 182d | `2026-05-11` | `2026-05-07` | → | `2026-05-11` | `2026-05-11` | ✅ CORRECT (ready to repair) |
| `2610/364` | 364d | `2026-05-11` | `2026-05-07` | → | `2026-05-11` | `2026-05-11` | ✅ CORRECT (ready to repair) |

### [6] `1956245095_RESULTS 2653-091 2627-182 2581-364 DATED 27-10-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-10-23` |
| Detected issue_date | `2025-10-27` |
| Footer date | `2025-10-23` |
| Next-auction bids deadline (Section D) | `2025-10-30` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2653/091` | 91d | `2025-10-27` | `2025-10-23` | → | `2025-10-27` | `2025-10-27` | ✅ CORRECT (ready to repair) |
| `2627/182` | 182d | `2025-10-27` | `2025-10-23` | → | `2025-10-27` | `2025-10-27` | ✅ CORRECT (ready to repair) |
| `2582/364` | 364d | `2025-10-27` | `2025-10-23` | → | `2025-10-27` | `2025-10-27` | ✅ CORRECT (ready to repair) |

### [7] `1993553951_RESULTS 2683-091 2657-182 2612-364 DATED 25-05-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-05-21` |
| Detected issue_date | `2026-05-25` |
| Footer date | `2026-05-21` |
| Next-auction bids deadline (Section D) | `2026-05-28` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2683/091` | 91d | `2026-05-25` | `2026-05-21` | → | `2026-05-25` | `2026-05-25` | ✅ CORRECT (ready to repair) |
| `2657/182` | 182d | `2026-05-25` | `2026-05-21` | → | `2026-05-25` | `2026-05-25` | ✅ CORRECT (ready to repair) |
| `2612/364` | 364d | `2026-05-25` | `2026-05-21` | → | `2026-05-25` | `2026-05-25` | ✅ CORRECT (ready to repair) |

### [8] `2051037404_RESULTS 2648-091 2622-182 2576-364 DATED 22-09-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-09-18` |
| Detected issue_date | `2025-09-22` |
| Footer date | `2025-09-18` |
| Next-auction bids deadline (Section D) | `2025-09-25` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2648/091` | 91d | `2025-09-22` | `2025-09-18` | → | `2025-09-22` | `2025-09-22` | ✅ CORRECT (ready to repair) |
| `2622/182` | 182d | `2025-09-22` | `2025-09-18` | → | `2025-09-22` | `2025-09-22` | ✅ CORRECT (ready to repair) |
| `2577/364` | 364d | `2025-09-22` | `2025-09-18` | → | `2025-09-22` | `2025-09-22` | ✅ CORRECT (ready to repair) |

### [9] `2068152467_RESULTS 2646-091 2620-182 2574-364 DATED 08-09-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-09-04` |
| Detected issue_date | `2025-09-08` |
| Footer date | `2025-09-04` |
| Next-auction bids deadline (Section D) | `2025-09-11` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2646/091` | 91d | `2025-09-08` | `2025-09-04` | → | `2025-09-08` | `2025-09-08` | ✅ CORRECT (ready to repair) |
| `2620/182` | 182d | `2025-09-08` | `2025-09-04` | → | `2025-09-08` | `2025-09-08` | ✅ CORRECT (ready to repair) |
| `2575/364` | 364d | `2025-09-08` | `2025-09-04` | → | `2025-09-08` | `2025-09-08` | ✅ CORRECT (ready to repair) |

### [10] `285300586_RESULTS 2691-091 2665-182 2620-364 DATED 20-07-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-07-16` |
| Detected issue_date | `2026-07-20` |
| Footer date | `2026-07-16` |
| Next-auction bids deadline (Section D) | `2026-07-23` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2691/091` | 91d | `2026-07-20` | `2026-07-16` | → | `2026-07-20` | `2026-07-20` | ✅ CORRECT (ready to repair) |
| `2665/182` | 182d | `2026-07-20` | `2026-07-16` | → | `2026-07-20` | `2026-07-20` | ✅ CORRECT (ready to repair) |
| `2620/364` | 364d | `2026-07-20` | `2026-07-16` | → | `2026-07-20` | `2026-07-20` | ✅ CORRECT (ready to repair) |

### [11] `298217097_RESULTS 2655-091 2629-182 2583-364 DATED 10-11-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-11-06` |
| Detected issue_date | `2025-11-10` |
| Footer date | `2025-11-06` |
| Next-auction bids deadline (Section D) | `2025-11-13` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2655/091` | 91d | `2025-11-10` | `2025-11-06` | → | `2025-11-10` | `2025-11-10` | ✅ CORRECT (ready to repair) |
| `2629/182` | 182d | `2025-11-10` | `2025-11-06` | → | `2025-11-10` | `2025-11-10` | ✅ CORRECT (ready to repair) |
| `2584/364` | 364d | `2025-11-10` | `2025-11-06` | → | `2025-11-10` | `2025-11-10` | ✅ CORRECT (ready to repair) |

### [12] `425003918_RESULTS 2686-091 2660-182 2615-364 DATED 15-06-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-06-11` |
| Detected issue_date | `2026-06-15` |
| Footer date | `2026-06-11` |
| Next-auction bids deadline (Section D) | `2026-06-18` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2686/091` | 91d | `2026-06-15` | `2026-06-11` | → | `2026-06-15` | `2026-06-15` | ✅ CORRECT (ready to repair) |
| `2660/182` | 182d | `2026-06-15` | `2026-06-11` | → | `2026-06-15` | `2026-06-15` | ✅ CORRECT (ready to repair) |
| `2615/364` | 364d | `2026-06-15` | `2026-06-11` | → | `2026-06-15` | `2026-06-15` | ✅ CORRECT (ready to repair) |

### [13] `450559664_RESULTS 2656-091 2630-182 2584-364 DATED 17-11-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-11-13` |
| Detected issue_date | `2025-11-17` |
| Footer date | `2025-11-13` |
| Next-auction bids deadline (Section D) | `2025-11-20` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2656/091` | 91d | `2025-11-17` | `2025-11-13` | → | `2025-11-17` | `2025-11-17` | ✅ CORRECT (ready to repair) |
| `2630/182` | 182d | `2025-11-17` | `2025-11-13` | → | `2025-11-17` | `2025-11-17` | ✅ CORRECT (ready to repair) |
| `2585/364` | 364d | `2025-11-17` | `2025-11-13` | → | `2025-11-17` | `2025-11-17` | ✅ CORRECT (ready to repair) |

### [14] `476753200_RESULTS 2682-091 2656-182 2611-364 DATED 18-05-2026.xlsx.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-05-14` |
| Detected issue_date | `2026-05-18` |
| Footer date | `2026-05-14` |
| Next-auction bids deadline (Section D) | `2026-05-21` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2682/091` | 91d | `2026-05-18` | `2026-05-14` | → | `2026-05-18` | `2026-05-18` | ✅ CORRECT (ready to repair) |
| `2656/182` | 182d | `2026-05-18` | `2026-05-14` | → | `2026-05-18` | `2026-05-18` | ✅ CORRECT (ready to repair) |
| `2611/364` | 364d | `2026-05-18` | `2026-05-14` | → | `2026-05-18` | `2026-05-18` | ✅ CORRECT (ready to repair) |

### [15] `499145644_RESULTS 2647-091 2621-182 2575-364 DATED 15-09-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-09-11` |
| Detected issue_date | `2025-09-15` |
| Footer date | `2025-09-11` |
| Next-auction bids deadline (Section D) | `2025-09-18` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2647/091` | 91d | `2025-09-15` | `2025-09-11` | → | `2025-09-15` | `2025-09-15` | ✅ CORRECT (ready to repair) |
| `2621/182` | 182d | `2025-09-15` | `2025-09-11` | → | `2025-09-15` | `2025-09-15` | ✅ CORRECT (ready to repair) |
| `2576/364` | 364d | `2025-09-15` | `2025-09-11` | → | `2025-09-15` | `2025-09-15` | ✅ CORRECT (ready to repair) |

### [16] `632178852_RESULTS 2663-091 2637-182 2592-364 DATED 05-01-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-12-31` |
| Detected issue_date | `2026-01-05` |
| Footer date | `2025-12-31` |
| Next-auction bids deadline (Section D) | `2026-01-08` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `5` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2663/091` | 91d | `2026-01-05` | `2025-12-31` | → | `2026-01-05` | `2026-01-05` | ✅ CORRECT (ready to repair) |
| `2637/182` | 182d | `2026-01-05` | `2025-12-31` | → | `2026-01-05` | `2026-01-05` | ✅ CORRECT (ready to repair) |
| `2592/364` | 364d | `2026-01-05` | `2025-12-31` | → | `2026-01-05` | `2026-01-05` | ✅ CORRECT (ready to repair) |

### [17] `684355991_RESULTS 2677-091 2651-182 2606-364 DATED 13-04-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-04-09` |
| Detected issue_date | `2026-04-13` |
| Footer date | `2026-04-09` |
| Next-auction bids deadline (Section D) | `2026-04-16` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2677/091` | 91d | `2026-04-13` | `2026-04-09` | → | `2026-04-13` | `2026-04-13` | ✅ CORRECT (ready to repair) |
| `2651/182` | 182d | `2026-04-13` | `2026-04-09` | → | `2026-04-13` | `2026-04-13` | ✅ CORRECT (ready to repair) |
| `2606/364` | 364d | `2026-04-13` | `2026-04-09` | → | `2026-04-13` | `2026-04-13` | ✅ CORRECT (ready to repair) |

### [18] `74192338_RESULTS 2661-091 2635-182 2590-364 DATED 22-12-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-12-18` |
| Detected issue_date | `2025-12-22` |
| Footer date | `2025-12-18` |
| Next-auction bids deadline (Section D) | `2025-12-24` [Wednesday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2661/091` | 91d | `2025-12-22` | `2025-12-18` | → | `2025-12-22` | `2025-12-22` | ✅ CORRECT (ready to repair) |
| `2635/182` | 182d | `2025-12-22` | `2025-12-18` | → | `2025-12-22` | `2025-12-22` | ✅ CORRECT (ready to repair) |
| `2590/364` | 364d | `2025-12-22` | `2025-12-18` | → | `2025-12-22` | `2025-12-22` | ✅ CORRECT (ready to repair) |

### [19] `805764277_RESULTS 2675-091 2649-182 2604-364 DATED 30-03-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-03-26` |
| Detected issue_date | `2026-03-30` |
| Footer date | `2026-03-26` |
| Next-auction bids deadline (Section D) | `2026-04-02` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2675/091` | 91d | `2026-03-30` | `2026-03-26` | → | `2026-03-30` | `2026-03-30` | ✅ CORRECT (ready to repair) |
| `2649/182` | 182d | `2026-03-30` | `2026-03-26` | → | `2026-03-30` | `2026-03-30` | ✅ CORRECT (ready to repair) |
| `2604/364` | 364d | `2026-03-30` | `2026-03-26` | → | `2026-03-30` | `2026-03-30` | ✅ CORRECT (ready to repair) |

### [20] `826400477_RESULTS 2684-091 2658-182 2613-364 DATED 01-06-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-05-28` |
| Detected issue_date | `2026-06-01` |
| Footer date | `2026-05-28` |
| Next-auction bids deadline (Section D) | `2026-06-04` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2684/091` | 91d | `2026-06-01` | `2026-05-28` | → | `2026-06-01` | `2026-06-01` | ✅ CORRECT (ready to repair) |
| `2658/182` | 182d | `2026-06-01` | `2026-05-28` | → | `2026-06-01` | `2026-06-01` | ✅ CORRECT (ready to repair) |
| `2613/364` | 364d | `2026-06-01` | `2026-05-28` | → | `2026-06-01` | `2026-06-01` | ✅ CORRECT (ready to repair) |

### [21] `883617898_RESULTS 2657-091 2631-182 2585-364 DATED 24-11-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-11-20` |
| Detected issue_date | `2025-11-24` |
| Footer date | `2025-11-20` |
| Next-auction bids deadline (Section D) | `2025-12-04` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2657/091` | 91d | `2025-11-24` | `2025-11-20` | → | `2025-11-24` | `2025-11-24` | ✅ CORRECT (ready to repair) |
| `2631/182` | 182d | `2025-11-24` | `2025-11-20` | → | `2025-11-24` | `2025-11-24` | ✅ CORRECT (ready to repair) |
| `2586/364` | 364d | `2025-11-24` | `2025-11-20` | → | `2025-11-24` | `2025-11-24` | ✅ CORRECT (ready to repair) |

### [22] `1152236339_RESULTS 2688-091 2662-182 2617-364 DATED 29-06-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-06-25` |
| Detected issue_date | `2026-06-29` |
| Footer date | `2026-06-25` |
| Next-auction bids deadline (Section D) | `2026-07-02` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2688/091` | 91d | `2026-06-29` | `2026-06-25` | → | `2026-06-29` | `2026-06-29` | ✅ CORRECT (ready to repair) |
| `2662/182` | 182d | `2026-06-29` | `2026-06-25` | → | `2026-06-29` | `2026-06-29` | ✅ CORRECT (ready to repair) |
| `2617/364` | 364d | `2026-06-29` | `2026-06-25` | → | `2026-06-29` | `2026-06-29` | ✅ CORRECT (ready to repair) |

### [23] `1156914659_RESULTS 2658-091 2632-182 2587-364 DATED 01-12-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-11-27` |
| Detected issue_date | `2025-12-01` |
| Footer date | `2025-11-27` |
| Next-auction bids deadline (Section D) | `2025-12-04` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2658/091` | 91d | `2025-12-01` | `2025-11-27` | → | `2025-12-01` | `2025-12-01` | ✅ CORRECT (ready to repair) |
| `2632/182` | 182d | `2025-12-01` | `2025-11-27` | → | `2025-12-01` | `2025-12-01` | ✅ CORRECT (ready to repair) |
| `2587/364` | 364d | `2025-12-01` | `2025-11-27` | → | `2025-12-01` | `2025-12-01` | ✅ CORRECT (ready to repair) |

### [24] `1171311949_RESULTS 2652-091 2626-182 2580-364 DATED 20-10-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-10-16` |
| Detected issue_date | `2025-10-20` |
| Footer date | `2025-10-16` |
| Next-auction bids deadline (Section D) | `2025-10-23` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2652/091` | 91d | `2025-10-20` | `2025-10-16` | → | `2025-10-20` | `2025-10-20` | ✅ CORRECT (ready to repair) |
| `2626/182` | 182d | `2025-10-20` | `2025-10-16` | → | `2025-10-20` | `2025-10-20` | ✅ CORRECT (ready to repair) |
| `2581/364` | 364d | `2025-10-20` | `2025-10-16` | → | `2025-10-20` | `2025-10-20` | ✅ CORRECT (ready to repair) |

### [25] `1398950883_RESULTS 2676-091 2650-182 2605-364 DATED 06-04-2026...pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-04-02` |
| Detected issue_date | `2026-04-06` |
| Footer date | `2026-04-02` |
| Next-auction bids deadline (Section D) | `2026-04-09` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2676/091` | 91d | `2026-04-06` | `2026-04-02` | → | `2026-04-06` | `2026-04-06` | ✅ CORRECT (ready to repair) |
| `2650/182` | 182d | `2026-04-06` | `2026-04-02` | → | `2026-04-06` | `2026-04-06` | ✅ CORRECT (ready to repair) |
| `2605/364` | 364d | `2026-04-06` | `2026-04-02` | → | `2026-04-06` | `2026-04-06` | ✅ CORRECT (ready to repair) |

### [26] `1434280977_RESULTS 2693-091 2667-182 2622-364 DATED 03-08-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-07-30` |
| Detected issue_date | `2026-08-03` |
| Footer date | `2026-07-30` |
| Next-auction bids deadline (Section D) | `2026-08-06` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2693/091` | 91d | `2026-08-03` | `2026-07-30` | → | `2026-08-03` | `2026-08-03` | ✅ CORRECT (ready to repair) |
| `2667/182` | 182d | `2026-08-03` | `2026-07-30` | → | `2026-08-03` | `2026-08-03` | ✅ CORRECT (ready to repair) |
| `2622/364` | 364d | `2026-08-03` | `2026-07-30` | → | `2026-08-03` | `2026-08-03` | ✅ CORRECT (ready to repair) |

### [27] `1510081164_RESULTS 2672-091 2646-182 2601-364 DATED 09-03-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-03-05` |
| Detected issue_date | `2026-03-09` |
| Footer date | `2026-03-05` |
| Next-auction bids deadline (Section D) | `2026-03-12` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2672/091` | 91d | `2026-03-09` | `2026-03-05` | → | `2026-03-09` | `2026-03-09` | ✅ CORRECT (ready to repair) |
| `2646/182` | 182d | `2026-03-09` | `2026-03-05` | → | `2026-03-09` | `2026-03-09` | ✅ CORRECT (ready to repair) |
| `2601/364` | 364d | `2026-03-09` | `2026-03-05` | → | `2026-03-09` | `2026-03-09` | ✅ CORRECT (ready to repair) |

### [28] `1647455569_RESULTS 2671-091 2645-182 2600-364 DATED 02-03-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-02-26` |
| Detected issue_date | `2026-03-02` |
| Footer date | `2026-02-26` |
| Next-auction bids deadline (Section D) | `2026-03-05` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2671/091` | 91d | `2026-03-02` | `2026-02-26` | → | `2026-03-02` | `2026-03-02` | ✅ CORRECT (ready to repair) |
| `2645/182` | 182d | `2026-03-02` | `2026-02-26` | → | `2026-03-02` | `2026-03-02` | ✅ CORRECT (ready to repair) |
| `2600/364` | 364d | `2026-03-02` | `2026-02-26` | → | `2026-03-02` | `2026-03-02` | ✅ CORRECT (ready to repair) |

### [29] `1742641457_RESULTS 2664-091 2638-182 2593-364 DATED 12-01-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-01-09` |
| Detected issue_date | `2026-01-12` |
| Footer date | `2026-01-09` |
| Next-auction bids deadline (Section D) | `2026-01-15` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `3` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2664/091` | 91d | `2026-01-12` | `2026-01-09` | → | `2026-01-12` | `2026-01-12` | ✅ CORRECT (ready to repair) |
| `2638/182` | 182d | `2026-01-12` | `2026-01-09` | → | `2026-01-12` | `2026-01-12` | ✅ CORRECT (ready to repair) |
| `2593/364` | 364d | `2026-01-12` | `2026-01-09` | → | `2026-01-12` | `2026-01-12` | ✅ CORRECT (ready to repair) |

### [30] `1797783072_RESULTS 2645-091 2619-182 2573-364 DATED 01-09-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-08-28` |
| Detected issue_date | `2025-09-01` |
| Footer date | `2025-08-28` |
| Next-auction bids deadline (Section D) | `2025-09-04` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2645/091` | 91d | `2025-09-01` | `2025-08-28` | → | `2025-09-01` | `2025-09-01` | ✅ CORRECT (ready to repair) |
| `2619/182` | 182d | `2025-09-01` | `2025-08-28` | → | `2025-09-01` | `2025-09-01` | ✅ CORRECT (ready to repair) |
| `2574/364` | 364d | `2025-09-01` | `2025-08-28` | → | `2025-09-01` | `2025-09-01` | ✅ CORRECT (ready to repair) |

### [31] `1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-08-21` |
| Detected issue_date | `2025-08-25` |
| Footer date | `2025-08-21` |
| Next-auction bids deadline (Section D) | `2025-08-28` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2644/091` | 91d | `2025-08-25` | `2025-08-21` | → | `2025-08-25` | `2025-08-25` | ✅ CORRECT (ready to repair) |
| `2618/182` | 182d | `2025-08-25` | `2025-08-21` | → | `2025-08-25` | `2025-08-25` | ✅ CORRECT (ready to repair) |
| `2573/364` | 364d | `2025-08-25` | `2025-08-21` | → | `2025-08-25` | `2025-08-25` | ✅ CORRECT (ready to repair) |

### [32] `1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-08-06` |
| Detected issue_date | `2026-08-10` |
| Footer date | `2026-08-06` |
| Next-auction bids deadline (Section D) | `2026-08-13` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2694/091` | 91d | `2026-08-10` | `2026-08-06` | → | `2026-08-10` | `2026-08-10` | ✅ CORRECT (ready to repair) |
| `2668/182` | 182d | `2026-08-10` | `2026-08-06` | → | `2026-08-10` | `2026-08-10` | ✅ CORRECT (ready to repair) |
| `2623/364` | 364d | `2026-08-10` | `2026-08-06` | → | `2026-08-10` | `2026-08-10` | ✅ CORRECT (ready to repair) |

### [33] `211919583_RESULTS 2692-091 2666-182 2621-364 DATED 27-07-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-07-23` |
| Detected issue_date | `2026-07-27` |
| Footer date | `2026-07-23` |
| Next-auction bids deadline (Section D) | `2026-07-30` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2692/091` | 91d | `2026-07-27` | `2026-07-23` | → | `2026-07-27` | `2026-07-27` | ✅ CORRECT (ready to repair) |
| `2666/182` | 182d | `2026-07-27` | `2026-07-23` | → | `2026-07-27` | `2026-07-27` | ✅ CORRECT (ready to repair) |
| `2621/364` | 364d | `2026-07-27` | `2026-07-23` | → | `2026-07-27` | `2026-07-27` | ✅ CORRECT (ready to repair) |

### [34] `251519977_RESULTS 2680-091 2654-182 2609-364 DATED 04-05-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-04-30` |
| Detected issue_date | `2026-05-04` |
| Footer date | `2026-04-30` |
| Next-auction bids deadline (Section D) | `2026-05-07` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2680/091` | 91d | `2026-05-04` | `2026-04-30` | → | `2026-05-04` | `2026-05-04` | ✅ CORRECT (ready to repair) |
| `2654/182` | 182d | `2026-05-04` | `2026-04-30` | → | `2026-05-04` | `2026-05-04` | ✅ CORRECT (ready to repair) |
| `2609/364` | 364d | `2026-05-04` | `2026-04-30` | → | `2026-05-04` | `2026-05-04` | ✅ CORRECT (ready to repair) |

### [35] `523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-12-24` |
| Detected issue_date | `2025-12-29` |
| Footer date | `2025-12-24` |
| Next-auction bids deadline (Section D) | `2025-12-31` [Wednesday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `5` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2662/091` | 91d | `2025-12-29` | `2025-12-24` | → | `2025-12-29` | `2025-12-29` | ✅ CORRECT (ready to repair) |
| `2636/182` | 182d | `2025-12-29` | `2025-12-24` | → | `2025-12-29` | `2025-12-29` | ✅ CORRECT (ready to repair) |
| `2591/364` | 364d | `2025-12-29` | `2025-12-24` | → | `2025-12-29` | `2025-12-29` | ✅ CORRECT (ready to repair) |

### [36] `642096599_RESULTS 2669-091 2643-182 2598-364 DATED 16-02-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-02-12` |
| Detected issue_date | `2026-02-16` |
| Footer date | `2026-02-12` |
| Next-auction bids deadline (Section D) | `2026-02-19` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2669/091` | 91d | `2026-02-16` | `2026-02-12` | → | `2026-02-16` | `2026-02-16` | ✅ CORRECT (ready to repair) |
| `2643/182` | 182d | `2026-02-16` | `2026-02-12` | → | `2026-02-16` | `2026-02-16` | ✅ CORRECT (ready to repair) |
| `2598/364` | 364d | `2026-02-16` | `2026-02-12` | → | `2026-02-16` | `2026-02-16` | ✅ CORRECT (ready to repair) |

### [37] `938848557_RESULTS 2660-091 2634-182 2589-364 DATED 15-12-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-12-11` |
| Detected issue_date | `2025-12-15` |
| Footer date | `2025-12-11` |
| Next-auction bids deadline (Section D) | `2025-12-18` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2660/091` | 91d | `2025-12-15` | `2025-12-11` | → | `2025-12-15` | `2025-12-15` | ✅ CORRECT (ready to repair) |
| `2634/182` | 182d | `2025-12-15` | `2025-12-11` | → | `2025-12-15` | `2025-12-15` | ✅ CORRECT (ready to repair) |
| `2589/364` | 364d | `2025-12-15` | `2025-12-11` | → | `2025-12-15` | `2025-12-15` | ✅ CORRECT (ready to repair) |

### [38] `1045804532_RESULTS 2690-091 2664-182 2619-364 DATED 13-07-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-07-09` |
| Detected issue_date | `2026-07-13` |
| Footer date | `2026-07-09` |
| Next-auction bids deadline (Section D) | `2026-07-16` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2690/091` | 91d | `2026-07-13` | `2026-07-09` | → | `2026-07-13` | `2026-07-13` | ✅ CORRECT (ready to repair) |
| `2664/182` | 182d | `2026-07-13` | `2026-07-09` | → | `2026-07-13` | `2026-07-13` | ✅ CORRECT (ready to repair) |
| `2619/364` | 364d | `2026-07-13` | `2026-07-09` | → | `2026-07-13` | `2026-07-13` | ✅ CORRECT (ready to repair) |

### [39] `1052486744_RESULTS 2685-091 2659-182 2614-364 DATED 08-06-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-06-04` |
| Detected issue_date | `2026-06-08` |
| Footer date | `2026-06-04` |
| Next-auction bids deadline (Section D) | `2026-06-11` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2685/091` | 91d | `2026-06-08` | `2026-06-04` | → | `2026-06-08` | `2026-06-08` | ✅ CORRECT (ready to repair) |
| `2659/182` | 182d | `2026-06-08` | `2026-06-04` | → | `2026-06-08` | `2026-06-08` | ✅ CORRECT (ready to repair) |
| `2614/364` | 364d | `2026-06-08` | `2026-06-04` | → | `2026-06-08` | `2026-06-08` | ✅ CORRECT (ready to repair) |

### [40] `1105133656_RESULTS 2666-091 2640-182 2595-364 DATED 26-01-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-01-22` |
| Detected issue_date | `2026-01-26` |
| Footer date | `2026-01-22` |
| Next-auction bids deadline (Section D) | `2026-01-29` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2666/091` | 91d | `2026-01-26` | `2026-01-22` | → | `2026-01-26` | `2026-01-26` | ✅ CORRECT (ready to repair) |
| `2640/182` | 182d | `2026-01-26` | `2026-01-22` | → | `2026-01-26` | `2026-01-26` | ✅ CORRECT (ready to repair) |
| `2595/364` | 364d | `2026-01-26` | `2026-01-22` | → | `2026-01-26` | `2026-01-26` | ✅ CORRECT (ready to repair) |

### [41] `1163282809_RESULTS 2650-091 2624-182 2578-364 DATED 06-10-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-10-02` |
| Detected issue_date | `2025-10-06` |
| Footer date | `2025-10-02` |
| Next-auction bids deadline (Section D) | `2025-10-09` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2650/091` | 91d | `2025-10-06` | `2025-10-02` | → | `2025-10-06` | `2025-10-06` | ✅ CORRECT (ready to repair) |
| `2624/182` | 182d | `2025-10-06` | `2025-10-02` | → | `2025-10-06` | `2025-10-06` | ✅ CORRECT (ready to repair) |
| `2579/364` | 364d | `2025-10-06` | `2025-10-02` | → | `2025-10-06` | `2025-10-06` | ✅ CORRECT (ready to repair) |

### [42] `1275696235_RESULTS 2668-091 2642-182 2597-364 DATED 09-02-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-02-05` |
| Detected issue_date | `2026-02-09` |
| Footer date | `2026-02-05` |
| Next-auction bids deadline (Section D) | `2026-02-12` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2668/091` | 91d | `2026-02-09` | `2026-02-05` | → | `2026-02-09` | `2026-02-09` | ✅ CORRECT (ready to repair) |
| `2642/182` | 182d | `2026-02-09` | `2026-02-05` | → | `2026-02-09` | `2026-02-09` | ✅ CORRECT (ready to repair) |
| `2597/364` | 364d | `2026-02-09` | `2026-02-05` | → | `2026-02-09` | `2026-02-09` | ✅ CORRECT (ready to repair) |

### [43] `1418647921_RESULTS 2651-091 2625-182 2579-364 DATED 13-10-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-10-09` |
| Detected issue_date | `2025-10-13` |
| Footer date | `2025-10-09` |
| Next-auction bids deadline (Section D) | `2025-10-16` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2651/091` | 91d | `2025-10-13` | `2025-10-09` | → | `2025-10-13` | `2025-10-13` | ✅ CORRECT (ready to repair) |
| `2625/182` | 182d | `2025-10-13` | `2025-10-09` | → | `2025-10-13` | `2025-10-13` | ✅ CORRECT (ready to repair) |
| `2580/364` | 364d | `2025-10-13` | `2025-10-09` | → | `2025-10-13` | `2025-10-13` | ✅ CORRECT (ready to repair) |

### [44] `1675163887_RESULTS 2674-091 2648-182 2603-364 DATED 23-03-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-03-19` |
| Detected issue_date | `2026-03-23` |
| Footer date | `2026-03-19` |
| Next-auction bids deadline (Section D) | `2026-03-26` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2674/091` | 91d | `2026-03-23` | `2026-03-19` | → | `2026-03-23` | `2026-03-23` | ✅ CORRECT (ready to repair) |
| `2648/182` | 182d | `2026-03-23` | `2026-03-19` | → | `2026-03-23` | `2026-03-23` | ✅ CORRECT (ready to repair) |
| `2603/364` | 364d | `2026-03-23` | `2026-03-19` | → | `2026-03-23` | `2026-03-23` | ✅ CORRECT (ready to repair) |

### [45] `1847007470_RESULTS 2667-091 2641-182 2596-364 DATED 02-02-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-01-29` |
| Detected issue_date | `2026-02-02` |
| Footer date | `2026-01-29` |
| Next-auction bids deadline (Section D) | `2026-02-05` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2667/091` | 91d | `2026-02-02` | `2026-01-29` | → | `2026-02-02` | `2026-02-02` | ✅ CORRECT (ready to repair) |
| `2641/182` | 182d | `2026-02-02` | `2026-01-29` | → | `2026-02-02` | `2026-02-02` | ✅ CORRECT (ready to repair) |
| `2596/364` | 364d | `2026-02-02` | `2026-01-29` | → | `2026-02-02` | `2026-02-02` | ✅ CORRECT (ready to repair) |

### [46] `1893666051_RESULTS 2654-091 2628-182 2582-364 DATED 03-11-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-10-30` |
| Detected issue_date | `2025-11-03` |
| Footer date | `2025-10-30` |
| Next-auction bids deadline (Section D) | `2025-11-06` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2654/091` | 91d | `2025-11-03` | `2025-10-30` | → | `2025-11-03` | `2025-11-03` | ✅ CORRECT (ready to repair) |
| `2628/182` | 182d | `2025-11-03` | `2025-10-30` | → | `2025-11-03` | `2025-11-03` | ✅ CORRECT (ready to repair) |
| `2583/364` | 364d | `2025-11-03` | `2025-10-30` | → | `2025-11-03` | `2025-11-03` | ✅ CORRECT (ready to repair) |

### [47] `1972093042_RESULTS 2659-091 2633-182 2588-364 DATED 08-12-2025.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2025-12-04` |
| Detected issue_date | `2025-12-08` |
| Footer date | `2025-12-04` |
| Next-auction bids deadline (Section D) | `2025-12-11` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2659/091` | 91d | `2025-12-08` | `2025-12-04` | → | `2025-12-08` | `2025-12-08` | ✅ CORRECT (ready to repair) |
| `2633/182` | 182d | `2025-12-08` | `2025-12-04` | → | `2025-12-08` | `2025-12-08` | ✅ CORRECT (ready to repair) |
| `2588/364` | 364d | `2025-12-08` | `2025-12-04` | → | `2025-12-08` | `2025-12-08` | ✅ CORRECT (ready to repair) |

### [48] `2083267917_RESULTS 2689-091 2663-182 2618-364 DATED 06-07-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-07-02` |
| Detected issue_date | `2026-07-06` |
| Footer date | `2026-07-02` |
| Next-auction bids deadline (Section D) | `2026-07-09` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2689/091` | 91d | `2026-07-06` | `2026-07-02` | → | `2026-07-06` | `2026-07-06` | ✅ CORRECT (ready to repair) |
| `2663/182` | 182d | `2026-07-06` | `2026-07-02` | → | `2026-07-06` | `2026-07-06` | ✅ CORRECT (ready to repair) |
| `2618/364` | 364d | `2026-07-06` | `2026-07-02` | → | `2026-07-06` | `2026-07-06` | ✅ CORRECT (ready to repair) |

### [49] `50420785_RESULTS 2670-091 2644-182 2599-364 DATED 23-02-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-02-19` |
| Detected issue_date | `2026-02-23` |
| Footer date | `2026-02-19` |
| Next-auction bids deadline (Section D) | `2026-02-26` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2670/091` | 91d | `2026-02-23` | `2026-02-19` | → | `2026-02-23` | `2026-02-23` | ✅ CORRECT (ready to repair) |
| `2644/182` | 182d | `2026-02-23` | `2026-02-19` | → | `2026-02-23` | `2026-02-23` | ✅ CORRECT (ready to repair) |
| `2599/364` | 364d | `2026-02-23` | `2026-02-19` | → | `2026-02-23` | `2026-02-23` | ✅ CORRECT (ready to repair) |

### [50] `549986739_RESULTS 2687-091 2661-182 2616-364 DATED 22-06-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-06-18` |
| Detected issue_date | `2026-06-22` |
| Footer date | `2026-06-18` |
| Next-auction bids deadline (Section D) | `2026-06-25` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2687/091` | 91d | `2026-06-22` | `2026-06-18` | → | `2026-06-22` | `2026-06-22` | ✅ CORRECT (ready to repair) |
| `2661/182` | 182d | `2026-06-22` | `2026-06-18` | → | `2026-06-22` | `2026-06-22` | ✅ CORRECT (ready to repair) |
| `2616/364` | 364d | `2026-06-22` | `2026-06-18` | → | `2026-06-22` | `2026-06-22` | ✅ CORRECT (ready to repair) |

### [51] `641294128_RESULTS 2679-091 2653-182 2608-364 DATED 27-04-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-04-23` |
| Detected issue_date | `2026-04-27` |
| Footer date | `2026-04-23` |
| Next-auction bids deadline (Section D) | `2026-04-30` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2679/091` | 91d | `2026-04-27` | `2026-04-23` | → | `2026-04-27` | `2026-04-27` | ✅ CORRECT (ready to repair) |
| `2653/182` | 182d | `2026-04-27` | `2026-04-23` | → | `2026-04-27` | `2026-04-27` | ✅ CORRECT (ready to repair) |
| `2608/364` | 364d | `2026-04-27` | `2026-04-23` | → | `2026-04-27` | `2026-04-27` | ✅ CORRECT (ready to repair) |

### [52] `987668783_RESULTS 2678-091 2652-182 2607-364 DATED 20-04-2026.pdf`

| Field | Value |
|-------|-------|
| Detected auction_date | `2026-04-16` |
| Detected issue_date | `2026-04-20` |
| Footer date | `2026-04-16` |
| Next-auction bids deadline (Section D) | `2026-04-23` [Thursday] |
| Next-auction closure (Section C table) | `—` |
| auction_date source | `pdf_footer` |
| issue_date source | `pdf_header` |
| Settlement gap days | `4` |
| Confidence | `HIGH` |

| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |
|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|
| `2678/091` | 91d | `2026-04-20` | `2026-04-16` | → | `2026-04-20` | `2026-04-20` | ✅ CORRECT (ready to repair) |
| `2652/182` | 182d | `2026-04-20` | `2026-04-16` | → | `2026-04-20` | `2026-04-20` | ✅ CORRECT (ready to repair) |
| `2607/364` | 364d | `2026-04-20` | `2026-04-16` | → | `2026-04-20` | `2026-04-20` | ✅ CORRECT (ready to repair) |

## Notes on CBK PDF Date Semantics

This report uses the following authoritative sources:

| Field | Primary Source | Secondary / Cross-check |
|-------|----------------|--------------------------|
| `auction_date` | Footer `Month DD, YYYY` below Director's signature | Section C table `Auction Dates & Bids Closure` (refers to NEXT auction) |
| `issue_date` | Section A header `DATED DD/MM/YYYY` | URL filename `DATED DD-MM-YYYY` |

**Important:** The `"Bids must be submitted..."` text in Section D refers to the **NEXT** auction's bid-closing date, not the current one. It is extracted for documentation only.
