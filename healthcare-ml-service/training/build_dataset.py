"""
Generate a large, balanced medical-symptom training dataset.

Writes medical_data.csv with roughly 90 rows per specialty so the classifier has
enough per-class signal to avoid the 200-row-era drift (e.g. "mild headache"
collapsing onto Psychiatry just because that class had more headache-adjacent
words in the old corpus).

Re-run any time you want to regenerate:
    python training/build_dataset.py
"""

import csv
import os
import random
from itertools import product

random.seed(42)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "medical_data.csv")

DURATIONS = [
    "for a day", "for two days", "for three days", "for a week",
    "for several days", "since yesterday", "since this morning",
    "for a few hours", "for about a week", "for ten days",
    "for two weeks", "for a month", "off and on for months",
    "on and off for weeks", "recently",
]

# ─── Per-specialty templates ─────────────────────────────────────────────────
# Each entry is (severity, chief_complaint_template, co_symptoms).
# The chief complaint can contain {mod} for a severity adjective and {dur} for
# a duration phrase; slots are filled on generation.

MILD = ["mild", "slight", "minor", "occasional", "a little"]
MOD = ["moderate", "bothering", "persistent", "ongoing", "constant"]
SEV = ["severe", "intense", "terrible", "extreme", "unbearable"]

def rows_cardiology():
    templates = [
        ("high", "sudden crushing chest pain radiating to left arm",
         "sweating nausea shortness of breath"),
        ("high", "severe chest pressure and tightness {dur}",
         "sweating cold clammy skin"),
        ("high", "crushing chest pain {dur}",
         "nausea vomiting sweating"),
        ("high", "chest pain radiating to jaw and shoulder",
         "sweating dizziness"),
        ("high", "heart attack symptoms crushing chest pain {dur}",
         "sweating weakness nausea"),
        ("high", "angina chest pain on walking {dur}",
         "breathlessness"),
        ("high", "chest pain severe and unbearable {dur}",
         "sweating vomiting"),
        ("high", "chest tightness and left arm numbness",
         "sweating nausea"),
        ("medium", "chest pain when climbing stairs {dur}",
         "breathlessness fatigue"),
        ("medium", "{mod} chest pain and pressure {dur}",
         "sweating lightheadedness"),
        ("medium", "heart palpitations and racing heartbeat {dur}",
         "anxiety sweating"),
        ("medium", "irregular heartbeat {dur}",
         "fatigue shortness of breath"),
        ("medium", "rapid heartbeat and fluttering {dur}",
         "dizziness sweating"),
        ("medium", "pounding heart and chest tightness {dur}",
         "sweating dizziness"),
        ("medium", "shortness of breath on exertion {dur}",
         "fatigue ankle swelling"),
        ("medium", "high blood pressure and dizziness {dur}",
         "headache fatigue"),
        ("medium", "swollen ankles and breathlessness {dur}",
         "fatigue weight gain"),
        ("medium", "cardiac arrhythmia fluttering chest {dur}",
         "lightheadedness"),
        ("medium", "slow heart rate and fainting spells {dur}",
         "weakness"),
        ("low", "{mod} chest discomfort after eating {dur}",
         "bloating"),
        ("low", "{mod} palpitations after caffeine {dur}",
         "none"),
        ("low", "{mod} fluttering in chest occasionally",
         "none"),
        ("low", "brief chest twinge {dur}",
         "none"),
        ("low", "mild tightness in chest after exercise",
         "none"),
    ]
    return _expand(templates, "Cardiology")


