"""
models.py — SQLAlchemy ORM models
----------------------------------
ALL ForeignKey constraints removed intentionally.
Reason: This is an analytics workload. FKs on high-volume tables
(310k inventory rows, 235k POS rows) cause:
  1. PostgreSQL requiring UNIQUE constraint on the parent PK
     — which breaks when tables are loaded in wrong order
  2. Slow bulk inserts (FK check on every row)
  3. Cascade issues during truncate/reload

Referential integrity is guaranteed by the ETL (load_data.py),
not the DB schema.
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date, DateTime,
    JSON, Index,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Territory(Base):
    __tablename__ = "territories"
    territory_id   = Column(String, primary_key=True)
    territory_name = Column(String)
    state          = Column(String)
    district       = Column(String)
    tehsil_list    = Column(JSON)   # list of tehsil strings


class Rep(Base):
    __tablename__ = "reps"
    rep_id         = Column(String, primary_key=True)
    territory_id   = Column(String)   # logical FK → territories.territory_id
    territory_name = Column(String)
    state          = Column(String)
    district       = Column(String)
    tehsil_list    = Column(JSON)

    __table_args__ = (
        Index("ix_rep_territory", "territory_id"),
    )


class Retailer(Base):
    __tablename__ = "retailers"
    retailer_id  = Column(String, primary_key=True)
    territory_id = Column(String)   # logical FK → territories.territory_id
    state        = Column(String)
    district     = Column(String)
    tehsil       = Column(String)

    __table_args__ = (
        Index("ix_retailer_territory", "territory_id"),
        Index("ix_retailer_tehsil",    "tehsil"),
    )


class RetailerVisitLog(Base):
    __tablename__ = "retailer_visit_log"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    rep_id              = Column(String)   # logical FK → reps.rep_id
    visit_date          = Column(Date)
    territory_id        = Column(String)   # logical FK → territories.territory_id
    visit_tehsil        = Column(String)
    visit_type          = Column(String)   # retailer meeting | grower meeting | campaign_conducted
    product_recommended = Column(String)

    __table_args__ = (
        Index("ix_visit_rep",    "rep_id"),
        Index("ix_visit_date",   "visit_date"),
        Index("ix_visit_tehsil", "visit_tehsil"),
        Index("ix_visit_terr",   "territory_id"),
    )


class RetailerInventory(Base):
    __tablename__ = "retailer_inventory"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    retailer_id   = Column(String)   # logical FK → retailers.retailer_id
    sku_id        = Column(String)
    sku_name      = Column(String)
    sku_qty       = Column(Integer)
    week_end_date = Column(Date)

    __table_args__ = (
        Index("ix_inv_retailer_sku", "retailer_id", "sku_id"),
        Index("ix_inv_date",         "week_end_date"),
        Index("ix_inv_sku",          "sku_name"),
    )


class RetailerPOS(Base):
    __tablename__ = "retailer_pos"
    id               = Column(Integer, primary_key=True, autoincrement=True)
    retailer_id      = Column(String)   # logical FK → retailers.retailer_id
    transaction_id   = Column(String)
    sku_id           = Column(String)
    sku_name         = Column(String)
    sku_qty          = Column(Integer)
    sku_price        = Column(Float)
    transaction_date = Column(Date)

    __table_args__ = (
        Index("ix_pos_retailer", "retailer_id"),
        Index("ix_pos_date",     "transaction_date"),
        Index("ix_pos_sku",      "sku_name"),
    )


class Grower(Base):
    __tablename__ = "growers"
    grower_id                  = Column(String, primary_key=True)
    state                      = Column(String)
    district                   = Column(String)
    tehsil                     = Column(String)
    language                   = Column(String)
    device_type                = Column(String)   # smartphone | keypad | unknown
    grower_age                 = Column(Integer)
    gender                     = Column(String)
    crop                       = Column(String)   # extracted from crop_calendar JSON
    sowing_start               = Column(Date)
    sowing_end                 = Column(Date)
    harvest_start              = Column(Date)
    harvest_end                = Column(Date)
    crop_stages                = Column(JSON)     # [{stage, approx}, ...]
    grower_crop_calendar       = Column(JSON)     # raw parsed JSON
    product_scan               = Column(Boolean)
    product_name               = Column(String)
    product_scan_datetime      = Column(DateTime)
    grower_farm_size           = Column(Float)
    offline_campaign_attended  = Column(Boolean)
    campaign_attendance_date   = Column(Date)

    __table_args__ = (
        Index("ix_grower_tehsil", "tehsil"),
        Index("ix_grower_crop",   "crop"),
        Index("ix_grower_state",  "state"),
    )


class WhatsappCampaign(Base):
    __tablename__ = "whatsapp_campaign"
    id                 = Column(String, primary_key=True)
    campaign_product   = Column(String)
    campaign_crop      = Column(String)
    grower_id          = Column(String)   # logical FK → growers.grower_id
    message_sent_date  = Column(Date)
    delivered_status   = Column(Boolean)
    opened_status      = Column(Boolean)
    clicked_status     = Column(Boolean)

    __table_args__ = (
        Index("ix_wa_grower", "grower_id"),
        Index("ix_wa_date",   "message_sent_date"),
        Index("ix_wa_crop",   "campaign_crop"),
    )


class DigitalFunnel(Base):
    __tablename__ = "digital_funnel"
    id                      = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id             = Column(String)
    week_start_date         = Column(Date)
    social_post_impression  = Column(Integer)
    landing_page_visits     = Column(Integer)
    lead_form_submission    = Column(Integer)
    campaign_crop           = Column(String)
    campaign_product        = Column(String)

    __table_args__ = (
        Index("ix_df_campaign", "campaign_id"),
        Index("ix_df_week",     "week_start_date"),
    )