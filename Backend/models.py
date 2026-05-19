from sqlalchemy import Column, Text, Integer, Boolean, Numeric, Date, DateTime
from database import Base

class RepTerritory(Base):
    __tablename__ = "reps_territory"
    rep_id         = Column(Text, primary_key=True)
    territory_id   = Column(Text)
    territory_name = Column(Text)
    state          = Column(Text)
    district       = Column(Text)
    tehsil_list    = Column(Text)   # JSON string

class Retailer(Base):
    __tablename__ = "retailers"
    retailer_id  = Column(Text, primary_key=True)
    territory_id = Column(Text)
    state        = Column(Text)
    district     = Column(Text)
    tehsil       = Column(Text)

class RetailerVisitLog(Base):
    __tablename__ = "retailer_visit_log"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    rep_id              = Column(Text)
    visit_date          = Column(Date)
    territory_id        = Column(Text)
    visit_tehsil        = Column(Text)
    visit_type          = Column(Text)
    product_recommended = Column(Text)

class RetailerInventoryWeekly(Base):
    __tablename__ = "retailer_inventory_weekly"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    retailer_id   = Column(Text)
    sku_id        = Column(Text)
    sku_name      = Column(Text)
    sku_qty       = Column(Integer)
    week_end_date = Column(Date)

class RetailerPOS(Base):
    __tablename__ = "retailer_pos"
    transaction_id   = Column(Text, primary_key=True)
    retailer_id      = Column(Text)
    sku_id           = Column(Text)
    sku_name         = Column(Text)
    sku_qty          = Column(Integer)
    sku_price        = Column(Numeric(10, 2))
    transaction_date = Column(Date)

class Grower(Base):
    __tablename__ = "growers"
    grower_id                 = Column(Text, primary_key=True)
    state                     = Column(Text)
    district                  = Column(Text)
    tehsil                    = Column(Text)
    language                  = Column(Text)
    device_type               = Column(Text)
    grower_age                = Column(Integer)
    gender                    = Column(Text)
    grower_crop_calendar      = Column(Text)   # JSON string
    product_scan              = Column(Boolean)
    product_name              = Column(Text)
    product_scan_datetime     = Column(DateTime)
    grower_farm_size          = Column(Numeric(6, 2))
    offline_campaign_attended = Column(Boolean)
    campaign_attendance_date  = Column(Date)

class DigitalFunnelWeekly(Base):
    __tablename__ = "digital_funnel_weekly"
    id                     = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id            = Column(Text)
    week_start_date        = Column(Date)
    social_post_impression = Column(Integer)
    landing_page_visits    = Column(Integer)
    lead_form_submission   = Column(Integer)
    campaign_crop          = Column(Text)
    campaign_product       = Column(Text)

class WhatsappCampaign(Base):
    __tablename__ = "whatsapp_campaign"
    id                = Column(Text, primary_key=True)
    campaign_product  = Column(Text)
    campaign_crop     = Column(Text)
    grower_id         = Column(Text)
    message_sent_date = Column(Date)
    delivered_status  = Column(Boolean)
    opened_status     = Column(Boolean)
    clicked_status    = Column(Boolean)