def rows_neurology():
    templates = [
        ("high", "sudden worst headache of my life",
         "neck stiffness vomiting"),
        ("high", "severe migraine with aura and vomiting",
         "light sensitivity nausea"),
        ("high", "thunderclap headache {dur}",
         "neck stiffness confusion"),
        ("high", "numbness in face and arm {dur}",
         "slurred speech weakness"),
        ("high", "seizure and loss of consciousness",
         "confusion fatigue"),
        ("high", "stroke symptoms face drooping",
         "slurred speech arm weakness"),
        ("high", "sudden numbness one side of body",
         "confusion difficulty speaking"),
        ("high", "tremor and loss of balance {dur}",
         "weakness"),
        ("high", "severe dizziness with fainting {dur}",
         "nausea blurred vision"),
        ("medium", "{mod} headache {dur}",
         "nausea sensitivity to light"),
        ("medium", "throbbing headache behind the eyes {dur}",
         "nausea sensitivity to light"),
        ("medium", "migraine attacks {dur}",
         "nausea sensitivity to sound"),
        ("medium", "tension headache {dur}",
         "neck pain shoulder tightness"),
        ("medium", "dizziness and room spinning vertigo {dur}",
         "nausea balance issues"),
        ("medium", "{mod} vertigo and imbalance {dur}",
         "nausea"),
        ("medium", "numbness and tingling in hands {dur}",
         "weakness"),
        ("medium", "tingling in feet and legs {dur}",
         "numbness"),
        ("medium", "hand tremors {dur}",
         "weakness"),
        ("medium", "memory loss and confusion {dur}",
         "disorientation"),
        ("medium", "frequent headaches {dur}",
         "nausea fatigue"),
        ("medium", "persistent headache for weeks",
         "dizziness fatigue"),
        ("medium", "chronic migraine {dur}",
         "light sensitivity nausea"),
        ("medium", "cluster headache behind one eye",
         "tearing nasal congestion"),
        ("low", "{mod} headache {dur}",
         "none"),
        ("low", "{mod} occasional headache {dur}",
         "none"),
        ("low", "rare mild migraine {dur}",
         "slight nausea"),
        ("low", "{mod} dizziness when standing up",
         "none"),
        ("low", "{mod} numbness in fingertip {dur}",
         "none"),
        ("low", "headache three out of ten {dur}",
         "none"),
        ("low", "low grade headache {dur}",
         "slight fatigue"),
    ]
    return _expand(templates, "Neurology")


def rows_orthopedics():
    templates = [
        ("high", "severe back pain cannot move {dur}",
         "muscle spasm stiffness"),
        ("high", "unbearable knee pain after fall",
         "swelling bruising"),
        ("high", "broken ankle after sports injury",
         "swelling inability to walk"),
        ("high", "fracture wrist pain and swelling",
         "bruising numbness"),
        ("high", "severe hip pain cannot walk {dur}",
         "stiffness weakness"),
        ("high", "dislocated shoulder intense pain",
         "swelling numbness"),
        ("medium", "{mod} lower back pain {dur}",
         "stiffness"),
        ("medium", "{mod} knee pain when climbing stairs {dur}",
         "swelling stiffness"),
        ("medium", "{mod} shoulder pain lifting arm {dur}",
         "stiffness weakness"),
        ("medium", "twisted ankle swelling after football",
         "bruising"),
        ("medium", "sprained ankle swelling {dur}",
         "limping"),
        ("medium", "neck pain and stiffness {dur}",
         "headache shoulder pain"),
        ("medium", "wrist pain after typing {dur}",
         "numbness tingling"),
        ("medium", "elbow pain with tenderness {dur}",
         "weakness when lifting"),
        ("medium", "hip pain walking long distances {dur}",
         "stiffness"),
        ("medium", "joint pain in multiple joints {dur}",
         "stiffness swelling"),
        ("medium", "arthritis pain and stiffness {dur}",
         "joint swelling"),
        ("medium", "frozen shoulder restricted movement {dur}",
         "stiffness pain"),
        ("medium", "{mod} back ache after lifting heavy things",
         "muscle soreness"),
        ("medium", "knee swelling after running {dur}",
         "pain stiffness"),
        ("medium", "pulled muscle in thigh {dur}",
         "swelling bruising"),
        ("medium", "tennis elbow pain {dur}",
         "weakness in grip"),
        ("medium", "sciatica shooting pain down leg {dur}",
         "numbness tingling"),
        ("low", "{mod} muscle soreness after exercise",
         "none"),
        ("low", "{mod} back ache after long sitting",
         "none"),
        ("low", "{mod} knee twinge after stairs",
         "none"),
        ("low", "{mod} stiff neck after sleeping wrong",
         "none"),
        ("low", "{mod} ankle ache after long walk",
         "none"),
    ]
    return _expand(templates, "Orthopedics")


