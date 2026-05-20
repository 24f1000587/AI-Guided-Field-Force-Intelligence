"""
services/campaign.py

Handles all LLM (Claude API) calls:
  - Next Best Action advisor for Feature 2
  - Grower WhatsApp message generator for Track 1 crossover
  - Talking point generator given retailer context
"""
from __future__ import annotations
from groq import Groq
import os


import json
import os
import httpx
from datetime import date

# Product → crop mapping (from data dictionary)
PRODUCT_CROP_MAP = {
    "Topik 15 WP": "wheat",
    "Score 250 EC": "mustard",
    "Actara 25 WG": "chickpea",
    "Kavach 75 WP": "potato",
    "Tilt 250 EC": "wheat",
    "Alto 5 SC": "multiple",
    "Movondo": "multiple",
    "Cruiser 350 FS": "multiple",
    "Amistar 250 SC": "multiple",
    "Vertimec 1.8 EC": "multiple",
    "Axial 50 EC": "wheat",
    "Vibrance Integral": "multiple",
}

# Critical crop stages that need specific product recommendations
STAGE_PRODUCT_MAP = {
    "flowering": ["Score 250 EC", "Tilt 250 EC", "Amistar 250 SC"],
    "tillering": ["Topik 15 WP", "Axial 50 EC"],
    "harvesting": ["Kavach 75 WP"],
    "pod filling": ["Actara 25 WG", "Vertimec 1.8 EC"],
}


def _call_claude(system_prompt: str, user_prompt: str) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2 — Next Best Action Advisor
# ─────────────────────────────────────────────────────────────────────────────

NEXT_BEST_ACTION_SYSTEM = """
You are an AI co-pilot for Syngenta field sales representatives in India.
Your job is to give a specific, actionable recommendation for what the rep
should do and say when visiting an agricultural retailer.

You have access to:
- Current inventory levels and weeks-of-cover per product
- Recent sales data (last 4 weeks)
- Nearby farmer crop stages and language preferences
- Last visit history

Your output must be a JSON object with exactly these keys:
{
  "primary_action": "string — the single most important thing to do at this visit (1 sentence)",
  "products_to_discuss": ["list of 1-3 product names to focus on"],
  "talking_point": "string — 2-3 sentences the rep can say to the retailer, grounded in real data",
  "agronomic_advice": "string — one specific crop-protection tip the retailer can pass to farmers",
  "reorder_suggestion": "string or null — if a product needs restocking, mention qty and urgency",
  "urgency": "HIGH | MEDIUM | LOW"
}

Be specific. Use the actual product names, quantities, and crop stages from the data.
Do not use generic advice. Every recommendation must be grounded in the provided context.
Output ONLY valid JSON. No markdown, no explanation.
"""


def get_next_best_action(retailer_context: dict) -> dict:
    """
    Takes the retailer context dict from scoring.get_retailer_context()
    and returns a structured next-best-action recommendation.
    """
    loc = retailer_context.get("location", {})
    inv = retailer_context.get("inventory", [])
    sales = retailer_context.get("recent_sales_last_4_weeks", [])
    growers = retailer_context.get("nearby_growers", [])
    last_visit = retailer_context.get("last_visit")

    # Build critical inventory summary for the prompt
    critical_items = [
        f"{item['sku_name']}: {item['sku_qty']} units "
        f"({item['weeks_of_cover']:.1f} weeks cover — {item['status']})"
        for item in inv
        if item.get("status") in ("CRITICAL", "OUT OF STOCK", "LOW")
    ]
    ok_items = [
        f"{item['sku_name']}: {item['sku_qty']} units (OK)"
        for item in inv
        if item.get("status") == "OK"
    ]

    # Crop stage summary
    stage_summary = []
    for g in growers:
        stages = g.get("crop_stages") or []
        if isinstance(stages, list):
            for s in stages:
                stage_summary.append(
                    f"{g.get('crop','?')} — {s.get('stage','?')} around {s.get('approx','?')}"
                    f" ({g.get('count', 1)} growers, avg {g.get('avg_farm_size','?')} acres)"
                )

    user_prompt = f"""
RETAILER VISIT CONTEXT
======================
Retailer ID: {retailer_context['retailer_id']}
Location: {loc.get('tehsil')}, {loc.get('district')}, {loc.get('state')}
Today: {retailer_context.get('today')}
Last visit: {last_visit.get('last_visit') if last_visit else 'Unknown'} \
({last_visit.get('product_recommended') if last_visit else 'N/A'})

INVENTORY STATUS (weeks of cover):
Critical / Low stock:
{chr(10).join(critical_items) if critical_items else '  None'}
Adequate stock:
{chr(10).join(ok_items) if ok_items else '  None'}

TOP SELLING PRODUCTS (last 4 weeks):
{chr(10).join(f"  {s['sku_name']}: {s['total_qty']} units sold" for s in sales[:5])}

NEARBY FARMER CROP STAGES:
{chr(10).join(f"  {s}" for s in stage_summary) if stage_summary else '  No stage data'}

GROWER LANGUAGES IN TEHSIL:
{', '.join(f"{g.get('language')} ({g.get('count')})" for g in growers[:3])}

Generate the next best action JSON now.
"""

    raw = _call_claude(NEXT_BEST_ACTION_SYSTEM, user_prompt)

    # Clean and parse JSON
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {
            "primary_action": "Review inventory and discuss top-selling products.",
            "products_to_discuss": [s["sku_name"] for s in sales[:2]],
            "talking_point": raw[:300],
            "agronomic_advice": "Check with local agronomist for current crop stage advice.",
            "reorder_suggestion": None,
            "urgency": "MEDIUM",
        }


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2b — WhatsApp Message Generator (Track 1 crossover)
# ─────────────────────────────────────────────────────────────────────────────

