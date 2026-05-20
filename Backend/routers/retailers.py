"""
routers/retailers.py

Feature 2 — Next Best Action Advisor at point of visit
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services.scoring import get_retailer_context
from services.campaign import get_next_best_action

router = APIRouter(prefix="/retailers", tags=["Retailers"])


@router.get("/{retailer_id}/context")
def retailer_context(retailer_id: str, db: Session = Depends(get_db)):
    """
    Returns raw data context for a retailer:
    inventory, sales velocity, nearby growers, last visit.
    Use this to inspect the data feeding the AI recommendation.
    """
    ctx = get_retailer_context(db, retailer_id=retailer_id)
    if not ctx.get("location"):
        raise HTTPException(status_code=404, detail=f"Retailer {retailer_id} not found.")
    return ctx


@router.get("/{retailer_id}/next-best-action")
def next_best_action(retailer_id: str, db: Session = Depends(get_db)):
    """
    Feature 2: AI-powered next best action for a rep visiting this retailer.

    Calls Claude API with retailer inventory, sales, and grower context
    to generate:
    - Primary action for this visit
    - Which products to discuss
    - A specific talking point for the retailer
    - Agronomic advice to pass to farmers
    - Reorder suggestion if needed
    - Urgency rating
    """
    ctx = get_retailer_context(db, retailer_id=retailer_id)
    if not ctx.get("location"):
        raise HTTPException(status_code=404, detail=f"Retailer {retailer_id} not found.")

    recommendation = get_next_best_action(ctx)

    return {
        "retailer_id": retailer_id,
        "location": ctx.get("location"),
        "recommendation": recommendation,
        "data_snapshot": {
            "inventory_items": len(ctx.get("inventory", [])),
            "recent_sales_skus": len(ctx.get("recent_sales_last_4_weeks", [])),
            "nearby_grower_segments": len(ctx.get("nearby_growers", [])),
        },
    }


@router.get("/territory/{territory_id}")
def retailers_in_territory(territory_id: str, db: Session = Depends(get_db)):
    """List all retailers in a territory with their basic info."""
    from sqlalchemy import text
    rows = db.execute(
        text("""
            SELECT r.retailer_id, r.state, r.district, r.tehsil
            FROM retailers r
            WHERE r.territory_id = :tid
            ORDER BY r.state, r.district, r.tehsil
        """),
        {"tid": territory_id},
    ).mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail=f"Territory {territory_id} not found or has no retailers.")

    return {
        "territory_id": territory_id,
        "total_retailers": len(rows),
        "retailers": [dict(r) for r in rows],
    }