def rows_dermatology():
    templates = [
        ("high", "severe rash spreading all over body {dur}",
         "fever itching"),
        ("high", "painful skin infection with pus {dur}",
         "fever swelling"),
        ("high", "sudden face swelling with hives",
         "itching breathing trouble"),
        ("medium", "{mod} rash on arms and legs {dur}",
         "itching"),
        ("medium", "{mod} eczema flare up with itching {dur}",
         "dry skin redness"),
        ("medium", "psoriasis patches on elbows {dur}",
         "itching flaking"),
        ("medium", "acne breakouts on face {dur}",
         "oily skin"),
        ("medium", "cystic acne painful bumps {dur}",
         "scarring"),
        ("medium", "hair loss in patches {dur}",
         "itching scaly scalp"),
        ("medium", "thinning hair and bald spots {dur}",
         "dry scalp"),
        ("medium", "skin redness and peeling {dur}",
         "itching"),
        ("medium", "fungal infection between toes {dur}",
         "itching peeling"),
        ("medium", "ringworm circular rash {dur}",
         "itching"),
        ("medium", "warts on hands {dur}",
         "none"),
        ("medium", "changing mole on back {dur}",
         "irregular borders"),
        ("medium", "dry itchy patches of skin {dur}",
         "flaking"),
        ("medium", "hives and welts {dur}",
         "itching"),
        ("medium", "rosacea redness on cheeks {dur}",
         "flushing"),
        ("medium", "dandruff and scalp itching {dur}",
         "flakes"),
        ("medium", "skin allergy with swelling {dur}",
         "redness itching"),
        ("low", "{mod} acne {dur}",
         "none"),
        ("low", "{mod} itchy skin patch {dur}",
         "none"),
        ("low", "{mod} dry skin {dur}",
         "none"),
        ("low", "{mod} single pimple on chin",
         "none"),
        ("low", "{mod} sunburn {dur}",
         "slight peeling"),
        ("low", "{mod} dandruff occasional",
         "none"),
    ]
    return _expand(templates, "Dermatology")


def rows_general_physician():
    templates = [
        ("high", "high fever 104 with chills and weakness",
         "body ache confusion"),
        ("high", "severe flu unable to get out of bed {dur}",
         "fever cough body ache"),
        ("medium", "fever 102 body ache and cough {dur}",
         "fatigue weakness"),
        ("medium", "fever and sore throat {dur}",
         "cough runny nose"),
        ("medium", "persistent cough {dur}",
         "mild fever fatigue"),
        ("medium", "cold and runny nose {dur}",
         "sneezing sore throat"),
        ("medium", "flu like symptoms {dur}",
         "body ache fatigue"),
        ("medium", "fatigue and weakness {dur}",
         "loss of appetite"),
        ("medium", "general body ache {dur}",
         "fatigue fever"),
        ("medium", "viral infection fever and chills {dur}",
         "body ache"),
        ("medium", "dehydration and weakness {dur}",
         "dizziness"),
        ("medium", "feeling unwell for several days",
         "mild fever fatigue"),
        ("medium", "annual checkup and general health review",
         "none"),
        ("medium", "general malaise {dur}",
         "low energy"),
        ("medium", "low grade fever {dur}",
         "headache fatigue"),
        ("medium", "headache and fever {dur}",
         "body ache"),
        ("medium", "throat infection with cough {dur}",
         "fever"),
        ("medium", "fainted once while standing",
         "dehydration fatigue"),
        ("medium", "unexplained weight loss {dur}",
         "fatigue"),
        ("medium", "not feeling well in general {dur}",
         "tired low energy"),
        ("medium", "allergic reaction with sneezing {dur}",
         "runny nose"),
        ("low", "{mod} cold {dur}",
         "none"),
        ("low", "{mod} cough {dur}",
         "none"),
        ("low", "{mod} sore throat {dur}",
         "none"),
        ("low", "{mod} sneezing and stuffy nose",
         "none"),
        ("low", "{mod} headache and fatigue",
         "none"),
        ("low", "{mod} feeling tired {dur}",
         "none"),
        ("low", "{mod} runny nose {dur}",
         "none"),
        ("low", "i feel bad {dur}",
         "none"),
        ("low", "i feel unwell",
         "none"),
        ("low", "general health checkup",
         "none"),
    ]
    return _expand(templates, "General Physician")


