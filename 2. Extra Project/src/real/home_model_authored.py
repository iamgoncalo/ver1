"""HOME MODEL - the case-owner-authored strategic framework over the full
Versuni portfolio.

EPISTEMIC CLASS: JUDGMENT / METHOD_CHOICE, declared. Every row in this
module was authored by the case owner (2026-09-01) as strategic analysis
of the real Versuni portfolio (kitchen, coffee, floor care, garment care,
climate, home safety - eight brands). It is a reading of what each real
product causally does for human life, not review-derived evidence, and it
is served with that provenance attached so the UI can badge it honestly.
It follows the same pattern as the operator vocabulary in
magic_box_real.py: an authored, fixed analytical structure applied
deterministically - never presented as observed data.

Four permanently linked maps: the Needs map (what the home maintains),
the Product map (each product's true causal function), the Causal
Primitive map (transformations that cut across categories), and the
Autonomous-Home map (today vs the logical end state) - plus the Magic Box
feeding schema, worked examples, a 7-score comparison metric, and the
standing trigger questions.

Run:  python3 src/real/home_model_authored.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "processed", "home_model.json")

AUTHORED_NOTE = (
    "Authored strategic judgment by the case owner (2026-09-01) over the real "
    "Versuni portfolio - a declared analytical reading, not review-derived "
    "evidence. Same epistemic class as the operator vocabulary: "
    "JUDGMENT/METHOD_CHOICE, applied deterministically, badged as authored "
    "wherever shown."
)

# ---------------------------------------------------------------- 1. Home --
# What is the home really trying to maintain? One row per home system.
HOME_SYSTEMS = [
    {"system": "Food", "need": "Eat",
     "desired_state": "Food available, safe, nutritious and desirable",
     "perfect_home_chain": "Buy -> preserve -> prepare -> cook -> serve -> clean",
     "current_products": ["Airfryer", "Air Steam Cooker", "Multicooker", "Blender", "Food processor", "Grill", "Toaster", "Preethi"]},
    {"system": "Drink / Coffee", "need": "Drink + pleasure + ritual",
     "desired_state": "The desired drink at the right moment",
     "perfect_home_chain": "Know preference -> prepare -> serve -> clean -> replenish",
     "current_products": ["LatteGo", "Cafe Aromis", "Baristina", "Saeco", "Gaggia", "L'OR", "Senseo", "Kettle"]},
    {"system": "Air", "need": "Breathe",
     "desired_state": "An adequate atmosphere",
     "perfect_home_chain": "Measure -> filter -> ventilate -> humidify/dehumidify -> maintain",
     "current_products": ["Air Purifier", "Air Performer", "Humidifier"]},
    {"system": "Thermal comfort", "need": "Be thermally comfortable",
     "desired_state": "The person feels the right temperature",
     "perfect_home_chain": "Perceive person/space -> heat/cool/airflow automatically",
     "current_products": ["Fan", "Heater", "Air Performer"]},
    {"system": "Floor", "need": "Inhabit a clean space",
     "desired_state": "A continuously clean floor",
     "perfect_home_chain": "Perceive dirt -> choose dry/wet/spot cleaning -> clean -> maintain",
     "current_products": ["Vacuum", "OneUp", "AquaTrio", "HomeRun"]},
    {"system": "Garment", "need": "Have wearable clothes",
     "desired_state": "Clothes clean, dry, regular and ready",
     "perfect_home_chain": "Wash -> dry -> dewrinkle -> fold -> store -> present",
     "current_products": ["Iron", "PerfectCare", "Steamer", "OneTurn"]},
    {"system": "Security", "need": "Be safe",
     "desired_state": "Threats and anomalies perceived and managed",
     "perfect_home_chain": "Sense -> understand -> prevent/respond",
     "current_products": ["Home Safety cameras", "Doorbell", "Sensors"]},
    {"system": "Care", "need": "Care for dependents",
     "desired_state": "Needs continuously satisfied",
     "perfect_home_chain": "Perceive need -> provide -> verify",
     "current_products": ["Pet Feeder", "Water Fountain"]},
    {"system": "Garden", "need": "Maintain the outdoors",
     "desired_state": "The desired state, continuously",
     "perfect_home_chain": "Perceive growth/condition -> act -> maintain",
     "current_products": ["Robot lawn mower"]},
    {"system": "Sleep", "need": "Recover",
     "desired_state": "An environment that favours sleep",
     "perfect_home_chain": "Coordinate air + temperature + noise + light + security",
     "current_products": ["Purifier", "Fan", "Heater", "future integrated systems"]},
    {"system": "Resources", "need": "Have resources available",
     "desired_state": "Food, water, energy and consumables available",
     "perfect_home_chain": "Predict -> buy -> store -> replenish",
     "current_products": ["Very fragmented today"]},
    {"system": "Knowledge", "need": "Know / decide",
     "desired_state": "Understand the situation and the possibilities",
     "perfect_home_chain": "Represent reality -> recommend -> execute",
     "current_products": ["HomeID", "Air+ app", "HomeRun app", "Home Safety apps"]},
    {"system": "Home itself", "need": "Live without administering the house",
     "desired_state": "All of the above continuously satisfied",
     "perfect_home_chain": "Coordinate every subsystem",
     "current_products": ["A largely open space"]},
]

HOME_SYSTEMS_THESIS = ("The final category is less \"appliance\" and more "
                       "\"a state of life that needs to be maintained\".")

# ------------------------------------------------------------ 2. Products --
# Each Versuni product read by its true causal function.
AUTONOMY_SCALE = {
    "1": "Tool",
    "2": "Automates a transformation",
    "3": "Automates a task",
    "4": "Maintains a domain",
    "5": "Disappears inside the autonomous home",
}

PRODUCTS = [
    {"name": "Airfryer", "object": "Food", "immediate_cause": "Cook",
     "needs_covered": ["Food", "Taste", "Convenience", "Variety", "Potential oil reduction"],
     "burden_reduced": ["Skill", "Attention", "Time", "Effort"],
     "autonomy": "2", "end_state": "Meal system cooks autonomously"},
    {"name": "Airfryer Steam", "object": "Food", "immediate_cause": "Control heat + moisture",
     "needs_covered": ["Eat", "Taste", "Texture", "Variety", "Convenience"],
     "burden_reduced": ["Skill", "Utensils", "Attention"],
     "autonomy": "2-3", "end_state": "Multi-physics food transformation"},
    {"name": "Air Steam Cooker", "object": "Food", "immediate_cause": "Cook while preserving properties",
     "needs_covered": ["Food", "Quality", "Texture", "Nutrition"],
     "burden_reduced": ["Skill", "Attention"],
     "autonomy": "2", "end_state": "Food-state controller"},
    {"name": "Multicooker", "object": "Food", "immediate_cause": "Execute thermal processes",
     "needs_covered": ["Food", "Variety", "Convenience"],
     "burden_reduced": ["Attention", "Presence", "Skill"],
     "autonomy": "3", "end_state": "Autonomous meal execution"},
    {"name": "Rice cooker", "object": "Food", "immediate_cause": "Produce a repeatable result",
     "needs_covered": ["Food", "Consistency"],
     "burden_reduced": ["Attention"],
     "autonomy": "2", "end_state": "Absorbed into the Meal System"},
    {"name": "Pressure cooker", "object": "Food", "immediate_cause": "Accelerate transformation",
     "needs_covered": ["Food", "Time"],
     "burden_reduced": ["Time"],
     "autonomy": "2", "end_state": "Absorbed into the Meal System"},
    {"name": "Grill", "object": "Food", "immediate_cause": "Produce a surface/texture",
     "needs_covered": ["Food", "Taste", "Experience"],
     "burden_reduced": ["Skill"],
     "autonomy": "1-2", "end_state": "Texture actuator"},
    {"name": "Toaster", "object": "Food", "immediate_cause": "Modify sensory state",
     "needs_covered": ["Food", "Pleasure", "Speed"],
     "burden_reduced": ["Time"],
     "autonomy": "2", "end_state": "Invisible actuator"},
    {"name": "Kettle", "object": "Water", "immediate_cause": "Change temperature",
     "needs_covered": ["Drink", "Food", "Comfort"],
     "burden_reduced": ["Time", "Attention"],
     "autonomy": "2", "end_state": "Water-state system"},
    {"name": "Blender", "object": "Food", "immediate_cause": "Homogenise",
     "needs_covered": ["Preparation", "Texture", "Food"],
     "burden_reduced": ["Effort", "Skill"],
     "autonomy": "1-2", "end_state": "Food-manipulation actuator"},
    {"name": "Chopper", "object": "Food", "immediate_cause": "Reduce dimension",
     "needs_covered": ["Preparation", "Time"],
     "burden_reduced": ["Effort"],
     "autonomy": "1-2", "end_state": "Manipulation system"},
    {"name": "Food processor", "object": "Food", "immediate_cause": "Several mechanical transformations",
     "needs_covered": ["Preparation", "Variety", "Time"],
     "burden_reduced": ["Effort", "Utensils", "Skill"],
     "autonomy": "2", "end_state": "Generalised food manipulation"},
    {"name": "Mixer grinder", "object": "Food", "immediate_cause": "Grind + mix",
     "needs_covered": ["Preparation", "Cuisine capability"],
     "burden_reduced": ["Effort", "Skill"],
     "autonomy": "2", "end_state": "Generalised food manipulation"},
    {"name": "Juicer", "object": "Food", "immediate_cause": "Separate liquid from matrix",
     "needs_covered": ["Hydration", "Taste", "Preparation"],
     "burden_reduced": ["Effort"],
     "autonomy": "2", "end_state": "Extraction system"},
    {"name": "Pasta maker", "object": "Food", "immediate_cause": "Structure matter",
     "needs_covered": ["Food", "Variety", "Craft"],
     "burden_reduced": ["Skill", "Effort"],
     "autonomy": "2", "end_state": "Food fabrication"},
    {"name": "LatteGo", "object": "Coffee", "immediate_cause": "Bean -> finished coffee",
     "needs_covered": ["Drink", "Energy", "Pleasure", "Ritual"],
     "burden_reduced": ["Skill", "Time", "Consistency"],
     "autonomy": "3", "end_state": "Autonomous beverage system"},
    {"name": "Cafe Aromis", "object": "Coffee", "immediate_cause": "Preference -> personalised drink",
     "needs_covered": ["Drink", "Pleasure", "Personalisation"],
     "burden_reduced": ["Expertise", "Decision", "Consistency"],
     "autonomy": "3-4", "end_state": "Preference-to-beverage agent"},
    {"name": "Baristina", "object": "Coffee", "immediate_cause": "Fresh espresso, simplified",
     "needs_covered": ["Authenticity", "Convenience", "Ritual"],
     "burden_reduced": ["Skill", "Complexity"],
     "autonomy": "2-3", "end_state": "Fresh-bean beverage module"},
    {"name": "Baristina Latte", "object": "Coffee", "immediate_cause": "Coffee + milk workflow",
     "needs_covered": ["Espresso", "Cappuccino", "Ritual", "Convenience"],
     "burden_reduced": ["Steps", "Skill", "Cleaning"],
     "autonomy": "3", "end_state": "Beverage platform"},
    {"name": "Saeco", "object": "Coffee", "immediate_cause": "Premium automatic coffee",
     "needs_covered": ["Pleasure", "Quality", "Control", "Personalisation"],
     "burden_reduced": ["Expertise", "Consistency"],
     "autonomy": "3", "end_state": "Premium beverage agent"},
    {"name": "Gaggia manual", "object": "Coffee", "immediate_cause": "Enable craft",
     "needs_covered": ["Coffee", "Pleasure", "Agency", "Mastery"],
     "burden_reduced": ["Little - it raises capability"],
     "autonomy": "1", "end_state": "Remains the optional craft mode"},
    {"name": "L'OR Barista", "object": "Coffee", "immediate_cause": "Capsule -> drink",
     "needs_covered": ["Beverage", "Convenience", "Consistency"],
     "burden_reduced": ["Time", "Skill"],
     "autonomy": "3", "end_state": "Standardised consumable platform"},
    {"name": "Senseo", "object": "Coffee", "immediate_cause": "Pad -> everyday coffee",
     "needs_covered": ["Beverage", "Convenience"],
     "burden_reduced": ["Time", "Effort"],
     "autonomy": "3", "end_state": "Beverage infrastructure"},
    {"name": "Corded vacuum", "object": "Floor", "immediate_cause": "Remove particles",
     "needs_covered": ["Cleanliness", "Hygiene"],
     "burden_reduced": ["Effort"],
     "autonomy": "1-2", "end_state": "Disappears into the Floor System"},
    {"name": "Cordless vacuum", "object": "Floor", "immediate_cause": "Remove particles easily",
     "needs_covered": ["Cleanliness", "Spontaneity"],
     "burden_reduced": ["Setup", "Mobility"],
     "autonomy": "2", "end_state": "Disappears into the Floor System"},
    {"name": "OneUp", "object": "Floor", "immediate_cause": "Wet-clean without recirculating dirty water",
     "needs_covered": ["Cleanliness", "Hygiene", "Water efficiency"],
     "burden_reduced": ["Effort", "Setup"],
     "autonomy": "2", "end_state": "Wet actuator"},
    {"name": "AquaTrio", "object": "Floor", "immediate_cause": "Dry + wet in one pass",
     "needs_covered": ["Cleaning", "Hygiene", "Time"],
     "burden_reduced": ["Multiple tasks"],
     "autonomy": "2-3", "end_state": "Multimodal Floor System"},
    {"name": "HomeRun", "object": "Floor", "immediate_cause": "Navigate + clean autonomously",
     "needs_covered": ["Cleanliness", "Time", "Presence freedom"],
     "burden_reduced": ["Effort", "Presence", "Attention"],
     "autonomy": "4", "end_state": "Continuous floor homeostasis"},
    {"name": "Iron", "object": "Garment", "immediate_cause": "Restore shape",
     "needs_covered": ["Appearance", "Readiness"],
     "burden_reduced": ["Effort"],
     "autonomy": "1", "end_state": "Textile actuator"},
    {"name": "PerfectCare", "object": "Garment", "immediate_cause": "Restore quickly",
     "needs_covered": ["Readiness", "Appearance", "Scale"],
     "burden_reduced": ["Time", "Decisions"],
     "autonomy": "2", "end_state": "Garment System component"},
    {"name": "Handheld steamer", "object": "Garment", "immediate_cause": "Make a piece quickly wearable",
     "needs_covered": ["Appearance", "Immediacy", "Mobility"],
     "burden_reduced": ["Setup", "Time"],
     "autonomy": "2", "end_state": "Garment-readiness actuator"},
    {"name": "OneTurn", "object": "Garment", "immediate_cause": "Iron + steam",
     "needs_covered": ["Readiness", "Simplicity", "Flexibility"],
     "burden_reduced": ["Decisions", "Setup"],
     "autonomy": "2-3", "end_state": "Generalised textile restoration"},
    {"name": "Fabric shaver", "object": "Garment", "immediate_cause": "Remove pilling",
     "needs_covered": ["Appearance", "Longevity"],
     "burden_reduced": ["Manual restoration"],
     "autonomy": "1", "end_state": "Textile-maintenance system"},
    {"name": "Air Purifier", "object": "Air", "immediate_cause": "Remove selected contaminants",
     "needs_covered": ["Respiration", "Environmental quality", "Comfort"],
     "burden_reduced": ["Monitoring", "Intervention"],
     "autonomy": "3-4", "end_state": "Atmospheric homeostasis"},
    {"name": "Humidifier", "object": "Air", "immediate_cause": "Add moisture",
     "needs_covered": ["Comfort", "Respiratory environment"],
     "burden_reduced": ["Monitoring"],
     "autonomy": "3", "end_state": "Atmospheric homeostasis"},
    {"name": "Dehumidifier", "object": "Air", "immediate_cause": "Remove moisture",
     "needs_covered": ["Comfort", "Preservation"],
     "burden_reduced": ["Monitoring"],
     "autonomy": "3", "end_state": "Atmospheric homeostasis"},
    {"name": "Cooling fan", "object": "Air / person", "immediate_cause": "Change airflow",
     "needs_covered": ["Thermal comfort", "Sleep"],
     "burden_reduced": ["Intervention"],
     "autonomy": "2-3", "end_state": "Invisible climate regulation"},
    {"name": "Heater", "object": "Air / person", "immediate_cause": "Add heat",
     "needs_covered": ["Thermal comfort"],
     "burden_reduced": ["Intervention"],
     "autonomy": "2-3", "end_state": "Invisible climate regulation"},
    {"name": "Air Performer", "object": "Environment", "immediate_cause": "Sense + purify + cool/heat",
     "needs_covered": ["Respiration", "Comfort", "Sleep", "Air quality"],
     "burden_reduced": ["Attention", "Devices", "Decisions"],
     "autonomy": "4", "end_state": "Atmosphere operating system"},
    {"name": "Indoor camera", "object": "Information", "immediate_cause": "Make the space perceptible",
     "needs_covered": ["Security", "Awareness", "Care"],
     "burden_reduced": ["Presence"],
     "autonomy": "3", "end_state": "Home perception"},
    {"name": "Outdoor camera", "object": "Information", "immediate_cause": "Perceive the perimeter",
     "needs_covered": ["Security", "Awareness"],
     "burden_reduced": ["Presence"],
     "autonomy": "3", "end_state": "Home perception"},
    {"name": "Video doorbell", "object": "Boundary", "immediate_cause": "Perceive + communicate",
     "needs_covered": ["Security", "Access", "Convenience"],
     "burden_reduced": ["Presence"],
     "autonomy": "3", "end_state": "Autonomous boundary management"},
    {"name": "Motion sensor", "object": "Information", "immediate_cause": "Detect change",
     "needs_covered": ["Security", "Awareness", "Automation"],
     "burden_reduced": ["Vigilance"],
     "autonomy": "3-4", "end_state": "Sensory nervous system"},
    {"name": "Contact sensor", "object": "Information", "immediate_cause": "Know the boundary state",
     "needs_covered": ["Security", "Certainty"],
     "burden_reduced": ["Memory", "Vigilance"],
     "autonomy": "3-4", "end_state": "Sensory nervous system"},
    {"name": "Pet Feeder", "object": "Care", "immediate_cause": "Dose food",
     "needs_covered": ["Care", "Continuity", "Absence"],
     "burden_reduced": ["Presence", "Scheduling"],
     "autonomy": "4", "end_state": "Care System"},
    {"name": "Pet Fountain", "object": "Care / water", "immediate_cause": "Keep water available",
     "needs_covered": ["Hydration", "Care"],
     "burden_reduced": ["Maintenance", "Presence"],
     "autonomy": "3-4", "end_state": "Care System"},
    {"name": "Robot mower", "object": "Garden", "immediate_cause": "Maintain grass state",
     "needs_covered": ["Maintenance", "Appearance"],
     "burden_reduced": ["Effort", "Presence"],
     "autonomy": "4", "end_state": "Garden homeostasis"},
    {"name": "HomeID", "object": "Information", "immediate_cause": "Possibility -> guided action",
     "needs_covered": ["Knowledge", "Variety", "Confidence"],
     "burden_reduced": ["Knowledge", "Decisions"],
     "autonomy": "2-3", "end_state": "Cognitive layer of the Home OS"},
]

PRODUCTS_NOTE = (
    "Versuni's own positioning already confirms the convergence: Airfryer as "
    "cooking, Air Steam Cooker through time/temperature/humidity, AquaTrio as "
    "vacuum + wet cleaning, Air Purifier as a 3-in-1 clean/cool/heat solution.")

# --------------------------------------------------- 3. Needs compression --
# Which needs does each product compress? strong / secondary marks.
NEEDS_MATRIX_NEEDS = [
    "Basic function", "Pleasure", "Health / environment", "Time", "Effort",
    "Skill", "Attention", "Presence", "Variety", "Certainty / safety",
]
_S, _O = "strong", "secondary"
NEEDS_MATRIX = [
    {"product": "Airfryer",         "marks": {"Basic function": _S, "Pleasure": _S, "Health / environment": _O, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _S, "Variety": _S, "Certainty / safety": _O}},
    {"product": "Airfryer Steam",   "marks": {"Basic function": _S, "Pleasure": _S, "Health / environment": _O, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _S, "Variety": _S, "Certainty / safety": _O}},
    {"product": "Bimby-like system","marks": {"Basic function": _S, "Pleasure": _S, "Health / environment": _O, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _S, "Presence": _O, "Variety": _S, "Certainty / safety": _O}},
    {"product": "LatteGo",          "marks": {"Basic function": _S, "Pleasure": _S, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _S, "Variety": _S, "Certainty / safety": _S}},
    {"product": "Baristina",        "marks": {"Basic function": _S, "Pleasure": _S, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _O, "Variety": _O, "Certainty / safety": _S}},
    {"product": "Gaggia",           "marks": {"Basic function": _S, "Pleasure": _S, "Effort": _O, "Variety": _S, "Certainty / safety": _O}},
    {"product": "HomeRun",          "marks": {"Health / environment": _O, "Time": _S, "Effort": _S, "Attention": _S, "Presence": _S, "Certainty / safety": _O}},
    {"product": "AquaTrio",         "marks": {"Health / environment": _S, "Time": _S, "Effort": _S, "Attention": _O, "Certainty / safety": _O}},
    {"product": "Air Purifier",     "marks": {"Pleasure": _O, "Health / environment": _S, "Effort": _O, "Attention": _S, "Presence": _O, "Certainty / safety": _S}},
    {"product": "Air Performer",    "marks": {"Pleasure": _O, "Health / environment": _S, "Time": _O, "Effort": _S, "Attention": _S, "Presence": _S, "Certainty / safety": _S}},
    {"product": "OneTurn",          "marks": {"Pleasure": _O, "Time": _S, "Effort": _S, "Skill": _S, "Attention": _O, "Variety": _S, "Certainty / safety": _O}},
    {"product": "Home Safety",      "marks": {"Time": _O, "Effort": _O, "Attention": _S, "Presence": _S, "Certainty / safety": _S}},
    {"product": "Pet Feeder",       "marks": {"Basic function": _S, "Health / environment": _O, "Time": _S, "Effort": _S, "Attention": _S, "Presence": _S, "Certainty / safety": _S}},
    {"product": "Robot mower",      "marks": {"Pleasure": _O, "Time": _S, "Effort": _S, "Attention": _S, "Presence": _S, "Certainty / safety": _O}},
]

NEEDS_MATRIX_READING = (
    "Dense products jump out: Airfryer covers many needs, a Bimby-like system "
    "even more, Air Performer several environmental dimensions, HomeRun is "
    "extremely strong on effort + attention + presence.")

# ----------------------------------------------- 4. Causal primitive map --
# Not products - fundamental transformations. An association machine.
CAUSAL_PRIMITIVES = [
    {"primitive": "Heat", "appears_in": ["Airfryer", "Kettle", "Iron", "Heater", "Coffee"],
     "adjacent_needs": ["Cooking", "Cleaning", "Drying", "Sanitation", "Bathing", "Comfort"]},
    {"primitive": "Cool", "appears_in": ["Climate", "Food preservation"],
     "adjacent_needs": ["Sleep", "Beverage", "Food", "Body comfort"]},
    {"primitive": "Steam", "appears_in": ["Food", "Garment"],
     "adjacent_needs": ["Cleaning", "Sanitation", "Humidity", "Texture"]},
    {"primitive": "Water", "appears_in": ["Steam cooking", "Humidification", "Pet"],
     "adjacent_needs": ["Drinking", "Cleaning", "Bathing", "Food", "Garden"]},
    {"primitive": "Airflow", "appears_in": ["Purifier", "Airfryer", "Fan"],
     "adjacent_needs": ["Cooking", "Drying", "Cooling", "Ventilation", "Odor"]},
    {"primitive": "Pressure", "appears_in": ["Coffee", "Pressure cooking", "Vacuum"],
     "adjacent_needs": ["Extraction", "Cleaning", "Fluid transport"]},
    {"primitive": "Mix", "appears_in": ["Blender", "Mixer", "Coffee/milk"],
     "adjacent_needs": ["Food", "Drinks", "Cleaning chemistry", "Personalisation"]},
    {"primitive": "Separate", "appears_in": ["Juicer", "Vacuum", "Purifier"],
     "adjacent_needs": ["Water filtration", "Waste", "Laundry", "Food", "Air"]},
    {"primitive": "Grind / fragment", "appears_in": ["Coffee grinder", "Chopper"],
     "adjacent_needs": ["Food preparation", "Recycling", "Waste"]},
    {"primitive": "Dose", "appears_in": ["Coffee", "Pet feeder"],
     "adjacent_needs": ["Nutrition", "Detergent", "Water", "Reminder-style care", "Plant care"]},
    {"primitive": "Sense", "appears_in": ["Purifier", "Home Safety", "Robots"],
     "adjacent_needs": ["Food", "Laundry", "Sleep", "Care", "Energy"]},
    {"primitive": "Move", "appears_in": ["HomeRun", "Mower"],
     "adjacent_needs": ["Transport", "Serving", "Laundry", "Object handling"]},
    {"primitive": "Store", "appears_in": ["Pet feeder", "Consumables"],
     "adjacent_needs": ["Food", "Water", "Household supplies"]},
    {"primitive": "Preserve", "appears_in": ["Implicit in food/filters"],
     "adjacent_needs": ["Food", "Clothing", "Resources", "Materials"]},
    {"primitive": "Clean", "appears_in": ["AquaTrio", "OneUp", "Vacuum"],
     "adjacent_needs": ["Floor", "Textiles", "Kitchen", "Bathroom", "Air"]},
    {"primitive": "Personalise", "appears_in": ["Cafe Aromis", "Apps"],
     "adjacent_needs": ["Food", "Climate", "Light", "Sleep", "Care"]},
    {"primitive": "Predict", "appears_in": ["Emerging software"],
     "adjacent_needs": ["Inventory", "Maintenance", "Hunger", "Cleaning", "Energy"]},
    {"primitive": "Coordinate", "appears_in": ["Apps today"],
     "adjacent_needs": ["Ultimately every home domain"]},
]

CAUSAL_PRIMITIVES_READING = (
    "Say \"steam\" and the map opens: garment + food + cleaning + sanitation "
    "+ humidity. Then the Magic Box asks: is there shareable infrastructure "
    "between some of these needs? That is where new products appear.")

# ------------------------------------------------- 5. Magic Box feeding --
MAGIC_INPUTS = [
    {"input": "Need", "question": "What human state do we want to enable?"},
    {"input": "Current constraint", "question": "What prevents that state?"},
    {"input": "Object", "question": "Food? Air? Water? Floor? Body? Information?"},
    {"input": "Variable", "question": "Temperature? Moisture? Dirt? Pressure? Position?"},
    {"input": "Transformation", "question": "Heat? Mix? Separate? Sense? Dose? Move?"},
    {"input": "Current products", "question": "Which products already walk part of this path?"},
    {"input": "Adjacent needs", "question": "Which other needs use the same variable/transformation?"},
    {"input": "Human burden", "question": "Where does effort/time/skill/attention/presence remain?"},
    {"input": "Handoff", "question": "Where does a machine stop and a human must continue?"},
    {"input": "Shared infrastructure", "question": "Which mechanism can serve more than one need?"},
    {"input": "Autonomy gap", "question": "What is missing to close the loop?"},
    {"input": "Ideal state", "question": "What would it look like if the home did everything?"},
    {"input": "Counterfactual", "question": "Remove the current product form - which need remains?"},
    {"input": "Combination", "question": "Which two or three paths can be collapsed?"},
    {"input": "Output", "question": "What new product/system materialises this?"},
]

MAGIC_SEQUENCE = [
    {"step": "De-embody", "meaning": "\"This is not an Airfryer; it is controlled heat + airflow + chamber.\""},
    {"step": "Expose", "meaning": "\"Heat and airflow appear in other causalities.\""},
    {"step": "Perturb", "meaning": "\"What if food preparation, storage and cooking were one process?\""},
    {"step": "Retrieve", "meaning": "Relevant technologies and capabilities."},
    {"step": "Map", "meaning": "Needs x transformations x infrastructure."},
    {"step": "Synthesise", "meaning": "A new architecture."},
    {"step": "Materialise", "meaning": "A concrete product."},
    {"step": "Attack", "meaning": "\"Is it really better? What work stays hidden?\""},
]

# --------------------------------------------------- 6-8. Worked examples --
WORKED_EXAMPLES = [
    {"id": "airfryer", "title": "Airfryer through the Magic Box",
     "fields": [
        {"field": "Need", "value": "Eat"},
        {"field": "Adjacent needs", "value": "Nutrition, taste, variety, time, cleaning"},
        {"field": "Object", "value": "Food"},
        {"field": "Variables", "value": "Temperature, moisture, airflow, time, texture"},
        {"field": "Transformation", "value": "Controlled cooking"},
        {"field": "Current burden", "value": "Buy, store, choose, cut, load, unload, serve, clean"},
        {"field": "Strong point", "value": "The cooking itself"},
        {"field": "Weak point", "value": "The chain before and after"},
        {"field": "Shared systems", "value": "Fridge, food processor, Bimby, dishwasher, robot manipulation"},
        {"field": "Ultimate state", "value": "\"I want dinner\" -> dinner appears"},
        {"field": "Magic Box question", "value": "Why does the cooking chamber still wait for a human to prepare and load food?"},
     ],
     "closing": "This question opens far better paths than \"Airfryer with AI\"."},
    {"id": "air_purifier", "title": "Air Purifier through the Magic Box",
     "fields": [
        {"field": "Need", "value": "Breathe / inhabit"},
        {"field": "Object", "value": "Atmosphere"},
        {"field": "Variables", "value": "Particles, VOC, humidity, temperature, CO2, airflow, odor"},
        {"field": "Current transformation", "value": "Filter + circulate"},
        {"field": "Adjacent products", "value": "Humidifier, fan, heater, ventilation"},
        {"field": "Current burden", "value": "Choose modes, perceive quality, manage separate devices"},
        {"field": "Strong point", "value": "Continuous operation"},
        {"field": "Missing piece", "value": "Full atmosphere control"},
        {"field": "Ideal state", "value": "The person stops thinking about air quality"},
        {"field": "Magic Box question", "value": "Why do \"purifier\", \"fan\", \"heater\" and \"humidifier\" exist as independent categories?"},
        {"field": "Natural successor", "value": "Atmosphere System"},
     ],
     "closing": "This is exactly the move Air Performer is beginning to make."},
    {"id": "capsule", "title": "The capsule, de-embodied",
     "fields": [
        {"field": "Matter", "value": "Coffee -> any compatible consumable"},
        {"field": "Portion", "value": "One dose -> controlled dosage"},
        {"field": "Preservation", "value": "Sealed -> standardised preservation"},
        {"field": "Identity", "value": "Capsule type -> machine-readable content"},
        {"field": "Transformation", "value": "Extraction -> arbitrary processing policy"},
        {"field": "Output", "value": "Coffee -> food / drink / mixture"},
        {"field": "User need", "value": "Coffee -> the desired consumable"},
        {"field": "Infrastructure", "value": "Coffee machine -> matter-transformation platform"},
     ],
     "closing": ("A capsule is not coffee - it is a sealed, standardised matter "
                 "module. Then: coffee -> tea -> chocolate -> juice concentrate -> "
                 "soup -> broth -> protein drink -> electrolyte beverage -> sauce. "
                 "And the next perturbation: why should one capsule equal one "
                 "output? Module A + B + C -> a new output - a combinatorial "
                 "platform is born.")},
]

# ------------------------------------------- 9. Perfect home vs Versuni --
PERFECT_HOME = [
    {"domain": "Food", "does_well": "Preparation + cooking",
     "human_handoff": "Procurement, loading, serving, cleanup", "end_product": "Meal System"},
    {"domain": "Coffee", "does_well": "Highly automated preparation",
     "human_handoff": "Cup handling, replenishment, broader beverages", "end_product": "Beverage System"},
    {"domain": "Air", "does_well": "Sense + filter + partial heat/cool",
     "human_handoff": "Ventilation / complete atmospheric orchestration", "end_product": "Atmosphere System"},
    {"domain": "Floor", "does_well": "Vacuum + wet + robotic cleaning",
     "human_handoff": "Stairs, objects, corners, maintenance", "end_product": "Floor Homeostasis"},
    {"domain": "Garment", "does_well": "Dewrinkle / iron",
     "human_handoff": "Wash -> dry -> move -> fold -> store -> select", "end_product": "Garment Readiness System"},
    {"domain": "Security", "does_well": "Sensing + notification",
     "human_handoff": "Interpretation and action are still largely human", "end_product": "Protective Home System"},
    {"domain": "Pets", "does_well": "Feed + water",
     "human_handoff": "Richer monitoring and care", "end_product": "Care System"},
    {"domain": "Garden", "does_well": "Mowing",
     "human_handoff": "Watering, plant health, cleaning", "end_product": "Garden System"},
    {"domain": "Knowledge", "does_well": "Recipes, apps, device control",
     "human_handoff": "Fragmented models per product", "end_product": "Shared Home World Model"},
    {"domain": "Coordination", "does_well": "Limited",
     "human_handoff": "Products remain islands", "end_product": "Home operating system"},
]

# -------------------------------------------------- 10. Seven-score metric --
SCORE_METRICS = [
    {"metric": "Need coverage", "question": "How many relevant needs does it cover?",
     "zero": "One, narrow", "five": "Several fundamental ones"},
    {"metric": "Causal coverage", "question": "How much of the chain does it solve?",
     "zero": "One step", "five": "End-to-end"},
    {"metric": "Autonomy", "question": "How much does it execute alone?",
     "zero": "Tool", "five": "Fully autonomous"},
    {"metric": "Perception", "question": "Does it understand the state of the world?",
     "zero": "No sensing", "five": "Rich contextual model"},
    {"metric": "Integration", "question": "Does it work with other capabilities?",
     "zero": "Isolated", "five": "Systemic"},
    {"metric": "Homeostasis", "question": "Does it maintain a state over time?",
     "zero": "One-shot", "five": "Continuous closed loop"},
    {"metric": "Freedom gain", "question": "How much human burden does it remove?",
     "zero": "Minimal", "five": "The task disappears mentally"},
]

EXAMPLE_SCORES = [
    {"product": "Kettle",            "need": 1, "causal": 2, "autonomy": 2, "perception": 1, "integration": 1, "homeostasis": 1, "freedom": 2},
    {"product": "Airfryer",          "need": 3, "causal": 2, "autonomy": 3, "perception": 2, "integration": 2, "homeostasis": 1, "freedom": 3},
    {"product": "Bimby-type",        "need": 4, "causal": 3, "autonomy": 3, "perception": 2, "integration": 4, "homeostasis": 1, "freedom": 4},
    {"product": "Baristina",         "need": 3, "causal": 3, "autonomy": 3, "perception": 2, "integration": 2, "homeostasis": 1, "freedom": 4},
    {"product": "Air Performer",     "need": 4, "causal": 4, "autonomy": 4, "perception": 4, "integration": 4, "homeostasis": 4, "freedom": 4},
    {"product": "HomeRun",           "need": 3, "causal": 4, "autonomy": 4, "perception": 4, "integration": 3, "homeostasis": 4, "freedom": 5},
    {"product": "Ideal Meal System", "need": 5, "causal": 5, "autonomy": 5, "perception": 5, "integration": 5, "homeostasis": 5, "freedom": 5},
    {"product": "Ideal Home",        "need": 5, "causal": 5, "autonomy": 5, "perception": 5, "integration": 5, "homeostasis": 5, "freedom": 5},
]

SCORES_READING = (
    "A way to compare completely different things: an Airfryer and a purifier "
    "stop being incomparable. How much of the need is covered, how much of the "
    "path, how much responsibility disappears, can it perceive, maintain, "
    "integrate?")

# ---------------------------------------------- 11. Standing questions --
TRIGGER_QUESTIONS = [
    {"observe": "A specialised product", "ask": "Which higher need does this contain?"},
    {"observe": "Two machines close together", "ask": "Can they become one capability?"},
    {"observe": "The same primitive in two categories", "ask": "Is there common infrastructure?"},
    {"observe": "A human transfers something between machines", "ask": "Can the handoff be removed?"},
    {"observe": "A human verifies a result", "ask": "Can perception be added?"},
    {"observe": "A human decides repeatedly", "ask": "Can a policy or preference be learned?"},
    {"observe": "A task keeps reappearing", "ask": "Can it close into a homeostatic loop?"},
    {"observe": "A product needs its own app", "ask": "Why not share one world model?"},
    {"observe": "A repetitive consumable", "ask": "Can it be automatically dosed and replenished?"},
    {"observe": "A \"smart\" product", "ask": "Which real obligation is the smartness reducing?"},
    {"observe": "An AI feature", "ask": "Which causal step disappeared because of it?"},
    {"observe": "A product stops mid-task", "ask": "What is the true human end-state?"},
    {"observe": "Two simultaneous needs", "ask": "Is there causal coupling?"},
    {"observe": "A new idea", "ask": "What else becomes possible?"},
]

CLOSING_THESIS = (
    "Four permanently linked maps - the Needs map, the Causal Primitive map, "
    "the Product map, and the Autonomous-Home map - with the Magic Box "
    "receiving their intersections instead of inventing alone.")


def build():
    doc = {
        "_provenance": AUTHORED_NOTE,
        "generated_by": "src/real/home_model_authored.py",
        "epistemic_type": "JUDGMENT",
        "authored_by": "case owner",
        "authored_at": "2026-09-01",
        "home_systems": HOME_SYSTEMS,
        "home_systems_thesis": HOME_SYSTEMS_THESIS,
        "autonomy_scale": AUTONOMY_SCALE,
        "products": PRODUCTS,
        "products_note": PRODUCTS_NOTE,
        "needs_matrix_needs": NEEDS_MATRIX_NEEDS,
        "needs_matrix": NEEDS_MATRIX,
        "needs_matrix_reading": NEEDS_MATRIX_READING,
        "causal_primitives": CAUSAL_PRIMITIVES,
        "causal_primitives_reading": CAUSAL_PRIMITIVES_READING,
        "magic_inputs": MAGIC_INPUTS,
        "magic_sequence": MAGIC_SEQUENCE,
        "worked_examples": WORKED_EXAMPLES,
        "perfect_home": PERFECT_HOME,
        "score_metrics": SCORE_METRICS,
        "example_scores": EXAMPLE_SCORES,
        "scores_reading": SCORES_READING,
        "trigger_questions": TRIGGER_QUESTIONS,
        "closing_thesis": CLOSING_THESIS,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} home systems, {} products, {} matrix rows, {} primitives, "
          "{} perfect-home rows, {} scored examples, {} trigger questions)".format(
              OUT, len(HOME_SYSTEMS), len(PRODUCTS), len(NEEDS_MATRIX),
              len(CAUSAL_PRIMITIVES), len(PERFECT_HOME), len(EXAMPLE_SCORES),
              len(TRIGGER_QUESTIONS)))
    return doc


if __name__ == "__main__":
    build()
