// ═══════════════════════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════════════════════

const EVENTS = [
  { id: 1, name: "Anatomy & Physiology", type: "study", teamSize: 2, icon: "🫀", topics: ["Nervous System", "Endocrine System", "Sensory Organs", "Brain Anatomy", "Cranial Nerves", "Spinal Cord", "Hormones & Feedback", "Neurotransmitters"] },
  { id: 2, name: "Disease Detectives", type: "study", teamSize: 2, icon: "🔬", topics: ["Epidemiology Basics", "Outbreak Investigation", "Study Types", "Attack Rates", "Bradford Hill Criteria", "Surveillance", "Epi Curves", "Odds Ratio & Risk"] },
  { id: 3, name: "Circuit Lab", type: "lab", teamSize: 2, icon: "⚡", topics: ["Ohm's Law", "Series Circuits", "Parallel Circuits", "Kirchhoff's Laws", "AC vs DC", "Magnetism", "Electromagnets", "LED Characteristics"] },
  { id: 4, name: "Codebusters", type: "lab", teamSize: 3, icon: "🔐", topics: ["Aristocrat Cipher", "Patristocrat", "Baconian Cipher", "Morse Code", "Cryptarithms", "Porta Cipher", "Columnar Transposition", "Checkerboard Cipher"] },
  { id: 5, name: "Heredity", type: "study", teamSize: 2, icon: "🧬", topics: ["Mendelian Genetics", "Punnett Squares", "Non-Mendelian Patterns", "DNA Structure", "Gene Expression", "Mutations", "Pedigree Analysis", "Genetic Disorders"] },
  { id: 6, name: "Solar System", type: "study", teamSize: 2, icon: "🪐", topics: ["Inner Planets", "Outer Planets", "Dwarf Planets", "Moons", "Asteroids & Comets", "Solar Phenomena", "Space Missions", "Exoplanets"] },
  { id: 7, name: "Rocks & Minerals", type: "study", teamSize: 2, icon: "🪨", topics: ["Mineral ID", "Mohs Hardness", "Igneous Rocks", "Sedimentary Rocks", "Metamorphic Rocks", "Rock Cycle", "Crystal Systems", "Streak & Luster"] },
  { id: 8, name: "Crime Busters", type: "lab", teamSize: 2, icon: "🕵️", topics: ["Chromatography", "Fingerprints", "Unknown Solids", "Unknown Liquids", "Fiber Analysis", "Hair Analysis", "DNA Evidence", "Plastics ID"] },
  { id: 9, name: "Dynamic Planet", type: "study", teamSize: 2, icon: "🌍", topics: ["Plate Tectonics", "Earthquakes", "Volcanoes", "Glaciation", "Weathering", "Erosion", "Topographic Maps", "Landforms"] },
  { id: 10, name: "Entomology", type: "study", teamSize: 2, icon: "🦗", topics: ["Insect Orders", "Anatomy", "Life Cycles", "Taxonomy", "Ecological Roles", "Pest Management", "Specimen ID", "Adaptations"] },
  { id: 11, name: "Meteorology", type: "study", teamSize: 2, icon: "🌦️", topics: ["Atmosphere Layers", "Cloud Types", "Weather Maps", "Fronts & Systems", "Severe Weather", "Climate Zones", "Instruments", "Data Interpretation"] },
  { id: 12, name: "Boomilever", type: "build", teamSize: 2, icon: "🏗️", topics: ["Wood Selection", "Joint Design", "Load Distribution", "Testing Procedure", "Efficiency Calc", "Adhesive Types"] },
  { id: 13, name: "Helicopter", type: "build", teamSize: 2, icon: "🚁", topics: ["Blade Design", "Weight Balance", "Flight Duration", "Materials", "Construction", "Testing"] },
  { id: 14, name: "Hovercraft", type: "build", teamSize: 2, icon: "💨", topics: ["Thrust Design", "Skirt Design", "Motor Selection", "Weight Distribution", "Track Navigation", "Testing"] },
  { id: 15, name: "Mission Possible", type: "build", teamSize: 2, icon: "⚙️", topics: ["Action Sequence", "Energy Transfers", "Device Design", "Timing", "Reliability", "Documentation"] },
  { id: 16, name: "Scrambler", type: "build", teamSize: 2, icon: "🏎️", topics: ["Propulsion", "Braking System", "Accuracy", "Vehicle Design", "Egg Protection", "Testing"] },
  { id: 17, name: "Experimental Design", type: "lab", teamSize: 3, icon: "🧪", topics: ["Variables", "Hypothesis", "Data Collection", "Analysis", "Conclusions", "Presentation"] },
  { id: 18, name: "Machines", type: "lab", teamSize: 2, icon: "🔧", topics: ["Simple Machines", "Mechanical Advantage", "Efficiency", "Lever Types", "Pulleys", "Inclined Planes"] },
  { id: 19, name: "Metric Mastery", type: "lab", teamSize: 2, icon: "📏", topics: ["Length", "Mass", "Volume", "Temperature", "Conversions", "Measurement Technique"] },
  { id: 20, name: "Potions & Poisons", type: "lab", teamSize: 2, icon: "🧫", topics: ["Chemical Reactions", "Safety", "Indicators", "Concentrations", "Lab Techniques", "Toxicology Basics"] },
  { id: 21, name: "Water Quality", type: "lab", teamSize: 2, icon: "💧", topics: ["pH Testing", "Dissolved O2", "Turbidity", "Nitrates", "Macroinvertebrates", "Water Treatment"] },
  { id: 22, name: "Write It Do It", type: "lab", teamSize: 2, icon: "✍️", topics: ["Descriptive Writing", "Spatial Awareness", "Technical Vocab", "Assembly Skills"] },
  { id: 23, name: "Remote Sensing", type: "lab", teamSize: 2, icon: "🛰️", topics: ["Satellite Imagery", "EM Spectrum", "Image Interpretation", "GIS Basics", "Map Projections", "Data Analysis"] },
];