def rows_gastroenterology():
    templates = [
        ("high", "vomiting blood repeatedly {dur}",
         "weakness dizziness"),
        ("high", "blood in stool {dur}",
         "abdominal pain weakness"),
        ("high", "severe abdominal pain cannot move {dur}",
         "vomiting fever"),
        ("high", "sudden sharp stomach pain {dur}",
         "vomiting sweating"),
        ("medium", "{mod} stomach pain {dur}",
         "nausea"),
        ("medium", "acid reflux and heartburn after meals {dur}",
         "burping"),
        ("medium", "heartburn and chest burning after eating {dur}",
         "regurgitation"),
        ("medium", "persistent nausea {dur}",
         "loss of appetite"),
        ("medium", "vomiting after meals {dur}",
         "weakness"),
        ("medium", "diarrhea {dur}",
         "dehydration abdominal cramps"),
        ("medium", "constipation and bloating {dur}",
         "abdominal discomfort"),
        ("medium", "bloating and gas after meals {dur}",
         "burping"),
        ("medium", "indigestion {dur}",
         "nausea bloating"),
        ("medium", "stomach cramps and loose stools {dur}",
         "dehydration"),
        ("medium", "ulcer pain burning stomach {dur}",
         "nausea loss of appetite"),
        ("medium", "gastritis stomach inflammation {dur}",
         "nausea vomiting"),
        ("medium", "irritable bowel alternating diarrhea constipation {dur}",
         "bloating"),
        ("medium", "yellow eyes jaundice {dur}",
         "dark urine fatigue"),
        ("medium", "bloody stools and abdominal pain {dur}",
         "weakness"),
        ("medium", "food poisoning vomiting and diarrhea {dur}",
         "fever dehydration"),
        ("medium", "liver pain right upper abdomen {dur}",
         "nausea fatigue"),
        ("medium", "gallbladder pain after fatty meal {dur}",
         "nausea bloating"),
        ("low", "{mod} indigestion after heavy meal",
         "none"),
        ("low", "{mod} heartburn occasionally",
         "none"),
        ("low", "{mod} constipation {dur}",
         "none"),
        ("low", "{mod} stomach ache {dur}",
         "none"),
        ("low", "{mod} bloating after eating",
         "none"),
        ("low", "{mod} loose motion {dur}",
         "none"),
    ]
    return _expand(templates, "Gastroenterology")


def rows_ent():
    templates = [
        ("high", "severe ear pain with bleeding {dur}",
         "hearing loss fever"),
        ("high", "sudden hearing loss in one ear {dur}",
         "ringing dizziness"),
        ("high", "severe throat pain cannot swallow {dur}",
         "fever swelling"),
        ("medium", "{mod} ear pain and fullness {dur}",
         "mild hearing loss"),
        ("medium", "ear infection and pus discharge {dur}",
         "fever pain"),
        ("medium", "ringing in ears tinnitus {dur}",
         "dizziness"),
        ("medium", "blocked ear sensation {dur}",
         "muffled hearing"),
        ("medium", "sinus infection blocked nose and headache {dur}",
         "facial pain fatigue"),
        ("medium", "sinus pressure behind eyes {dur}",
         "headache nasal congestion"),
        ("medium", "chronic sinusitis {dur}",
         "nasal discharge headache"),
        ("medium", "tonsillitis with white spots on throat {dur}",
         "fever swallowing pain"),
        ("medium", "sore throat and difficulty swallowing {dur}",
         "fever swollen glands"),
        ("medium", "strep throat with fever {dur}",
         "painful swallowing"),
        ("medium", "voice hoarseness {dur}",
         "sore throat"),
        ("medium", "laryngitis lost voice {dur}",
         "sore throat"),
        ("medium", "nasal congestion blocked nose {dur}",
         "runny nose sneezing"),
        ("medium", "nose bleed recurrent {dur}",
         "none"),
        ("medium", "post nasal drip and cough {dur}",
         "throat irritation"),
        ("medium", "vertigo with ear fullness {dur}",
         "nausea hearing loss"),
        ("medium", "snoring and sleep apnea {dur}",
         "daytime sleepiness"),
        ("medium", "swollen lymph nodes neck {dur}",
         "sore throat fever"),
        ("low", "{mod} sore throat {dur}",
         "none"),
        ("low", "{mod} ear itching {dur}",
         "none"),
        ("low", "{mod} blocked nose {dur}",
         "none"),
        ("low", "{mod} hoarse voice",
         "none"),
        ("low", "{mod} sneezing {dur}",
         "none"),
    ]
    return _expand(templates, "ENT")


