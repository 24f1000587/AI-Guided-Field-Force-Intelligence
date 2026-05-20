"""
services/scoring.py  (FIXED — anchored to data_end 2026-03-29)

Problem with original version:
  - today = 2026-05-20, data ends 2026-03-29  →  52-day gap
  - recency_score:   every retailer 52+ days since visit  →  all score 100 (useless)
  - crop_urgency:    all stages were Jan-Feb  →  all score 0 (useless)
  - velocity_score:  last 4 weeks from today had 0 POS rows  →  all score 0 (useless)

Fix: anchor ALL date arithmetic to DATA_END (2026-03-29).
     replace dead crop_urgency signal with inventory_trend (week-over-week decline).

4 live signals:
  A. Visit recency     — days since last visit relative to data_end   weight 0.25
  B. Stockout risk     — weeks of cover using latest inventory + velocity  weight 0.35
  C. Sales velocity    — total units sold in last 4 weeks of data     weight 0.25
  D. Inventory trend   — week-over-week stock decline %               weight 0.15
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

# Anchor date — latest date in the dataset
DATA_END = date(2026, 3, 29)


def _weeks_of_cover(current_qty: int, avg_weekly_sales: float) -> float | None:
    if avg_weekly_sales <= 0:
        return None
    return round(current_qty / avg_weekly_sales, 2)


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 1 — Smart Visit Planner
# ─────────────────────────────────────────────────────────────────────────────

def get_visit_priority_for_rep(
    db: Session,
    rep_id: str,
    today: date | None = None
) -> list[dict]:
    """
    Returns an ordered list of retailers the rep should visit,
    with a composite priority score and human-readable reason.

    All date arithmetic anchored to DATA_END (2026-03-29) so signals
    are live regardless of when the app is run.
    """
    anchor = today or DATA_END          # use override if passed, else data_end
    lookback_sales  = anchor - timedelta(days=28)
    lookback_visits = anchor - timedelta(days=180)
    week_prev       = anchor - timedelta(days=7)

    # ── retailers in this rep's territory ────────────────────────────────────
    retailers_sql = text("""
        SELECT r.retailer_id, r.tehsil, r.state, r.district, t.territory_id
        FROM retailers r
        JOIN territories t ON r.territory_id = t.territory_id
        JOIN reps rep       ON rep.territory_id = t.territory_id
        WHERE rep.rep_id = :rep_id
    """)
    retailers = db.execute(retailers_sql, {"rep_id": rep_id}).mappings().all()
    if not retailers:
        return []

    retailer_ids = [r["retailer_id"] for r in retailers]
    tehsils      = list(set(r["tehsil"] for r in retailers))

    # ── Signal A: last visit per tehsil ──────────────────────────────────────
    last_visit_sql = text("""
        SELECT visit_tehsil, MAX(visit_date) AS last_visit
        FROM retailer_visit_log
        WHERE rep_id = :rep_id AND visit_date >= :since
        GROUP BY visit_tehsil
    """)
    last_visits = {
        row["visit_tehsil"]: row["last_visit"]
        for row in db.execute(last_visit_sql, {
            "rep_id": rep_id, "since": lookback_visits
        }).mappings()
    }

    # ── Signal C: sales velocity per retailer (last 4 weeks of data) ─────────
    velocity_sql = text("""
        SELECT retailer_id, sku_name,
               SUM(sku_qty) / 4.0 AS avg_weekly_sales
        FROM retailer_pos
        WHERE transaction_date >= :since
          AND transaction_date <= :anchor
          AND retailer_id = ANY(:retailer_ids)
        GROUP BY retailer_id, sku_name
    """)
    velocity_rows = db.execute(velocity_sql, {
        "since": lookback_sales,
        "anchor": anchor,
        "retailer_ids": retailer_ids,
    }).mappings().all()

    velocity_map: dict[str, dict[str, float]] = {}
    for row in velocity_rows:
        velocity_map.setdefault(row["retailer_id"], {})[row["sku_name"]] = float(row["avg_weekly_sales"])

    # ── Signal B: latest inventory snapshot ───────────────────────────────────
    inv_sql = text("""
        SELECT DISTINCT ON (retailer_id, sku_name)
               retailer_id, sku_name, sku_qty, week_end_date
        FROM retailer_inventory
        WHERE retailer_id = ANY(:retailer_ids)
          AND week_end_date <= :anchor
        ORDER BY retailer_id, sku_name, week_end_date DESC
    """)
    inv_rows = db.execute(inv_sql, {
        "retailer_ids": retailer_ids,
        "anchor": anchor,
    }).mappings().all()

    inv_map: dict[str, dict[str, int]] = {}
    for row in inv_rows:
        inv_map.setdefault(row["retailer_id"], {})[row["sku_name"]] = int(row["sku_qty"])

    # ── Signal D: inventory trend (week-over-week change) ────────────────────
    inv_prev_sql = text("""
        SELECT DISTINCT ON (retailer_id, sku_name)
               retailer_id, sku_name, sku_qty
        FROM retailer_inventory
        WHERE retailer_id = ANY(:retailer_ids)
          AND week_end_date <= :prev_week
        ORDER BY retailer_id, sku_name, week_end_date DESC
    """)
    inv_prev_rows = db.execute(inv_prev_sql, {
        "retailer_ids": retailer_ids,
        "prev_week": week_prev,
    }).mappings().all()

    inv_prev_map: dict[str, dict[str, int]] = {}
    for row in inv_prev_rows:
        inv_prev_map.setdefault(row["retailer_id"], {})[row["sku_name"]] = int(row["sku_qty"])

    # ── Score every retailer ──────────────────────────────────────────────────
    results = []
    for r in retailers:
        rid    = r["retailer_id"]
        tehsil = r["tehsil"]

        # A. Visit recency (0-100) — anchored to data_end
        last_visit = last_visits.get(tehsil)
        if last_visit is None:
            days_since = 180
        else:
            days_since = (anchor - last_visit).days
        recency_score = min(days_since / 30, 1.0) * 100

        # B. Stockout risk (0-100)
        inv       = inv_map.get(rid, {})
        vel       = velocity_map.get(rid, {})
        min_woc   = 999.0
        critical_sku = None
        for sku, qty in inv.items():
            avg = vel.get(sku, 0)
            woc = _weeks_of_cover(qty, avg)
            if woc is not None and woc < min_woc:
                min_woc      = woc
                critical_sku = sku

        if min_woc >= 4:
            stockout_score = 0.0
        elif min_woc <= 0:
            stockout_score = 100.0
        else:
            stockout_score = (1 - min_woc / 4) * 100

        # C. Sales velocity (0-100)
        total_weekly = sum(vel.values())
        # Cap at 400 units/week (p95 of data = ~104*4=416)
        velocity_score = min(total_weekly / 400, 1.0) * 100

        # D. Inventory trend — avg decline % across all SKUs (0-100)
        inv_prev  = inv_prev_map.get(rid, {})
        declines  = []
        for sku, curr_qty in inv.items():
            prev_qty = inv_prev.get(sku, curr_qty)
            if prev_qty > 0:
                drop_pct = (prev_qty - curr_qty) / prev_qty
                declines.append(drop_pct)
        avg_decline   = sum(declines) / len(declines) if declines else 0
        trend_score   = max(min(avg_decline * 100, 100), 0)  # clip 0-100

        # Composite
        composite = (
            0.25 * recency_score   +
            0.35 * stockout_score  +
            0.25 * velocity_score  +
            0.15 * trend_score
        )

        # Human-readable reason
        reasons = []
        if days_since >= 14:
            reasons.append(f"{days_since} days since last visit")
        if min_woc < 2 and critical_sku:
            reasons.append(f"{critical_sku} has only {min_woc:.1f} weeks of stock")
        if avg_decline > 0.25:
            reasons.append(f"inventory dropping fast ({avg_decline*100:.0f}% this week)")
        if total_weekly > 100:
            reasons.append("high-velocity retailer")
        if not reasons:
            reasons.append("routine coverage")

        results.append({
            "retailer_id":          rid,
            "tehsil":               tehsil,
            "state":                r["state"],
            "district":             r["district"],
            "priority_score":       round(composite, 1),
            "days_since_last_visit": days_since,
            "weeks_of_cover":       round(min_woc, 1) if min_woc < 999 else None,
            "critical_sku":         critical_sku,
            "weekly_sales_units":   round(total_weekly, 1),
            "inventory_decline_pct": round(avg_decline * 100, 1),
            "reason":               ". ".join(reasons).capitalize() + ".",
        })

    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results[:20]


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2 — Next Best Action (data prep for LLM)
# ─────────────────────────────────────────────────────────────────────────────

def get_retailer_context(db: Session, retailer_id: str, today: date | None = None) -> dict:
    anchor   = today or DATA_END
    lookback = anchor - timedelta(days=28)

    inv_sql = text("""
        SELECT DISTINCT ON (sku_name)
               sku_name, sku_qty, week_end_date
        FROM retailer_inventory
        WHERE retailer_id = :rid AND week_end_date <= :anchor
        ORDER BY sku_name, week_end_date DESC
    """)
    inventory = [dict(r) for r in db.execute(inv_sql, {"rid": retailer_id, "anchor": anchor}).mappings()]

    sales_sql = text("""
        SELECT sku_name,
               SUM(sku_qty)                          AS total_qty,
               ROUND(AVG(sku_price)::numeric, 2)     AS avg_price,
               COUNT(*)                              AS transactions
        FROM retailer_pos
        WHERE retailer_id = :rid
          AND transaction_date >= :since
          AND transaction_date <= :anchor
        GROUP BY sku_name
        ORDER BY total_qty DESC
    """)
    recent_sales = [dict(r) for r in db.execute(sales_sql, {
        "rid": retailer_id, "since": lookback, "anchor": anchor
    }).mappings()]

    loc_sql = text("SELECT state, district, tehsil FROM retailers WHERE retailer_id = :rid")
    loc     = db.execute(loc_sql, {"rid": retailer_id}).mappings().first()

    if loc:
        grower_sql = text("""
            SELECT crop, language, COUNT(*) AS count,
                ROUND(AVG(grower_farm_size)::numeric, 1) AS avg_farm_size
            FROM growers
            WHERE tehsil = :tehsil
            GROUP BY crop, language
            ORDER BY count DESC
            LIMIT 5
        """)
        nearby_growers = [dict(r) for r in db.execute(grower_sql, {"tehsil": loc["tehsil"]}).mappings()]
    else:
        nearby_growers = []

    last_visit_sql = text("""
        SELECT MAX(visit_date) AS last_visit, visit_type, product_recommended
        FROM retailer_visit_log v
        JOIN retailers r ON v.visit_tehsil = r.tehsil
        WHERE r.retailer_id = :rid
        GROUP BY visit_type, product_recommended
        ORDER BY last_visit DESC
        LIMIT 1
    """)
    last_visit = db.execute(last_visit_sql, {"rid": retailer_id}).mappings().first()

    vel_map = {s["sku_name"]: s["total_qty"] / 4.0 for s in recent_sales}
    for item in inventory:
        sku      = item["sku_name"]
        avg_s    = vel_map.get(sku, 0)
        item["avg_weekly_sales"] = round(avg_s, 1)
        woc      = _weeks_of_cover(item["sku_qty"], avg_s)
        item["weeks_of_cover"]   = woc
        item["status"] = (
            "OUT OF STOCK" if item["sku_qty"] == 0
            else "CRITICAL"  if woc is not None and woc < 1.5
            else "LOW"       if woc is not None and woc < 3
            else "OK"
        )

    return {
        "retailer_id":               retailer_id,
        "location":                  dict(loc) if loc else {},
        "inventory":                 inventory,
        "recent_sales_last_4_weeks": recent_sales,
        "nearby_growers":            nearby_growers,
        "last_visit":                dict(last_visit) if last_visit else None,
        "today":                     str(anchor),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 3 — Anomaly Detection  (anchored to DATA_END)
# ─────────────────────────────────────────────────────────────────────────────

def detect_anomalies(db: Session, territory_id: str | None = None) -> list[dict]:
    anchor       = DATA_END
    since_sales  = anchor - timedelta(days=28)
    since_spike  = anchor - timedelta(days=56)
    since_dead   = anchor - timedelta(days=21)
    cutoff_visit = anchor - timedelta(days=21)

    alerts = []

    # 1. Stockout risk
    stockout_sql = text("""
        WITH latest_inv AS (
            SELECT DISTINCT ON (retailer_id, sku_name)
                   retailer_id, sku_name, sku_qty
            FROM retailer_inventory
            WHERE week_end_date <= :anchor
            ORDER BY retailer_id, sku_name, week_end_date DESC
        ),
        recent_sales AS (
            SELECT retailer_id, sku_name,
                   SUM(sku_qty) / 4.0 AS avg_weekly_sales
            FROM retailer_pos
            WHERE transaction_date >= :since_sales
              AND transaction_date <= :anchor
            GROUP BY retailer_id, sku_name
        )
        SELECT li.retailer_id, li.sku_name, li.sku_qty,
               COALESCE(rs.avg_weekly_sales, 0) AS avg_weekly_sales,
               r.state, r.district, r.tehsil, r.territory_id
        FROM latest_inv li
        JOIN retailers r ON li.retailer_id = r.retailer_id
        LEFT JOIN recent_sales rs
               ON li.retailer_id = rs.retailer_id AND li.sku_name = rs.sku_name
        WHERE li.sku_qty > 0
          AND rs.avg_weekly_sales > 0
          AND (li.sku_qty / rs.avg_weekly_sales) < 1.5
          AND (:territory_id IS NULL OR r.territory_id = :territory_id)
        ORDER BY (li.sku_qty / rs.avg_weekly_sales) ASC
        LIMIT 50
    """)
    for row in db.execute(stockout_sql, {
        "anchor": anchor, "since_sales": since_sales, "territory_id": territory_id
    }).mappings():
        woc = _weeks_of_cover(row["sku_qty"], float(row["avg_weekly_sales"]))
        alerts.append({
            "type":          "STOCKOUT_RISK",
            "severity":      "HIGH" if (woc or 0) < 0.5 else "MEDIUM",
            "retailer_id":   row["retailer_id"],
            "sku":           row["sku_name"],
            "current_qty":   row["sku_qty"],
            "weeks_of_cover": round(woc, 2) if woc else None,
            "location":      f"{row['tehsil']}, {row['district']}, {row['state']}",
            "territory_id":  row["territory_id"],
            "message":       (
                f"{row['sku_name']} will run out in {round(woc,1)} weeks "
                f"at {row['retailer_id']} ({row['tehsil']})"
            ),
        })

    # 2. Demand spike
    spike_sql = text("""
        WITH weekly_sales AS (
            SELECT retailer_id, sku_name,
                   DATE_TRUNC('week', transaction_date) AS week,
                   SUM(sku_qty) AS weekly_qty
            FROM retailer_pos
            WHERE transaction_date >= :since_spike
              AND transaction_date <= :anchor
            GROUP BY retailer_id, sku_name, DATE_TRUNC('week', transaction_date)
        ),
        stats AS (
            SELECT retailer_id, sku_name,
                   AVG(weekly_qty) AS avg_qty,
                   MAX(CASE WHEN week = DATE_TRUNC('week', CAST(:anchor AS date))
                            THEN weekly_qty END) AS this_week
            FROM weekly_sales
            GROUP BY retailer_id, sku_name
        )
        SELECT s.retailer_id, s.sku_name, s.avg_qty, s.this_week,
               r.state, r.district, r.tehsil, r.territory_id
        FROM stats s
        JOIN retailers r ON s.retailer_id = r.retailer_id
        WHERE s.this_week > 2.0 * s.avg_qty
          AND s.avg_qty > 5
          AND (:territory_id IS NULL OR r.territory_id = :territory_id)
        ORDER BY (s.this_week / NULLIF(s.avg_qty, 0)) DESC
        LIMIT 30
    """)
    for row in db.execute(spike_sql, {
        "since_spike": since_spike, "anchor": anchor, "territory_id": territory_id
    }).mappings():
        if row["this_week"] and row["avg_qty"]:
            mult = round(float(row["this_week"]) / float(row["avg_qty"]), 1)
            alerts.append({
                "type":             "DEMAND_SPIKE",
                "severity":         "HIGH" if mult >= 3 else "MEDIUM",
                "retailer_id":      row["retailer_id"],
                "sku":              row["sku_name"],
                "this_week_sales":  int(row["this_week"]),
                "avg_weekly_sales": round(float(row["avg_qty"]), 1),
                "spike_multiple":   mult,
                "location":         f"{row['tehsil']}, {row['district']}, {row['state']}",
                "territory_id":     row["territory_id"],
                "message":          (
                    f"Demand spike: {row['sku_name']} selling {mult}× normal "
                    f"at {row['retailer_id']} ({row['tehsil']})"
                ),
            })

    # 3. Dead stock
    dead_sql = text("""
        WITH latest_inv AS (
            SELECT DISTINCT ON (retailer_id, sku_name)
                   retailer_id, sku_name, sku_qty
            FROM retailer_inventory
            WHERE week_end_date <= :anchor
            ORDER BY retailer_id, sku_name, week_end_date DESC
        ),
        recent_sales AS (
            SELECT DISTINCT retailer_id, sku_name
            FROM retailer_pos
            WHERE transaction_date >= :since_dead
              AND transaction_date <= :anchor
        )
        SELECT li.retailer_id, li.sku_name, li.sku_qty,
               r.state, r.district, r.tehsil, r.territory_id
        FROM latest_inv li
        JOIN retailers r ON li.retailer_id = r.retailer_id
        LEFT JOIN recent_sales rs
               ON li.retailer_id = rs.retailer_id AND li.sku_name = rs.sku_name
        WHERE li.sku_qty > 20
          AND rs.retailer_id IS NULL
          AND (:territory_id IS NULL OR r.territory_id = :territory_id)
        LIMIT 30
    """)
    for row in db.execute(dead_sql, {
        "anchor": anchor, "since_dead": since_dead, "territory_id": territory_id
    }).mappings():
        alerts.append({
            "type":         "DEAD_STOCK",
            "severity":     "LOW",
            "retailer_id":  row["retailer_id"],
            "sku":          row["sku_name"],
            "current_qty":  row["sku_qty"],
            "location":     f"{row['tehsil']}, {row['district']}, {row['state']}",
            "territory_id": row["territory_id"],
            "message":      (
                f"{row['sku_name']} has {row['sku_qty']} units unsold "
                f"for 21+ days at {row['retailer_id']}"
            ),
        })

    # 4. Coverage gap
    gap_sql = text("""
        SELECT r.retailer_id, r.tehsil, r.state, r.district, r.territory_id,
               MAX(v.visit_date) AS last_visit_date
        FROM retailers r
        LEFT JOIN retailer_visit_log v ON v.visit_tehsil = r.tehsil
        WHERE (:territory_id IS NULL OR r.territory_id = :territory_id)
        GROUP BY r.retailer_id, r.tehsil, r.state, r.district, r.territory_id
        HAVING MAX(v.visit_date) IS NULL
            OR MAX(v.visit_date) < :cutoff
        LIMIT 30
    """)
    for row in db.execute(gap_sql, {
        "cutoff": cutoff_visit, "territory_id": territory_id
    }).mappings():
        days = (anchor - row["last_visit_date"]).days if row["last_visit_date"] else 180
        alerts.append({
            "type":             "COVERAGE_GAP",
            "severity":         "MEDIUM" if days < 35 else "HIGH",
            "retailer_id":      row["retailer_id"],
            "sku":              None,
            "days_since_visit": days,
            "location":         f"{row['tehsil']}, {row['district']}, {row['state']}",
            "territory_id":     row["territory_id"],
            "message":          (
                f"Retailer {row['retailer_id']} in {row['tehsil']} "
                f"not visited in {days} days"
            ),
        })

    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 3), a["type"]))
    return alerts


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 5 — Grower Intelligence
# ─────────────────────────────────────────────────────────────────────────────

def get_grower_intelligence(db: Session, tehsil: str, today: date | None = None) -> dict:
    anchor = today or DATA_END

    summary_sql = text("""
        SELECT COUNT(*)                                                    AS total_growers,
               ROUND(AVG(grower_farm_size)::numeric, 2)                   AS avg_farm_size,
               ROUND(AVG(grower_age)::numeric, 1)                         AS avg_age,
               SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END)         AS female_count,
               SUM(CASE WHEN product_scan = true THEN 1 ELSE 0 END)       AS product_scanners,
               SUM(CASE WHEN offline_campaign_attended = true
                        THEN 1 ELSE 0 END)                                AS offline_attendees,
               SUM(CASE WHEN device_type = 'smartphone' THEN 1 ELSE 0 END) AS smartphone_users
        FROM growers WHERE tehsil = :tehsil
    """)
    summary = dict(db.execute(summary_sql, {"tehsil": tehsil}).mappings().first() or {})

    crop_sql = text("""
        SELECT crop, COUNT(*) AS count,
               ROUND(AVG(grower_farm_size)::numeric, 1) AS avg_acres
        FROM growers WHERE tehsil = :tehsil
        GROUP BY crop ORDER BY count DESC
    """)
    crops = [dict(r) for r in db.execute(crop_sql, {"tehsil": tehsil}).mappings()]

    lang_sql = text("""
        SELECT language, COUNT(*) AS count
        FROM growers WHERE tehsil = :tehsil
        GROUP BY language ORDER BY count DESC
    """)
    languages = [dict(r) for r in db.execute(lang_sql, {"tehsil": tehsil}).mappings()]

    # Crop stages — show all stages with their timing relative to anchor
    stages_sql = text("""
        SELECT crop, crop_stages FROM growers
        WHERE tehsil = :tehsil AND crop_stages IS NOT NULL
        LIMIT 200
    """)
    stage_rows = db.execute(stages_sql, {"tehsil": tehsil}).mappings().all()

    upcoming_stages: dict[str, dict] = {}
    for row in stage_rows:
        crop = row["crop"]
        for s in (row["crop_stages"] or []):
            try:
                from datetime import datetime
                sd        = datetime.strptime(s["approx"], "%Y-%m-%d").date()
                days_away = (sd - anchor).days
                # Show stages within ±45 days of anchor
                if -45 <= days_away <= 45:
                    if crop not in upcoming_stages or abs(days_away) < abs(upcoming_stages[crop]["days_away"]):
                        upcoming_stages[crop] = {
                            "stage":     s["stage"],
                            "date":      s["approx"],
                            "days_away": days_away,
                            "status":    "ACTIVE" if days_away <= 0 else f"in {days_away} days",
                        }
            except Exception:
                pass

    leads_sql = text("""
        SELECT grower_id, crop, language, device_type,
               product_name, grower_farm_size,
               product_scan, offline_campaign_attended
        FROM growers
        WHERE tehsil = :tehsil
          AND (product_scan = true OR offline_campaign_attended = true)
        ORDER BY grower_farm_size DESC
        LIMIT 10
    """)
    warm_leads = [dict(r) for r in db.execute(leads_sql, {"tehsil": tehsil}).mappings()]

    wa_sql = text("""
        SELECT COUNT(*)                                                         AS total_sent,
               SUM(CASE WHEN delivered_status THEN 1 ELSE 0 END)               AS delivered,
               SUM(CASE WHEN opened_status    THEN 1 ELSE 0 END)               AS opened,
               SUM(CASE WHEN clicked_status   THEN 1 ELSE 0 END)               AS clicked
        FROM whatsapp_campaign wc
        JOIN growers g ON wc.grower_id = g.grower_id
        WHERE g.tehsil = :tehsil
    """)
    wa_stats = dict(db.execute(wa_sql, {"tehsil": tehsil}).mappings().first() or {})

    return {
        "tehsil":                tehsil,
        "summary":               summary,
        "crop_breakdown":        crops,
        "language_breakdown":    languages,
        "upcoming_crop_stages":  upcoming_stages,
        "warm_leads":            warm_leads,
        "whatsapp_engagement":   wa_stats,
        "as_of":                 str(anchor),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 4 — Campaign Effectiveness
# ─────────────────────────────────────────────────────────────────────────────

def get_campaign_effectiveness(db: Session) -> dict:
    funnel_sql = text("""
        SELECT campaign_id, campaign_crop, campaign_product,
               SUM(social_post_impression)  AS total_impressions,
               SUM(landing_page_visits)     AS total_visits,
               SUM(lead_form_submission)    AS total_leads,
               ROUND(SUM(landing_page_visits)::numeric /
                     NULLIF(SUM(social_post_impression), 0) * 100, 2) AS ctr_pct,
               ROUND(SUM(lead_form_submission)::numeric /
                     NULLIF(SUM(landing_page_visits), 0) * 100, 2)    AS lead_rate_pct
        FROM digital_funnel
        GROUP BY campaign_id, campaign_crop, campaign_product
        ORDER BY total_impressions DESC
    """)
    funnel = [dict(r) for r in db.execute(funnel_sql).mappings()]

    wa_sql = text("""
        SELECT campaign_product,
               COUNT(*) AS total_sent,
               ROUND(SUM(CASE WHEN delivered_status THEN 1 ELSE 0 END)::numeric /
                     COUNT(*) * 100, 1) AS delivery_rate,
               ROUND(SUM(CASE WHEN opened_status THEN 1 ELSE 0 END)::numeric /
                     NULLIF(SUM(CASE WHEN delivered_status THEN 1 ELSE 0 END),0)*100,1) AS open_rate,
               ROUND(SUM(CASE WHEN clicked_status THEN 1 ELSE 0 END)::numeric /
                     NULLIF(SUM(CASE WHEN opened_status THEN 1 ELSE 0 END),0)*100,1) AS click_rate
        FROM whatsapp_campaign
        GROUP BY campaign_product ORDER BY total_sent DESC
    """)
    wa_stats = [dict(r) for r in db.execute(wa_sql).mappings()]

    device_sql = text("""
        SELECT g.device_type, COUNT(*) AS sent,
               SUM(CASE WHEN wc.opened_status THEN 1 ELSE 0 END) AS opened,
               ROUND(SUM(CASE WHEN wc.opened_status THEN 1 ELSE 0 END)::numeric /
                     COUNT(*) * 100, 1) AS open_rate
        FROM whatsapp_campaign wc
        JOIN growers g ON wc.grower_id = g.grower_id
        GROUP BY g.device_type
    """)
    device_split = [dict(r) for r in db.execute(device_sql).mappings()]

    trend_sql = text("""
        SELECT sku_name,
               TO_CHAR(transaction_date, 'YYYY-MM') AS month,
               SUM(sku_qty)                          AS total_qty,
               ROUND(SUM(sku_qty * sku_price)::numeric, 0) AS total_revenue
        FROM retailer_pos
        GROUP BY sku_name, TO_CHAR(transaction_date, 'YYYY-MM')
        ORDER BY sku_name, month
    """)
    sales_trend = [dict(r) for r in db.execute(trend_sql).mappings()]

    return {
        "digital_funnel":      funnel,
        "whatsapp_engagement": wa_stats,
        "device_type_split":   device_split,
        "sales_trend":         sales_trend,
    }