WHATSAPP_SYSTEM = """
You are an agricultural marketing expert writing WhatsApp messages for Indian farmers.
Write in the farmer's primary language (or simple Hindi if unsure).
Messages must be:
- Short (max 3 sentences / ~60 words)
- Actionable (what should the farmer do NOW)
- Crop and stage specific
- Warm and respectful in tone
- End with a call to action (ask retailer / call helpline / scan QR)

Output ONLY the message text. No labels, no JSON, no explanation.
"""


def generate_whatsapp_message(
    crop: str,
    stage: str,
    product: str,
    language: str,
    farmer_name: str = "Kisan bhai",
) -> str:
    """Generates a personalised WhatsApp message for a grower."""
    user_prompt = f"""
Write a WhatsApp message for a farmer with these details:
- Crop: {crop}
- Current growth stage: {stage}
- Recommended product: {product}
- Language: {language}
- Address them as: {farmer_name}

The message should explain why this product is important at this exact growth stage
and tell them to ask their local Syngenta retailer.
"""
    return _call_claude(WHATSAPP_SYSTEM, user_prompt)


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 5b — Tehsil Intelligence Summary (natural language)
# ─────────────────────────────────────────────────────────────────────────────

TEHSIL_SUMMARY_SYSTEM = """
You are a field intelligence analyst for Syngenta India.
Given structured data about farmers in a tehsil, write a brief briefing note
for a field sales representative who is about to visit that area.

The briefing should:
- Be 3-4 sentences long
- Highlight the most important crop stage happening right now
- Mention which products are most relevant given the stage
- Note any engagement opportunities (warm leads, event attendees)
- Be written in plain English, like a briefing from a manager to a rep

Output ONLY the briefing text. No labels, no JSON.
"""


def generate_tehsil_briefing(intelligence: dict) -> str:
    """Takes grower intelligence dict and returns a natural-language briefing."""
    summary = intelligence.get("summary", {})
    crops = intelligence.get("crop_breakdown", [])
    stages = intelligence.get("upcoming_crop_stages", {})
    leads = intelligence.get("warm_leads", [])
    wa = intelligence.get("whatsapp_engagement", {})

    crop_stage_lines = []
    for crop, info in stages.items():
        crop_stage_lines.append(
            f"{crop.title()} is at {info['stage']} stage ({info['status']})"
        )

    user_prompt = f"""
TEHSIL: {intelligence.get('tehsil')}
Total growers: {summary.get('total_growers')}
Average farm size: {summary.get('avg_farm_size')} acres
Smartphone users: {summary.get('smartphone_users')}

Crop breakdown:
{chr(10).join(f"  {c['crop']}: {c['count']} growers, avg {c['avg_acres']} acres" for c in crops[:4])}

Current / upcoming crop stages:
{chr(10).join(f"  {line}" for line in crop_stage_lines) if crop_stage_lines else "  No imminent stages"}

Warm leads (scanned product or attended event): {len(leads)} growers
WhatsApp stats: {wa.get('total_sent',0)} messages sent, {wa.get('opened',0)} opened

Write the field rep briefing now.
"""
    return _call_claude(TEHSIL_SUMMARY_SYSTEM, user_prompt)