def rows_ophthalmology():
    templates = [
        ("high", "sudden vision loss one eye",
         "eye pain headache"),
        ("high", "severe eye pain and blurred vision {dur}",
         "light sensitivity"),
        ("high", "flashes of light and floaters {dur}",
         "partial vision loss"),
        ("medium", "{mod} eye pain {dur}",
         "redness tearing"),
        ("medium", "red painful eye with discharge {dur}",
         "tearing light sensitivity"),
        ("medium", "conjunctivitis pink eye {dur}",
         "discharge itching"),
        ("medium", "blurry vision {dur}",
         "headache eye strain"),
        ("medium", "double vision {dur}",
         "dizziness"),
        ("medium", "eye redness and irritation {dur}",
         "watering"),
        ("medium", "stye red bump on eyelid {dur}",
         "pain tearing"),
        ("medium", "dry itchy eyes {dur}",
         "redness"),
        ("medium", "cataracts cloudy vision {dur}",
         "glare sensitivity"),
        ("medium", "glaucoma high eye pressure",
         "blurred vision"),
        ("medium", "floaters and black spots {dur}",
         "flashing lights"),
        ("medium", "eye strain from screens {dur}",
         "headache dryness"),
        ("medium", "difficulty reading close up {dur}",
         "eye fatigue"),
        ("medium", "sudden blurry vision {dur}",
         "headache"),
        ("medium", "light sensitivity and pain {dur}",
         "watering"),
        ("medium", "swollen eyelid with pain {dur}",
         "redness"),
        ("medium", "scratchy feeling in eye {dur}",
         "watering"),
        ("low", "{mod} eye strain {dur}",
         "none"),
        ("low", "{mod} itchy eyes {dur}",
         "none"),
        ("low", "{mod} dryness in eyes",
         "none"),
        ("low", "{mod} blurred vision when tired",
         "none"),
        ("low", "{mod} redness in eyes after screens",
         "none"),
    ]
    return _expand(templates, "Ophthalmology")


def rows_pediatrics():
    templates = [
        ("high", "baby high fever over 103 {dur}",
         "not drinking lethargic"),
        ("high", "infant not breathing well {dur}",
         "blue lips lethargy"),
        ("high", "child seizure and fever",
         "unresponsive"),
        ("high", "newborn refusing feeds and very sleepy",
         "yellow skin"),
        ("high", "child with severe dehydration {dur}",
         "no urine lethargy"),
        ("medium", "baby wont stop crying and has fever {dur}",
         "pulling ears"),
        ("medium", "child with fever and cough {dur}",
         "runny nose body ache"),
        ("medium", "toddler diarrhea and vomiting {dur}",
         "dehydration"),
        ("medium", "child ear infection and crying {dur}",
         "fever irritability"),
        ("medium", "child rash with fever {dur}",
         "itching"),
        ("medium", "chicken pox rash in child {dur}",
         "fever itching"),
        ("medium", "baby vaccination schedule review",
         "none"),
        ("medium", "child vomiting after eating {dur}",
         "stomach pain"),
        ("medium", "kid with sore throat and fever {dur}",
         "cough"),
        ("medium", "toddler fever and rash {dur}",
         "irritability"),
        ("medium", "infant constipation and crying {dur}",
         "gas"),
        ("medium", "child growth and developmental checkup",
         "none"),
        ("medium", "baby feeding problems {dur}",
         "fussy gassy"),
        ("medium", "child bedwetting {dur}",
         "none"),
        ("medium", "kid frequent colds and cough",
         "runny nose"),
        ("medium", "toddler not walking yet",
         "developmental concern"),
        ("medium", "child asthma wheezing {dur}",
         "cough breathing difficulty"),
        ("medium", "baby with diaper rash {dur}",
         "redness"),
        ("medium", "child behavioral problems at school",
         "anxiety"),
        ("low", "child mild cold {dur}",
         "none"),
        ("low", "baby teething and drooling",
         "mild fussiness"),
        ("low", "child routine checkup",
         "none"),
        ("low", "toddler mild cough {dur}",
         "none"),
        ("low", "kid mild fever {dur}",
         "none"),
    ]
    return _expand(templates, "Pediatrics")