const STUDENTS = [
  { id: 1, name: "Alex Chen", initials: "AC", events: [1, 2, 5, 6, 12], color: "#2EC4B6" },
  { id: 2, name: "Jordan Smith", initials: "JS", events: [1, 3, 7, 11], color: "#F5A623" },
  { id: 3, name: "Maya Kumar", initials: "MK", events: [2, 5, 9, 10], color: "#E85D75" },
  { id: 4, name: "Ryan Liu", initials: "RL", events: [3, 4, 6, 18], color: "#7C3AED" },
  { id: 5, name: "Sophie Park", initials: "SP", events: [7, 8, 11, 20], color: "#059669" },
  { id: 6, name: "Ethan Wright", initials: "EW", events: [4, 12, 13, 17], color: "#DC2626" },
  { id: 7, name: "Lily Zhang", initials: "LZ", events: [9, 10, 14, 21], color: "#2563EB" },
  { id: 8, name: "Noah Johnson", initials: "NJ", events: [8, 15, 16, 19], color: "#D97706" },
  { id: 9, name: "Ava Patel", initials: "AP", events: [1, 11, 22, 23], color: "#7C3AED" },
  { id: 10, name: "Ben Garcia", initials: "BG", events: [2, 6, 12, 13], color: "#2EC4B6" },
  { id: 11, name: "Chloe Davis", initials: "CD", events: [3, 5, 14, 16], color: "#F5A623" },
  { id: 12, name: "Daniel Kim", initials: "DK", events: [4, 7, 15, 17], color: "#E85D75" },
  { id: 13, name: "Emma Torres", initials: "ET", events: [8, 9, 18, 19], color: "#059669" },
  { id: 14, name: "Felix Brown", initials: "FB", events: [10, 20, 21, 22], color: "#DC2626" },
  { id: 15, name: "Grace Lee", initials: "GL", events: [1, 6, 23, 9], color: "#2563EB" },
];

const PARTNERSHIPS = [
  { eventId: 1, partners: [1, 2] },
  { eventId: 2, partners: [1, 3] },
  { eventId: 5, partners: [3, 11] },
  { eventId: 6, partners: [4, 10] },
  { eventId: 7, partners: [2, 12] },
  { eventId: 3, partners: [4, 11] },
  { eventId: 9, partners: [7, 15] },
];

const generateMastery = (studentId, eventId) => {
  const seed = studentId * 100 + eventId;
  const topics = EVENTS.find(e => e.id === eventId)?.topics || [];
  return topics.map((t, i) => ({
    topic: t,
    score: Math.min(98, Math.max(25, ((seed * (i + 3) * 17) % 60) + 35 + (studentId % 3) * 8)),
    trend: ((seed * (i + 1)) % 3 === 0) ? "up" : ((seed * (i + 1)) % 3 === 1) ? "stable" : "down",
  }));
};

