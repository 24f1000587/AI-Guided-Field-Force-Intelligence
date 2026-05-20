"""
routers/field_force.py

Feature 1 — Smart Visit Planner
Feature 3 — Anomaly & Opportunity Detection
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from services.scoring import (
    get_visit_priority_for_rep,
    detect_anomalies,
)

router = APIRouter(prefix="/field-force", tags=["Field Force"])


# ── Feature 1: Smart Visit Planner ───────────────────────────────────────────

@router.get("/visit-plan/{rep_id}")
def visit_plan(
    rep_id: str,
    today: Optional[str] = Query(
        default=None,
        description="Override today's date for testing. Format: YYYY-MM-DD"
    ),
    db: Session = Depends(get_db),
):
    """
    Returns an ordered list of retailers the rep should visit today,
    with priority score and reason for each.

    Query param `today` lets you simulate any date (useful for demo).
    """
    rep_id = rep_id.strip()
    try:
        target_date = date.fromisoformat(today) if today else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    plan = get_visit_priority_for_rep(db, rep_id=rep_id, today=target_date)

    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"No retailers found for rep {rep_id}. Check the rep_id.",
        )

    return {
        "rep_id": rep_id,
        "plan_date": str(target_date),
        "total_recommendations": len(plan),
        "visit_plan": plan,
    }


# ── Feature 3: Anomaly Alerts ─────────────────────────────────────────────────

@router.get("/anomalies")
def anomaly_alerts(
    territory_id: Optional[str] = Query(
        default=None,
        description="Filter alerts by territory. Leave blank for all territories."
    ),
    severity: Optional[str] = Query(
        default=None,
        description="Filter by severity: HIGH | MEDIUM | LOW"
    ),
    alert_type: Optional[str] = Query(
        default=None,
        description="Filter by type: STOCKOUT_RISK | DEMAND_SPIKE | DEAD_STOCK | COVERAGE_GAP"
    ),
    db: Session = Depends(get_db),
):
    """
    Detects and returns anomalies across the field:
    - STOCKOUT_RISK: retailer has < 1.5 weeks of cover for a SKU
    - DEMAND_SPIKE: this week's sales > 2× normal average
    - DEAD_STOCK: inventory present but zero sales for 21+ days
    - COVERAGE_GAP: retailer not visited in 21+ days
    """
    alerts = detect_anomalies(db, territory_id=territory_id)

    # Optional filters
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity.upper()]
    if alert_type:
        alerts = [a for a in alerts if a["type"] == alert_type.upper()]

    type_counts = {}
    for a in alerts:
        type_counts[a["type"]] = type_counts.get(a["type"], 0) + 1

    return {
        "territory_id": territory_id or "ALL",
        "total_alerts": len(alerts),
        "summary": type_counts,
        "alerts": alerts,
    }


@router.get("/anomalies/summary")
def anomaly_summary(db: Session = Depends(get_db)):
    """
    Quick summary of all anomalies across all territories.
    Useful for the manager dashboard.
    """
    alerts = detect_anomalies(db, territory_id=None)

    high = [a for a in alerts if a["severity"] == "HIGH"]
    medium = [a for a in alerts if a["severity"] == "MEDIUM"]
    low = [a for a in alerts if a["severity"] == "LOW"]

    # Group HIGH alerts by territory for manager view
    territory_alerts: dict[str, int] = {}
    for a in high:
        tid = a.get("territory_id", "UNKNOWN")
        territory_alerts[tid] = territory_alerts.get(tid, 0) + 1

    top_territories = sorted(territory_alerts.items(), key=lambda x: -x[1])[:10]

    return {
        "total_alerts": len(alerts),
        "high_priority": len(high),
        "medium_priority": len(medium),
        "low_priority": len(low),
        "top_affected_territories": [
            {"territory_id": tid, "high_alert_count": count}
            for tid, count in top_territories
        ],
        "sample_critical_alerts": high[:5],
    }