def rows_psychiatry():
    templates = [
        ("high", "suicidal thoughts and hopelessness {dur}",
         "insomnia appetite loss"),
        ("high", "severe panic attack racing heart and fear of dying",
         "sweating shaking"),
        ("high", "hearing voices and hallucinations {dur}",
         "paranoia"),
        ("medium", "{mod} anxiety and worry {dur}",
         "restlessness insomnia"),
        ("medium", "panic attacks and racing heart {dur}",
         "sweating sense of doom"),
        ("medium", "generalized anxiety constant worry {dur}",
         "muscle tension"),
        ("medium", "social anxiety fear of people {dur}",
         "avoidance"),
        ("medium", "depression low mood and no energy {dur}",
         "insomnia poor appetite"),
        ("medium", "feeling hopeless and worthless {dur}",
         "loss of interest"),
        ("medium", "sad mood and crying spells {dur}",
         "fatigue"),
        ("medium", "cannot sleep insomnia {dur}",
         "anxiety fatigue"),
        ("medium", "trouble falling asleep and staying asleep {dur}",
         "daytime fatigue"),
        ("medium", "nightmares and disturbed sleep {dur}",
         "anxiety"),
        ("medium", "ptsd flashbacks and nightmares {dur}",
         "anxiety hypervigilance"),
        ("medium", "obsessive thoughts and compulsions {dur}",
         "anxiety"),
        ("medium", "mood swings high and low {dur}",
         "irritability"),
        ("medium", "bipolar manic episode {dur}",
         "racing thoughts"),
        ("medium", "loss of interest in hobbies {dur}",
         "low mood"),
        ("medium", "irritability and anger outbursts {dur}",
         "stress"),
        ("medium", "eating disorder binge eating {dur}",
         "guilt anxiety"),
        ("medium", "addiction craving alcohol {dur}",
         "withdrawal anxiety"),
        ("medium", "work stress and burnout {dur}",
         "fatigue insomnia"),
        ("medium", "grief after losing family member {dur}",
         "sadness insomnia"),
        ("medium", "difficulty concentrating at work {dur}",
         "low mood"),
        ("low", "{mod} stress from work {dur}",
         "none"),
        ("low", "{mod} nervous feeling before exams",
         "none"),
        ("low", "{mod} feeling down lately",
         "none"),
        ("low", "{mod} trouble relaxing",
         "none"),
    ]
    return _expand(templates, "Psychiatry")


# ─── Template expansion helpers ──────────────────────────────────────────────

def _fill(template: str, severity: str) -> list[str]:
    """
    Expand a template into several concrete rows by substituting {mod}/{dur}.
    Using a small fanout keeps the final CSV balanced without being repetitive.
    """
    mod_pool = {"low": MILD, "medium": MOD, "high": SEV}[severity]
    variants = []

    has_mod = "{mod}" in template
    has_dur = "{dur}" in template

    if has_mod and has_dur:
        for mod in random.sample(mod_pool, k=min(4, len(mod_pool))):
            dur = random.choice(DURATIONS)
            variants.append(template.format(mod=mod, dur=dur))
    elif has_mod:
        for mod in random.sample(mod_pool, k=min(4, len(mod_pool))):
            variants.append(template.format(mod=mod))
    elif has_dur:
        for dur in random.sample(DURATIONS, k=3):
            variants.append(template.format(dur=dur))
    else:
        variants.append(template)
        variants.append(template)  # duplicate rows stay in the corpus as repetition; harmless for TF-IDF

    return variants


def _expand(templates, specialization: str):
    rows = []
    for severity, template, co in templates:
        for text in _fill(template, severity):
            rows.append((text, severity, co, specialization))
    return rows


# ─── Driver ──────────────────────────────────────────────────────────────────

SPECIALTIES = [
    rows_cardiology,
    rows_neurology,
    rows_orthopedics,
    rows_dermatology,
    rows_general_physician,
    rows_gastroenterology,
    rows_ent,
    rows_ophthalmology,
    rows_pediatrics,
    rows_psychiatry,
]


def main():
    all_rows = []
    counts = {}
    for fn in SPECIALTIES:
        rows = fn()
        all_rows.extend(rows)
        counts[rows[0][3]] = len(rows)

    random.shuffle(all_rows)

    with open(OUT_PATH, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(["symptom_text", "severity", "additional_symptoms", "specialization"])
        for row in all_rows:
            w.writerow(row)

    print(f"Wrote {len(all_rows)} rows to {OUT_PATH}")
    for spec, n in sorted(counts.items()):
        print(f"  {spec:<22} {n}")


if __name__ == "__main__":
    main()
