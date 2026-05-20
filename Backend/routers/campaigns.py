"""
routers/campaigns.py

Feature 4 — Campaign Effectiveness Analyzer
Connects digital funnel → WhatsApp engagement → POS sales lift
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from services.scoring import get_campaign_effectiveness

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.get("/effectiveness")
def campaign_effectiveness(db: Session = Depends(get_db)):
    """
    Feature 4: Full campaign effectiveness report.

    Returns:
    - Digital funnel conversion rates per campaign (impressions → visits → leads)
    - WhatsApp open/click rates per product
    - Device type engagement split
    - Monthly sales trend per SKU
    """
    return get_campaign_effectiveness(db)


@router.get("/funnel/weekly")
def funnel_weekly(
    campaign_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Weekly digital funnel breakdown for charting."""
    q = """
        SELECT campaign_id, campaign_crop, campaign_product,
               week_start_date,
               social_post_impression,
               landing_page_visits,
               lead_form_submission,
               ROUND(
                 landing_page_visits::numeric /
                 NULLIF(social_post_impression, 0) * 100, 2
               ) AS ctr_pct,
               ROUND(
                 lead_form_submission::numeric /
                 NULLIF(landing_page_visits, 0) * 100, 2
               ) AS lead_rate_pct
        FROM digital_funnel
    """
    params = {}
    if campaign_id:
        q += " WHERE campaign_id = :cid"
        params["cid"] = campaign_id
    q += " ORDER BY week_start_date, campaign_id"

    rows = db.execute(text(q), params).mappings().all()
    return {
        "total_rows": len(rows),
        "data": [dict(r) for r in rows],
    }


@router.get("/whatsapp/engagement")
def whatsapp_engagement(
    product: Optional[str] = Query(default=None, description="Filter by campaign_product"),
    db: Session = Depends(get_db),
):
    """
    WhatsApp engagement breakdown.
    Optionally filter by product.
    """
    q = """
        SELECT
            wc.campaign_product,
            wc.campaign_crop,
            g.state,
            g.language,
            g.device_type,
            COUNT(*) AS total_sent,
            SUM(CASE WHEN wc.delivered_status THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN wc.opened_status THEN 1 ELSE 0 END) AS opened,
            SUM(CASE WHEN wc.clicked_status THEN 1 ELSE 0 END) AS clicked,
            ROUND(
              SUM(CASE WHEN wc.opened_status THEN 1 ELSE 0 END)::numeric /
              NULLIF(SUM(CASE WHEN wc.delivered_status THEN 1 ELSE 0 END), 0) * 100, 1
            ) AS open_rate_pct
        FROM whatsapp_campaign wc
        JOIN growers g ON wc.grower_id = g.grower_id
    """
    params = {}
    if product:
        q += " WHERE wc.campaign_product = :product"
        params["product"] = product

    q += """
        GROUP BY wc.campaign_product, wc.campaign_crop, g.state, g.language, g.device_type
        ORDER BY total_sent DESC
    """

    rows = db.execute(text(q), params).mappings().all()
    return {
        "total_segments": len(rows),
        "data": [dict(r) for r in rows],
    }


@router.get("/sales/by-product")
def sales_by_product(
    product: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Monthly sales volume and revenue per SKU."""
    q = """
        SELECT
            sku_name,
            TO_CHAR(transaction_date, 'YYYY-MM') AS month,
            SUM(sku_qty) AS total_units,
            ROUND(SUM(sku_qty * sku_price)::numeric, 0) AS total_revenue,
            COUNT(DISTINCT retailer_id) AS retailer_count
        FROM retailer_pos
    """
    params = {}
    if product:
        q += " WHERE sku_name = :product"
        params["product"] = product

    q += " GROUP BY sku_name, TO_CHAR(transaction_date, 'YYYY-MM') ORDER BY sku_name, month"

    rows = db.execute(text(q), params).mappings().all()
    return {"data": [dict(r) for r in rows]}


@router.get("/list-products")
def list_products(db: Session = Depends(get_db)):
    """All unique products in the system — for dropdowns."""
    rows = db.execute(text(
        "SELECT DISTINCT sku_name FROM retailer_pos ORDER BY sku_name"
    )).scalars().all()
    return {"products": list(rows)}