// ═══════════════════════════════════════════════════════════════
//  QUIZ QUESTION BANK — Real Science Olympiad Div B Content
// ═══════════════════════════════════════════════════════════════
const QUIZ_BANK = {
  1: [ // Anatomy & Physiology
    { q: "Which cranial nerve is responsible for the sense of smell?", options: ["Olfactory (I)", "Optic (II)", "Trigeminal (V)", "Vagus (X)"], correct: 0, topic: "Cranial Nerves", difficulty: 2, explanation: "Cranial nerve I (Olfactory) carries sensory information for smell from the nasal cavity to the brain." },
    { q: "The adrenal glands are located on top of which organs?", options: ["Lungs", "Kidneys", "Liver", "Pancreas"], correct: 1, topic: "Endocrine System", difficulty: 1, explanation: "The adrenal (suprarenal) glands sit atop the kidneys and produce hormones including cortisol and adrenaline." },
    { q: "What neurotransmitter is primarily associated with the 'fight or flight' response?", options: ["Serotonin", "Dopamine", "Norepinephrine", "GABA"], correct: 2, topic: "Neurotransmitters", difficulty: 2, explanation: "Norepinephrine (noradrenaline) is the primary neurotransmitter of the sympathetic nervous system, triggering the fight-or-flight response." },
    { q: "The hypothalamus connects the nervous system to the endocrine system via which gland?", options: ["Thyroid", "Pituitary", "Pineal", "Thymus"], correct: 1, topic: "Hormones & Feedback", difficulty: 2, explanation: "The hypothalamus communicates with the pituitary gland, which is often called the 'master gland' because it controls many other endocrine glands." },
    { q: "Which part of the brain is responsible for coordinating voluntary movement and balance?", options: ["Cerebrum", "Cerebellum", "Medulla oblongata", "Thalamus"], correct: 1, topic: "Brain Anatomy", difficulty: 1, explanation: "The cerebellum coordinates voluntary movements, balance, and motor learning. It's located at the back of the brain." },
    { q: "Rods and cones are photoreceptor cells found in which layer of the eye?", options: ["Cornea", "Iris", "Retina", "Lens"], correct: 2, topic: "Sensory Organs", difficulty: 1, explanation: "The retina contains rods (low-light vision) and cones (color vision) that convert light into neural signals." },
    { q: "A positive feedback loop in the body is best exemplified by:", options: ["Blood glucose regulation", "Body temperature regulation", "Blood clotting cascade", "Blood pressure regulation"], correct: 2, topic: "Hormones & Feedback", difficulty: 3, explanation: "Blood clotting is a positive feedback loop — once clotting begins, it signals for more clotting factors until the wound is sealed." },
    { q: "The spinal cord ends at approximately which vertebral level in adults?", options: ["T12", "L1-L2", "L5", "S1"], correct: 1, topic: "Spinal Cord", difficulty: 3, explanation: "The spinal cord typically ends at the L1-L2 vertebral level in adults, forming the conus medullaris. Below this is the cauda equina." },
  ],
  2: [ // Disease Detectives
    { q: "An attack rate is calculated by dividing the number of ill people by:", options: ["Total population", "Number exposed", "Number not ill", "Number of cases"], correct: 1, topic: "Attack Rates", difficulty: 1, explanation: "Attack rate = (Number of ill / Number exposed) × 100. It measures the proportion of exposed people who became ill." },
    { q: "Which type of study compares people with a disease to people without it, looking backward for exposures?", options: ["Cohort study", "Case-control study", "Cross-sectional study", "Randomized controlled trial"], correct: 1, topic: "Study Types", difficulty: 2, explanation: "Case-control studies start with cases (diseased) and controls (not diseased), then look backward to compare exposures." },
    { q: "An odds ratio greater than 1 indicates:", options: ["No association", "Protective factor", "Increased risk", "Decreased exposure"], correct: 2, topic: "Odds Ratio & Risk", difficulty: 2, explanation: "OR > 1 means the exposure is associated with higher odds of disease. OR = 1 means no association. OR < 1 suggests a protective effect." },
    { q: "What does an epidemic curve (epi curve) primarily show?", options: ["Geographic spread", "Case count over time", "Age distribution", "Mortality rate"], correct: 1, topic: "Epi Curves", difficulty: 1, explanation: "An epi curve is a histogram showing the number of new cases over time, helping epidemiologists understand the outbreak pattern." },
    { q: "Which Bradford Hill criterion refers to the larger the exposure, the greater the disease risk?", options: ["Consistency", "Biological gradient", "Temporality", "Plausibility"], correct: 1, topic: "Bradford Hill Criteria", difficulty: 3, explanation: "Biological gradient (dose-response) means greater exposure leads to greater incidence of disease, strengthening causal inference." },
    { q: "Active surveillance differs from passive surveillance in that active surveillance:", options: ["Relies on health providers to report", "Involves health departments seeking out cases", "Is less expensive", "Is less accurate"], correct: 1, topic: "Surveillance", difficulty: 2, explanation: "Active surveillance involves health departments proactively searching for cases, while passive surveillance relies on reporting by healthcare providers." },
  ],
  5: [ // Heredity
    { q: "In a cross between two heterozygous parents (Aa × Aa), what fraction of offspring are expected to be homozygous recessive?", options: ["1/4", "1/2", "3/4", "1/3"], correct: 0, topic: "Punnett Squares", difficulty: 1, explanation: "Aa × Aa produces AA (1/4), Aa (2/4), and aa (1/4). So 1/4 of offspring are homozygous recessive (aa)." },
    { q: "Codominance is best illustrated by:", options: ["Pink flowers from red × white cross", "AB blood type", "Carrier of sickle cell trait", "Incomplete dominance of height"], correct: 1, topic: "Non-Mendelian Patterns", difficulty: 2, explanation: "In codominance, both alleles are fully expressed. AB blood type shows both A and B antigens on red blood cells simultaneously." },
    { q: "Which nitrogen base is found in RNA but NOT in DNA?", options: ["Adenine", "Uracil", "Guanine", "Cytosine"], correct: 1, topic: "DNA Structure", difficulty: 1, explanation: "RNA uses Uracil instead of Thymine. DNA bases are A, T, G, C while RNA bases are A, U, G, C." },
    { q: "A pedigree shows a trait that appears in every generation and affects males and females equally. This pattern suggests:", options: ["Autosomal recessive", "Autosomal dominant", "X-linked recessive", "X-linked dominant"], correct: 1, topic: "Pedigree Analysis", difficulty: 2, explanation: "Autosomal dominant traits appear in every generation because only one copy of the allele is needed. They affect both sexes equally." },
    { q: "Sickle cell disease is caused by a mutation in the gene encoding:", options: ["Insulin", "Hemoglobin", "Collagen", "Myosin"], correct: 1, topic: "Genetic Disorders", difficulty: 1, explanation: "Sickle cell disease results from a point mutation in the hemoglobin gene, causing red blood cells to form a sickle shape." },
    { q: "Which process during meiosis increases genetic variation by exchanging segments between homologous chromosomes?", options: ["Mitosis", "Crossing over", "Cytokinesis", "DNA replication"], correct: 1, topic: "Gene Expression", difficulty: 2, explanation: "Crossing over occurs during prophase I of meiosis when homologous chromosomes exchange genetic material, creating new allele combinations." },
  ],
  6: [ // Solar System
    { q: "Which planet has the Great Red Spot, a storm larger than Earth?", options: ["Saturn", "Jupiter", "Neptune", "Mars"], correct: 1, topic: "Outer Planets", difficulty: 1, explanation: "Jupiter's Great Red Spot is a massive anticyclonic storm that has been raging for at least 350 years and is about 1.3× the size of Earth." },
    { q: "The asteroid belt is located between the orbits of:", options: ["Earth and Mars", "Mars and Jupiter", "Jupiter and Saturn", "Venus and Earth"], correct: 1, topic: "Asteroids & Comets", difficulty: 1, explanation: "The main asteroid belt lies between Mars and Jupiter, containing millions of rocky objects ranging from small boulders to the dwarf planet Ceres." },
    { q: "Which moon of Jupiter is thought to have a subsurface ocean and is a candidate for extraterrestrial life?", options: ["Io", "Ganymede", "Europa", "Callisto"], correct: 2, topic: "Moons", difficulty: 2, explanation: "Europa has a thick ice shell covering a liquid water ocean. Its ocean, kept warm by tidal heating from Jupiter, makes it a prime candidate for life." },
    { q: "A comet's tail always points:", options: ["Toward the Sun", "Away from the Sun", "In the direction of travel", "Toward Earth"], correct: 1, topic: "Asteroids & Comets", difficulty: 2, explanation: "The solar wind and radiation pressure push cometary material away from the Sun, so the tail always points away from the Sun regardless of travel direction." },
    { q: "Which planet rotates on its side with an axial tilt of about 98 degrees?", options: ["Neptune", "Saturn", "Uranus", "Pluto"], correct: 2, topic: "Outer Planets", difficulty: 2, explanation: "Uranus has an extreme axial tilt of ~98°, likely caused by a massive collision early in its history. This means it essentially rolls on its side as it orbits." },
    { q: "The Kuiper Belt extends from approximately the orbit of Neptune to:", options: ["50 AU", "100 AU", "500 AU", "1000 AU"], correct: 0, topic: "Dwarf Planets", difficulty: 3, explanation: "The Kuiper Belt extends from ~30 AU (Neptune's orbit) to approximately 50 AU. Beyond that is the scattered disk and eventually the Oort Cloud." },
  ],
  3: [ // Circuit Lab
    { q: "According to Ohm's Law, if voltage is doubled and resistance stays the same, current will:", options: ["Halve", "Double", "Stay the same", "Quadruple"], correct: 1, topic: "Ohm's Law", difficulty: 1, explanation: "V = IR, so I = V/R. If V doubles and R is constant, I also doubles." },
    { q: "In a series circuit with three identical resistors of 10Ω each, the total resistance is:", options: ["3.33 Ω", "10 Ω", "30 Ω", "100 Ω"], correct: 2, topic: "Series Circuits", difficulty: 1, explanation: "In series, resistances add directly: R_total = R1 + R2 + R3 = 10 + 10 + 10 = 30 Ω." },
    { q: "In a parallel circuit with two identical 20Ω resistors, the total resistance is:", options: ["40 Ω", "20 Ω", "10 Ω", "5 Ω"], correct: 2, topic: "Parallel Circuits", difficulty: 1, explanation: "For identical parallel resistors: R_total = R/n = 20/2 = 10 Ω. Or: 1/R = 1/20 + 1/20 = 2/20 → R = 10 Ω." },
    { q: "Kirchhoff's Current Law states that at any junction:", options: ["Voltage in = Voltage out", "Current in = Current out", "Power is conserved", "Resistance is minimized"], correct: 1, topic: "Kirchhoff's Laws", difficulty: 2, explanation: "KCL: The sum of currents entering a junction equals the sum leaving. This is based on conservation of charge." },
    { q: "An LED (Light Emitting Diode) will only work when connected with:", options: ["Any polarity", "Correct polarity (forward bias)", "Reverse polarity", "AC current only"], correct: 1, topic: "LED Characteristics", difficulty: 2, explanation: "LEDs are diodes — they only conduct in one direction. The longer lead (anode) connects to positive, shorter lead (cathode) to negative." },
  ],
  7: [ // Rocks & Minerals
    { q: "On the Mohs Hardness Scale, which mineral has a hardness of 7?", options: ["Feldspar", "Quartz", "Topaz", "Calcite"], correct: 1, topic: "Mohs Hardness", difficulty: 1, explanation: "Mohs scale: 1-Talc, 2-Gypsum, 3-Calcite, 4-Fluorite, 5-Apatite, 6-Feldspar, 7-Quartz, 8-Topaz, 9-Corundum, 10-Diamond." },
    { q: "Granite is classified as which type of rock?", options: ["Sedimentary", "Metamorphic", "Intrusive igneous", "Extrusive igneous"], correct: 2, topic: "Igneous Rocks", difficulty: 1, explanation: "Granite forms from slowly cooling magma deep underground (intrusive/plutonic), giving it large visible crystals." },
    { q: "The streak of hematite is characteristically:", options: ["White", "Black", "Red-brown", "Yellow"], correct: 2, topic: "Streak & Luster", difficulty: 2, explanation: "Hematite always produces a red-brown streak regardless of its external color, which can range from silver to black." },
    { q: "Which sedimentary rock is formed primarily from the cementation of sand-sized grains?", options: ["Shale", "Limestone", "Sandstone", "Conglomerate"], correct: 2, topic: "Sedimentary Rocks", difficulty: 1, explanation: "Sandstone forms when sand grains (0.0625–2mm) are compacted and cemented together, typically by silica, calcite, or iron oxides." },
    { q: "Marble is a metamorphic rock formed from the metamorphism of:", options: ["Sandstone", "Shale", "Limestone", "Granite"], correct: 2, topic: "Metamorphic Rocks", difficulty: 2, explanation: "Marble forms when limestone (or dolostone) undergoes heat and pressure, recrystallizing the calcite into interlocking crystals." },
  ],
};


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════
export { EVENTS, STUDENTS, PARTNERSHIPS, QUIZ_BANK, generateMastery };
