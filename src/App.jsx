import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid, Legend, Cell } from "recharts";
import { BookOpen, Upload, Brain, Users, BarChart3, Calendar, ChevronRight, CheckCircle, XCircle, Clock, Award, Zap, Target, TrendingUp, ArrowLeft, Play, Star, AlertTriangle, Eye, LogOut, Shield, FlaskConical, Hammer, GraduationCap, Microscope, Wrench, Camera, Plus, Trash2, Image, Timer, Weight, Ruler, MessageSquare, ChevronDown, ChevronUp, PenTool } from "lucide-react";

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
//  STYLE CONSTANTS
// ═══════════════════════════════════════════════════════════════
const C = {
  // DW Trojan Branding
  navy: "#1B3A2D", navyMid: "#234A38", navyLight: "#2D5A45",   // DW Forest Green (from Trojan mascot)
  gold: "#C0652A", goldLight: "#FCEEE4",                        // DW Terracotta/Rust (from school heading)
  teal: "#2E8B57", tealDark: "#1E6B42",                         // DW Medium Green (mascot accent)
  coral: "#B84233",                                              // DW Deep Rust (action/alert)
  white: "#FFFFFF", offWhite: "#F7F8F6",
  gray100: "#F0F2EE", gray200: "#DDE1D9", gray400: "#8E9688", gray600: "#5E6658",
  // Accent: Slate blue-gray from preso lower panel
  slate: "#6B7D94", slateBg: "#E8ECF1",
};

// DW Trojan SVG — simplified Spartan helmet icon
const TROJAN_SVG = (size = 28) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C35 8 22 18 18 32L15 45C14 50 16 55 20 58L25 62V78C25 85 30 92 40 95L50 98L60 95C70 92 75 85 75 78V62L80 58C84 55 86 50 85 45L82 32C78 18 65 8 50 8Z" fill={C.navy} />
    <path d="M35 35L30 55L40 50L50 65L60 50L70 55L65 35L55 42L50 30L45 42L35 35Z" fill={C.gold} />
    <path d="M38 70V82C38 86 42 90 50 92C58 90 62 86 62 82V70L50 78L38 70Z" fill={C.tealDark} />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("student"); // student | coach | admin
  const [currentUser, setCurrentUser] = useState(STUDENTS[0]);
  const [page, setPage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const [uploadState, setUploadState] = useState(null);

  if (!loggedIn) {
    return <LoginScreen onLogin={(role) => { setLoggedIn(true); setUserRole(role); if (role === "guest") setPage("guest"); }} />;
  }

  const navigate = (p, ev) => {
    setPage(p);
    if (ev) setSelectedEvent(ev);
    setQuizState(null);
    setUploadState(null);
  };

  // Guest mode — standalone browse-only experience
  if (userRole === "guest") {
    return <GuestBrowsePage onSignIn={() => { setLoggedIn(false); setUserRole("student"); setPage("dashboard"); }} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar page={page} navigate={navigate} userRole={userRole} currentUser={currentUser}
        onLogout={() => { setLoggedIn(false); setPage("dashboard"); }} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {page === "dashboard" && userRole === "student" && (
          <StudentDashboard user={currentUser} navigate={navigate} />
        )}
        {page === "dashboard" && (userRole === "coach" || userRole === "admin") && (
          <CoachDashboard navigate={navigate} isAdmin={userRole === "admin"} />
        )}
        {page === "events" && !selectedEvent && (
          <EventsListPage user={currentUser} navigate={navigate} userRole={userRole} />
        )}
        {page === "events" && selectedEvent && (
          <EventDetailPage event={selectedEvent} user={currentUser} navigate={navigate}
            onStartQuiz={() => setPage("quiz")} onUploadTest={() => setPage("upload")} />
        )}
        {page === "quiz" && (
          <QuizPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "upload" && (
          <TestUploadPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "studypath" && (
          <StudyPathPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "partners" && (
          <PartnerSynergyPage user={currentUser} navigate={navigate} />
        )}
        {page === "buildlog" && (
          <BuildLogPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "schedule" && (
          <SchedulePage navigate={navigate} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [hoveredRole, setHoveredRole] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 60%, #1A3328 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {TROJAN_SVG(56)}
        <h1 style={{ color: C.white, fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 4, marginTop: 10 }}>
          DW Sci<span style={{ color: C.gold }}>Oly</span> Hub
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 6 }}>
          Daniel Wright Junior High School
        </p>
        <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Science Olympiad Division B · 2025–26
        </p>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 32 }}>
          🏆 14× Consecutive Illinois State Champions
        </p>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "32px 28px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>
            Choose your role to explore
          </p>
          {[
            { role: "student", label: "Student", desc: "Alex Chen — 5 events", icon: <GraduationCap size={20} />, color: C.teal },
            { role: "coach", label: "Event Coach", desc: "Anatomy & Physiology coach", icon: <Microscope size={20} />, color: C.gold },
            { role: "admin", label: "Head Coach / Admin", desc: "Full team oversight", icon: <Shield size={20} />, color: C.coral },
          ].map(r => (
            <button key={r.role} onClick={() => onLogin(r.role)}
              onMouseEnter={() => setHoveredRole(r.role)} onMouseLeave={() => setHoveredRole(null)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                background: hoveredRole === r.role ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${hoveredRole === r.role ? r.color : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, marginBottom: 10, cursor: "pointer", transition: "all 0.2s",
                color: C.white, fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center", color: r.color }}>
                {r.icon}
              </div>
              <div style={{ textAlign: "left" }}>
                <div>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>{r.desc}</div>
              </div>
              <ChevronRight size={16} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </button>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

          <button onClick={() => onLogin("guest")}
            onMouseEnter={() => setHoveredRole("guest")} onMouseLeave={() => setHoveredRole(null)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              background: hoveredRole === "guest" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${hoveredRole === "guest" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
              color: C.white, fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}>
              <Eye size={20} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div>Browse Events</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>View all 23 events — no sign-in required</div>
            </div>
            <ChevronRight size={16} style={{ marginLeft: "auto", opacity: 0.3 }} />
          </button>

          <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(192,101,42,0.1)",
            borderRadius: 10, border: "1px solid rgba(192,101,42,0.2)" }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 500 }}>
              🔐 In production: Sign in with Google (Gmail) — roles auto-detected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  GUEST BROWSE PAGE
// ═══════════════════════════════════════════════════════════════
function GuestBrowsePage({ onSignIn }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const typeColors = { study: { bg: C.goldLight, text: "#A0522D", label: "Study" }, lab: { bg: "#E2F0E6", text: C.tealDark, label: "Lab / Process" }, build: { bg: "#F5E2DC", text: C.coral, label: "Build" } };
  const filtered = filterType === "all" ? EVENTS : EVENTS.filter(e => e.type === filterType);

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: C.navy, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {TROJAN_SVG(22)}
          <span style={{ color: C.gold, fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>DW SciOly Hub</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Browsing as Guest</span>
        </div>
        <button onClick={onSignIn}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8,
            border: `1px solid ${C.gold}`, background: "transparent", color: C.gold,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign In
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px" }}>
        {/* Header */}
        {!selectedEvent && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.tealDark, textTransform: "uppercase", letterSpacing: 1.5 }}>Daniel Wright Junior High School</span>
              <span style={{ fontSize: 12, color: C.gray400 }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>🏆 14× State Champions</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, color: C.navy }}>
              Science Olympiad Division B — All Events
            </h1>
            <p style={{ color: C.gray600, fontSize: 15, marginBottom: 28, maxWidth: 700 }}>
              Browse all 23 competitive events and 3 trial events for the 2025–2026 season. Sign in to access personalized study plans, quizzes, and team features.
            </p>

            {/* Stats Bar */}
            <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Total Events", value: "23 + 3 Trial", color: C.navy },
                { label: "Study Events", value: EVENTS.filter(e => e.type === "study").length, color: "#A0522D" },
                { label: "Lab / Process", value: EVENTS.filter(e => e.type === "lab").length, color: C.tealDark },
                { label: "Build Events", value: EVENTS.filter(e => e.type === "build").length, color: C.coral },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 12, padding: "14px 20px", border: `1px solid ${C.gray200}`, flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { id: "all", label: "All Events", count: EVENTS.length },
                { id: "study", label: "Study", count: EVENTS.filter(e => e.type === "study").length },
                { id: "lab", label: "Lab / Process", count: EVENTS.filter(e => e.type === "lab").length },
                { id: "build", label: "Build", count: EVENTS.filter(e => e.type === "build").length },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100,
                    border: filterType === f.id ? "none" : `1px solid ${C.gray200}`,
                    background: filterType === f.id ? C.navy : C.white,
                    color: filterType === f.id ? C.white : C.gray600,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {f.label}
                  <span style={{ background: filterType === f.id ? "rgba(255,255,255,0.2)" : C.gray100,
                    color: filterType === f.id ? C.white : C.gray400,
                    padding: "1px 7px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Event Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filtered.map(ev => {
                const tc = typeColors[ev.type];
                return (
                  <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                    style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`,
                      cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <span style={{ fontSize: 32 }}>{ev.icon}</span>
                      <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", background: tc.bg, color: tc.text }}>{tc.label}</span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: C.navy }}>{ev.name}</h3>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.gray400, marginBottom: 14 }}>
                      <span>Team of {ev.teamSize}</span>
                      <span>·</span>
                      <span>{ev.topics.length} topics</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ev.topics.slice(0, 4).map(t => (
                        <span key={t} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: C.gray100, color: C.gray600 }}>{t}</span>
                      ))}
                      {ev.topics.length > 4 && (
                        <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: C.gray100, color: C.gray400 }}>+{ev.topics.length - 4} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Event Detail View (Guest) */}
        {selectedEvent && (
          <div>
            <button onClick={() => setSelectedEvent(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "inherit" }}>
              <ArrowLeft size={14} /> Back to All Events
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
              <span style={{ fontSize: 52 }}>{selectedEvent.icon}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{selectedEvent.name}</h2>
                  <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                    textTransform: "uppercase", background: typeColors[selectedEvent.type].bg, color: typeColors[selectedEvent.type].text }}>
                    {typeColors[selectedEvent.type].label}
                  </span>
                </div>
                <p style={{ color: C.gray600, fontSize: 14 }}>
                  Team of {selectedEvent.teamSize} · {selectedEvent.topics.length} topics · Division B 2025–2026
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
              {/* Topics List */}
              <div style={{ background: C.white, borderRadius: 16, padding: 28, border: `1px solid ${C.gray200}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={16} color={C.teal} /> Topics Covered
                </h3>
                {selectedEvent.topics.map((topic, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: i % 2 === 0 ? C.offWhite : "transparent", borderRadius: 8, marginBottom: 2 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                      background: C.gray100, color: C.gray600 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.navy }}>{topic}</span>
                  </div>
                ))}
              </div>

              {/* Event Info Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    📋 Event Details
                  </h3>
                  {[
                    { label: "Event Type", value: typeColors[selectedEvent.type].label },
                    { label: "Team Size", value: `Up to ${selectedEvent.teamSize} members` },
                    { label: "Number of Topics", value: selectedEvent.topics.length },
                    { label: "Season", value: "2025–2026" },
                    { label: "Division", value: "B (Middle School)" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
                      borderBottom: i < 4 ? `1px solid ${C.gray100}` : "none", fontSize: 13 }}>
                      <span style={{ color: C.gray400 }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: C.navy }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {selectedEvent.type === "study" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      📝 What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>study/test event</strong>. Teams will answer questions on the topics listed. Expect a written exam covering factual recall, application, and analysis.
                      Each team may bring a collection of notes and resources. High score wins.
                    </p>
                  </div>
                )}
                {selectedEvent.type === "lab" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      🧪 What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>lab/process event</strong> combining written knowledge with hands-on tasks.
                      Teams may need to perform measurements, run experiments, analyze evidence, or demonstrate practical skills.
                      {selectedEvent.id === 4 && " Codebusters includes timed cryptanalysis — speed and accuracy both count."}
                      {selectedEvent.id === 8 && " Crime Busters involves identifying unknown substances, analyzing physical evidence, and writing crime scene analysis."}
                      {selectedEvent.id === 17 && " Experimental Design requires teams to design and conduct an experiment from scratch during the event."}
                    </p>
                  </div>
                )}
                {selectedEvent.type === "build" && (
                  <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      🏗️ What to Expect
                    </h3>
                    <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.7 }}>
                      This is a <strong>build event</strong>. Teams construct a device before the competition and test it at the tournament.
                      Scoring typically involves performance metrics (load, time, accuracy) and may include a design knowledge test.
                      {selectedEvent.id === 12 && " Boomilever is scored on efficiency — load held divided by structure mass. Lighter structures that hold more weight win."}
                      {selectedEvent.id === 13 && " Helicopter scoring is based on total flight time. Longer sustained flight wins."}
                      {selectedEvent.id === 16 && " Scrambler must travel a set distance and stop accurately, with the egg intact. Distance accuracy and egg safety are critical."}
                      {selectedEvent.id === 15 && " Mission Possible involves a Rube Goldberg-style device with a required sequence of energy transfers."}
                      {selectedEvent.id === 14 && " Hovercraft must navigate a track as quickly and accurately as possible."}
                    </p>
                  </div>
                )}

                {/* Sign-in CTA */}
                <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, borderRadius: 16, padding: 24, color: C.white }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: C.gold }}>🔓 Want more?</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
                    Sign in to access adaptive quizzes, AI-powered study paths, test upload analysis, partner synergy tracking, and coach dashboards.
                  </p>
                  <button onClick={onSignIn}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8,
                      border: "none", background: C.gold, color: C.navy,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <GraduationCap size={15} /> Sign In to Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════════
function Sidebar({ page, navigate, userRole, currentUser, onLogout }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
    { id: "events", label: "My Events", icon: <BookOpen size={18} /> },
    ...(userRole === "student" ? [
      { id: "upload", label: "Upload Test", icon: <Upload size={18} /> },
      { id: "studypath", label: "Study Path", icon: <Brain size={18} /> },
      { id: "buildlog", label: "Build Log", icon: <Wrench size={18} /> },
      { id: "partners", label: "Partners", icon: <Users size={18} /> },
    ] : []),
    { id: "schedule", label: "Schedule", icon: <Calendar size={18} /> },
  ];

  return (
    <div style={{ width: 230, background: C.navy, color: C.white, padding: "24px 14px",
      display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "0 10px", marginBottom: 24, cursor: "pointer" }} onClick={() => navigate("dashboard")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {TROJAN_SVG(22)}
          <span style={{ fontSize: 17, fontWeight: 800, color: C.gold, letterSpacing: -0.5 }}>DW SciOly Hub</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, paddingLeft: 30 }}>Daniel Wright · Div B · 2025–26</div>
      </div>

      <nav style={{ flex: 1 }}>
        {items.map(item => {
          const active = page === item.id || (item.id === "events" && page === "events");
          return (
            <button key={item.id} onClick={() => navigate(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "rgba(192,101,42,0.15)" : "transparent",
                color: active ? C.gold : "rgba(255,255,255,0.55)",
                fontSize: 13, fontWeight: 500, marginBottom: 3, fontFamily: "inherit",
                transition: "all 0.15s" }}>
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUser.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: C.white }}>
            {currentUser.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{userRole}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
          fontSize: 12, fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function StudentDashboard({ user, navigate }) {
  const userEvents = EVENTS.filter(e => user.events.includes(e.id));
  const masteryData = userEvents.map(ev => {
    const m = generateMastery(user.id, ev.id);
    const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
    return { ...ev, mastery: avg };
  });
  const overall = Math.round(masteryData.reduce((s, e) => s + e.mastery, 0) / masteryData.length);
  const daysToState = 33;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Welcome back, {user.name.split(" ")[0]}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.tealDark, background: "#E6F4EA", padding: "2px 10px", borderRadius: 100 }}>DW Trojan</span>
      </div>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        State is in <strong style={{ color: C.coral }}>{daysToState} days</strong>. Members of a TEAM before an achiever of one. 💚
      </p>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Overall Mastery", value: `${overall}%`, change: "↑ 6% this week", color: C.teal, up: true },
          { label: "Events Assigned", value: user.events.length, change: "of 23 total", color: C.navy, up: null },
          { label: "Quizzes Done", value: 37, change: "↑ 5 this week", color: C.gold, up: true },
          { label: "Study Streak", value: "12d", change: "Personal best!", color: C.gold, up: true },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 20,
            border: `1px solid ${C.gray200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.up ? C.tealDark : C.gray400 }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Main Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Event Mastery */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={C.teal} /> Event Mastery Breakdown
          </h3>
          {masteryData.map(ev => (
            <div key={ev.id} style={{ marginBottom: 14, cursor: "pointer" }}
              onClick={() => navigate("events", ev)}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{ev.icon} {ev.name}</span>
                <span style={{ fontWeight: 700, color: ev.mastery >= 80 ? C.tealDark : ev.mastery >= 60 ? C.gold : C.coral }}>
                  {ev.mastery}%
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${ev.mastery}%`,
                  background: ev.mastery >= 80 ? C.teal : ev.mastery >= 60 ? C.gold : C.coral,
                  transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
            <strong style={{ color: C.gold }}>🤖 AI Suggestion:</strong>{" "}
            <span style={{ color: C.gray600 }}>
              Focus on {masteryData.sort((a, b) => a.mastery - b.mastery)[0]?.name} — your lowest event. Start with the adaptive quiz to identify specific sub-topic gaps.
            </span>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Partners */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color={C.gold} /> My Partners
            </h3>
            {PARTNERSHIPS.filter(p => p.partners.includes(user.id)).slice(0, 3).map(p => {
              const partnerId = p.partners.find(id => id !== user.id);
              const partner = STUDENTS.find(s => s.id === partnerId);
              const ev = EVENTS.find(e => e.id === p.eventId);
              if (!partner || !ev) return null;
              const m = generateMastery(partnerId, p.eventId);
              const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
              return (
                <div key={p.eventId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  background: C.offWhite, borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: partner.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: C.white }}>
                    {partner.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{partner.name}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{ev.name} — {avg}% mastery</div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => navigate("partners")}
              style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 8,
                border: `1px solid ${C.gray200}`, background: "transparent", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: C.teal, fontFamily: "inherit" }}>
              View Partner Synergy →
            </button>
          </div>

          {/* Up Next */}
          <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} color={C.coral} /> Up Next
            </h3>
            {[
              { text: "Quiz: Endocrine System Disorders", type: "quiz" },
              { text: "Read: Cranial Nerve Pathways (State-level)", type: "study" },
              { text: "Upload: Jan Invitational Anatomy Test", type: "upload" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.gray100}` : "none",
                fontSize: 13, color: C.gray600, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                {item.type === "quiz" ? <Play size={14} color={C.teal} /> :
                 item.type === "upload" ? <Upload size={14} color={C.gold} /> :
                 <BookOpen size={14} color={C.coral} />}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EVENTS LIST PAGE
// ═══════════════════════════════════════════════════════════════
function EventsListPage({ user, navigate, userRole }) {
  const typeColors = { study: { bg: C.goldLight, text: "#A0522D" }, lab: { bg: "#E2F0E6", text: C.tealDark }, build: { bg: "#F5E2DC", text: C.coral } };
  const eventsToShow = userRole === "student" ? EVENTS.filter(e => user.events.includes(e.id)) : EVENTS;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        {userRole === "student" ? "My Events" : "All Events"}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        {userRole === "student" ? `${eventsToShow.length} events assigned` : "23 events + 3 trial events"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {eventsToShow.map(ev => {
          const m = generateMastery(user.id, ev.id);
          const avg = Math.round(m.reduce((s, t) => s + t.score, 0) / m.length);
          const tc = typeColors[ev.type];
          return (
            <div key={ev.id} onClick={() => navigate("events", ev)}
              style={{ background: C.white, borderRadius: 16, padding: 22, border: `1px solid ${C.gray200}`,
                cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{ev.icon}</span>
                <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{ev.name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 100 }}>
                  <div style={{ height: "100%", borderRadius: 100, width: `${avg}%`,
                    background: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: avg >= 80 ? C.tealDark : avg >= 60 ? C.gold : C.coral }}>
                  {avg}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.gray400 }}>
                Team of {ev.teamSize} · {ev.topics.length} topics
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EVENT DETAIL PAGE
// ═══════════════════════════════════════════════════════════════
function EventDetailPage({ event, user, navigate, onStartQuiz, onUploadTest }) {
  const mastery = generateMastery(user.id, event.id);
  const avg = Math.round(mastery.reduce((s, t) => s + t.score, 0) / mastery.length);
  const radarData = mastery.map(m => ({ topic: m.topic.length > 14 ? m.topic.slice(0, 12) + "…" : m.topic, score: m.score, fullMark: 100 }));

  return (
    <div>
      <button onClick={() => navigate("events")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
        <ArrowLeft size={14} /> Back to Events
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>{event.icon}</span>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>{event.name}</h2>
          <p style={{ color: C.gray600, fontSize: 14 }}>Team of {event.teamSize} · {event.topics.length} topics · {event.type} event</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }}>{avg}%</div>
          <div style={{ fontSize: 12, color: C.gray400 }}>Overall Mastery</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Start Quiz", icon: <Play size={16} />, color: C.teal, action: onStartQuiz },
          { label: "Upload Test", icon: <Upload size={16} />, color: C.gold, action: onUploadTest },
          { label: "Study Path", icon: <Brain size={16} />, color: C.coral, action: () => navigate("studypath", event) },
          ...(event.type === "build" ? [{ label: "Build Log", icon: <Wrench size={16} />, color: C.navy, action: () => navigate("buildlog", event) }] : []),
        ].map((btn, i) => (
          <button key={i} onClick={btn.action}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
              borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: btn.color, color: C.white, fontSize: 14, fontWeight: 600, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}>
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Topic Breakdown */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>📊 Topic Mastery</h3>
          {mastery.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{m.topic}</span>
                <span style={{ fontWeight: 700, color: m.score >= 80 ? C.tealDark : m.score >= 60 ? C.gold : C.coral }}>
                  {m.score}%
                  {m.trend === "up" && <span style={{ color: C.tealDark, marginLeft: 4 }}>↑</span>}
                  {m.trend === "down" && <span style={{ color: C.coral, marginLeft: 4 }}>↓</span>}
                </span>
              </div>
              <div style={{ height: 8, background: C.gray100, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, width: `${m.score}%`,
                  background: m.score >= 80 ? C.teal : m.score >= 60 ? C.gold : C.coral }} />
              </div>
            </div>
          ))}
        </div>

        {/* Radar Chart */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🎯 Skill Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.gray200} />
              <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: C.gray600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Mastery" dataKey="score" stroke={C.teal} fill={C.teal} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, padding: "12px 14px", background: C.goldLight, borderRadius: 8, fontSize: 12 }}>
            <strong style={{ color: C.gold }}>Focus area:</strong>{" "}
            <span style={{ color: C.gray600 }}>
              {mastery.sort((a, b) => a.score - b.score)[0]?.topic} ({mastery.sort((a, b) => a.score - b.score)[0]?.score}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  QUIZ ENGINE
// ═══════════════════════════════════════════════════════════════
function QuizPage({ event, user, navigate }) {
  const questions = useMemo(() => {
    const bank = QUIZ_BANK[event?.id] || QUIZ_BANK[1];
    return [...bank].sort(() => Math.random() - 0.5).slice(0, Math.min(6, bank.length));
  }, [event?.id]);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);

  const handleAnswer = useCallback((idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setResults(prev => [...prev, { question: currentQ, selected: idx, correct: questions[currentQ].correct, isCorrect: idx === questions[currentQ].correct }]);
  }, [answered, currentQ, questions]);

  useEffect(() => {
    if (answered || finished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleAnswer(-1); return 45; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQ, answered, finished, handleAnswer]);

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentQ(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(45);
    }
  };

  if (!event) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: C.gray400, marginBottom: 16 }}>Please select an event first to start a quiz.</p>
        <button onClick={() => navigate("events")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
      </div>
    );
  }

  if (finished) {
    const correct = results.filter(r => r.isCorrect).length;
    const pct = Math.round((correct / questions.length) * 100);
    const topicResults = {};
    results.forEach((r, i) => {
      const topic = questions[i].topic;
      if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
      topicResults[topic].total++;
      if (r.isCorrect) topicResults[topic].correct++;
    });

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 36, border: `1px solid ${C.gray200}`, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Quiz Complete!</h2>
          <p style={{ fontSize: 16, color: C.gray600, marginBottom: 24 }}>{event.icon} {event.name}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: pct >= 80 ? C.teal : pct >= 60 ? C.gold : C.coral }}>{pct}%</div>
              <div style={{ fontSize: 13, color: C.gray400 }}>Score</div>
            </div>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: C.navy }}>{correct}/{questions.length}</div>
              <div style={{ fontSize: 13, color: C.gray400 }}>Correct</div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, textAlign: "left" }}>Topic Breakdown</h3>
          {Object.entries(topicResults).map(([topic, data]) => (
            <div key={topic} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px",
              background: data.correct === data.total ? "#E2F0E6" : "#F5E2DC",
              borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{topic}</span>
              <span style={{ fontWeight: 700, color: data.correct === data.total ? C.tealDark : C.coral }}>
                {data.correct}/{data.total} {data.correct === data.total ? "✓" : "✗"}
              </span>
            </div>
          ))}

          <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 14, textAlign: "left" }}>Review Answers</h3>
          {results.map((r, i) => (
            <div key={i} style={{ textAlign: "left", padding: "14px 16px", background: r.isCorrect ? "#F0FDF9" : "#FEF2F2",
              borderRadius: 10, marginBottom: 8, border: `1px solid ${r.isCorrect ? "#BBF7D0" : "#FECACA"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {r.isCorrect ? <CheckCircle size={16} color={C.tealDark} /> : <XCircle size={16} color={C.coral} />}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{questions[i].q}</span>
              </div>
              {!r.isCorrect && (
                <div style={{ fontSize: 12, color: C.gray600, paddingLeft: 24 }}>
                  <span style={{ color: C.coral }}>Your answer: {r.selected >= 0 ? questions[i].options[r.selected] : "Time expired"}</span>
                  <br />
                  <span style={{ color: C.tealDark }}>Correct: {questions[i].options[questions[i].correct]}</span>
                  <br />
                  <span style={{ fontStyle: "italic", color: C.gray400 }}>{questions[i].explanation}</span>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
            <button onClick={() => { setCurrentQ(0); setSelected(null); setAnswered(false); setResults([]); setFinished(false); setTimeLeft(45); }}
              style={{ padding: "12px 24px", borderRadius: 10, border: `2px solid ${C.teal}`, background: "transparent",
                color: C.teal, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Retake Quiz
            </button>
            <button onClick={() => navigate("events", event)}
              style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.navy,
                color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Back to Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={() => navigate("events", event)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
        <ArrowLeft size={14} /> Exit Quiz
      </button>

      <div style={{ background: C.white, borderRadius: 20, padding: 32, border: `1px solid ${C.gray200}` }}>
        {/* Progress & Timer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {questions.map((_, i) => (
              <div key={i} style={{ width: i === currentQ ? 28 : 10, height: 10, borderRadius: 100,
                background: i < currentQ ? (results[i]?.isCorrect ? C.teal : C.coral) : i === currentQ ? C.gold : C.gray200,
                transition: "all 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700,
            color: timeLeft <= 10 ? C.coral : C.gray600 }}>
            <Clock size={16} /> {timeLeft}s
          </div>
        </div>

        {/* Question Info */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.goldLight, color: "#A0522D" }}>{q.topic}</span>
          <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: C.gray100, color: C.gray600 }}>
            {"★".repeat(q.difficulty)}{"☆".repeat(3 - q.difficulty)}
          </span>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, marginBottom: 24, color: C.navy }}>
          {q.q}
        </h2>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, i) => {
            const isCorrectOption = i === q.correct;
            const isSelected = selected === i;
            let bg = C.white;
            let border = C.gray200;
            let textColor = C.navy;
            if (answered) {
              if (isCorrectOption) { bg = "#E2F0E6"; border = C.teal; textColor = C.tealDark; }
              else if (isSelected && !isCorrectOption) { bg = "#FEF2F2"; border = C.coral; textColor = C.coral; }
            } else if (isSelected) {
              bg = C.goldLight; border = C.gold;
            }
            return (
              <button key={i} onClick={() => !answered && handleAnswer(i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 12,
                  border: `2px solid ${border}`, background: bg, cursor: answered ? "default" : "pointer",
                  fontSize: 15, fontWeight: 500, color: textColor, fontFamily: "inherit",
                  transition: "all 0.15s", textAlign: "left" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  background: answered && isCorrectOption ? C.teal : answered && isSelected ? C.coral : C.gray100,
                  color: answered && (isCorrectOption || isSelected) ? C.white : C.gray600 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {answered && isCorrectOption && <CheckCircle size={18} color={C.tealDark} style={{ marginLeft: "auto" }} />}
                {answered && isSelected && !isCorrectOption && <XCircle size={18} color={C.coral} style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div style={{ marginTop: 20, padding: "16px 18px", background: selected === q.correct ? "#F0FDF9" : "#FEF2F2",
            borderRadius: 12, border: `1px solid ${selected === q.correct ? "#BBF7D0" : "#FECACA"}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6,
              color: selected === q.correct ? C.tealDark : C.coral }}>
              {selected === q.correct ? "✓ Correct!" : "✗ Incorrect"}
            </div>
            <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>{q.explanation}</p>
          </div>
        )}

        {answered && (
          <button onClick={nextQuestion}
            style={{ marginTop: 20, width: "100%", padding: "14px", borderRadius: 12,
              border: "none", background: C.navy, color: C.white, fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}>
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question →"}
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.gray400 }}>
        Question {currentQ + 1} of {questions.length} · {event.icon} {event.name}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TEST UPLOAD & AI ANALYSIS
// ═══════════════════════════════════════════════════════════════
function TestUploadPage({ event, user, navigate }) {
  const [step, setStep] = useState("select"); // select | uploading | analyzing | results
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState(event);

  const simulateUpload = () => {
    setStep("uploading");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          setStep("analyzing");
          simulateAnalysis();
        }, 500);
      }
      setProgress(Math.min(100, Math.round(p)));
    }, 200);
  };

  const simulateAnalysis = () => {
    const ev = selectedEventForUpload || EVENTS[0];
    const topics = ev.topics;
    let analyzed = 0;
    const interval = setInterval(() => {
      analyzed++;
      setProgress(Math.round((analyzed / topics.length) * 100));
      if (analyzed >= topics.length) {
        clearInterval(interval);
        const results = topics.map(t => {
          const score = Math.round(Math.random() * 50 + 30);
          const questionsOnTopic = Math.floor(Math.random() * 4) + 2;
          const correct = Math.round(questionsOnTopic * score / 100);
          return { topic: t, score, questionsOnTopic, correct, missed: questionsOnTopic - correct };
        });
        const overall = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
        const weakest = [...results].sort((a, b) => a.score - b.score).slice(0, 3);
        const strongest = [...results].sort((a, b) => b.score - a.score).slice(0, 3);

        setAnalysisResults({
          event: ev,
          overall,
          totalQuestions: results.reduce((s, r) => s + r.questionsOnTopic, 0),
          totalCorrect: results.reduce((s, r) => s + r.correct, 0),
          topics: results,
          weakest,
          strongest,
          recommendations: [
            `Focus on "${weakest[0]?.topic}" — your lowest area at ${weakest[0]?.score}%. Start with a targeted 10-question quiz.`,
            `Your partner should cover "${weakest[1]?.topic}" (${weakest[1]?.score}%) while you strengthen "${weakest[0]?.topic}".`,
            `Great strength in "${strongest[0]?.topic}" (${strongest[0]?.score}%) — maintain with weekly review quizzes.`,
            `Schedule a full practice test again in 2 weeks to measure improvement on weak areas.`,
          ],
          stage: overall >= 80 ? 3 : overall >= 60 ? 2 : 1,
          stageLabel: overall >= 80 ? "Refine" : overall >= 60 ? "Specialize" : "Generalize",
        });
        setStep("results");
      }
    }, 300);
  };

  if (step === "select") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {event && (
          <button onClick={() => navigate("events", event)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Back to Event
          </button>
        )}

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Upload Practice Test</h2>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
          Upload a test and its answer key. Our AI will map each question to the rules topics and identify your gaps.
        </p>

        <div style={{ background: C.white, borderRadius: 20, padding: 32, border: `1px solid ${C.gray200}` }}>
          {/* Event Selector */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Event</label>
          <select value={selectedEventForUpload?.id || ""} onChange={e => setSelectedEventForUpload(EVENTS.find(ev => ev.id === Number(e.target.value)))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
              fontSize: 14, fontFamily: "inherit", marginBottom: 24, background: C.white, color: C.navy }}>
            <option value="">Select an event...</option>
            {EVENTS.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>
            ))}
          </select>

          {/* Upload Zone */}
          <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 16, padding: "40px 20px",
            textAlign: "center", marginBottom: 16, cursor: "pointer", transition: "border-color 0.2s",
            background: selectedFile ? "#F0FDF9" : "transparent" }}
            onClick={() => setSelectedFile({ name: "practice_test_feb_2026.pdf", size: "2.4 MB" })}>
            <Upload size={32} color={selectedFile ? C.teal : C.gray400} style={{ marginBottom: 12 }} />
            {selectedFile ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.tealDark }}>📄 {selectedFile.name}</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{selectedFile.size} — Click to change</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>Click to upload test (PDF, photo, or typed)</p>
                <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Supports PDF, JPG, PNG, DOCX — Max 10 MB</p>
              </>
            )}
          </div>

          <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 16, padding: "30px 20px",
            textAlign: "center", marginBottom: 24, cursor: "pointer" }}
            onClick={() => {}}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>📋 Upload Answer Key (optional)</p>
            <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>
              For best analysis, include the answer key. You can also enter answers manually.
            </p>
          </div>

          <button onClick={simulateUpload} disabled={!selectedEventForUpload || !selectedFile}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: selectedEventForUpload && selectedFile ? C.teal : C.gray200,
              color: selectedEventForUpload && selectedFile ? C.white : C.gray400,
              fontSize: 15, fontWeight: 700, cursor: selectedEventForUpload && selectedFile ? "pointer" : "default",
              fontFamily: "inherit" }}>
            🤖 Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  if (step === "uploading" || step === "analyzing") {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 48, border: `1px solid ${C.gray200}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{step === "uploading" ? "📤" : "🤖"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            {step === "uploading" ? "Uploading Test..." : "AI Analyzing Your Test..."}
          </h2>
          <p style={{ color: C.gray600, fontSize: 14, marginBottom: 24 }}>
            {step === "uploading"
              ? "Securely uploading your practice test."
              : "Mapping questions to 2026 Div B rules topics and identifying your strengths and gaps."}
          </p>
          <div style={{ height: 10, background: C.gray100, borderRadius: 100, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", borderRadius: 100, width: `${progress}%`,
              background: `linear-gradient(90deg, ${C.gold}, ${C.teal})`, transition: "width 0.3s ease" }} />
          </div>
          <p style={{ fontSize: 13, color: C.gray400 }}>{progress}% complete</p>
          {step === "analyzing" && (
            <div style={{ marginTop: 20, padding: "10px 16px", background: C.goldLight, borderRadius: 8, fontSize: 12, color: C.gray600 }}>
              Identifying topic coverage... Calculating mastery scores... Generating recommendations...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "results" && analysisResults) {
    const r = analysisResults;
    const barData = r.topics.map(t => ({
      name: t.topic.length > 15 ? t.topic.slice(0, 13) + "…" : t.topic,
      score: t.score,
      fill: t.score >= 80 ? C.teal : t.score >= 60 ? C.gold : C.coral,
    }));

    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📊 AI Analysis Results</h2>
        <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
          {r.event.icon} {r.event.name} — Practice test analyzed
        </p>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Overall Score", value: `${r.overall}%`, color: r.overall >= 80 ? C.teal : r.overall >= 60 ? C.gold : C.coral },
            { label: "Questions", value: `${r.totalCorrect}/${r.totalQuestions}`, color: C.navy },
            { label: "Learning Stage", value: r.stageLabel, color: C.gold },
            { label: "Weak Areas", value: r.weakest.length, color: C.coral },
          ].map((s, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.gray200}` }}>
              <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Topic Scores Chart */}
          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Topic Scores</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#F0FDF9", borderRadius: 16, padding: 20, border: "1px solid #BBF7D0" }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.tealDark, marginBottom: 10 }}>💪 Strengths</h4>
              {r.strongest.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  fontSize: 13, borderBottom: i < r.strongest.length - 1 ? "1px solid #D1FAE5" : "none" }}>
                  <span>{t.topic}</span>
                  <span style={{ fontWeight: 700, color: C.tealDark }}>{t.score}%</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#FEF2F2", borderRadius: 16, padding: 20, border: "1px solid #FECACA" }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.coral, marginBottom: 10 }}>⚠️ Needs Work</h4>
              {r.weakest.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  fontSize: 13, borderBottom: i < r.weakest.length - 1 ? "1px solid #FECACA" : "none" }}>
                  <span>{t.topic}</span>
                  <span style={{ fontWeight: 700, color: C.coral }}>{t.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🤖 AI Study Recommendations
          </h3>
          {r.recommendations.map((rec, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: i === 0 ? C.goldLight : C.offWhite,
              borderRadius: 10, marginBottom: 8, fontSize: 13, color: C.gray600, alignItems: "flex-start" }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: i === 0 ? C.gold : C.gray200, color: i === 0 ? C.white : C.gray600 }}>
                {i + 1}
              </span>
              {rec}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("studypath", r.event)}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: C.teal,
              color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🧠 Start AI Study Path
          </button>
          <button onClick={() => { setStep("select"); setSelectedFile(null); setProgress(0); setAnalysisResults(null); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px solid ${C.gray200}`, background: C.white,
              color: C.navy, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Upload Another Test
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  STUDY PATH PAGE
// ═══════════════════════════════════════════════════════════════
function StudyPathPage({ event, user, navigate }) {
  const ev = event || EVENTS.find(e => user.events.includes(e.id));
  const mastery = ev ? generateMastery(user.id, ev.id) : [];
  const avg = mastery.length ? Math.round(mastery.reduce((s, t) => s + t.score, 0) / mastery.length) : 0;
  const currentStage = avg >= 85 ? 4 : avg >= 70 ? 3 : avg >= 50 ? 2 : 1;

  const stages = [
    { num: 1, name: "Generalize", desc: "Build baseline across all topics", color: C.gold, icon: "📚",
      tasks: ["Complete overview readings for all topics", "Take a broad diagnostic quiz", "Identify major knowledge gaps"] },
    { num: 2, name: "Specialize", desc: "Target your weak areas", color: C.teal, icon: "🎯",
      tasks: ["Focus quizzes on lowest-scoring topics", "Review AI-generated study summaries", "Practice with topic-specific flashcards"] },
    { num: 3, name: "Refine", desc: "State & nationals depth", color: C.coral, icon: "⚡",
      tasks: ["Cover State/National-only topics", "Practice advanced application questions", "Coordinate coverage with partner"] },
    { num: 4, name: "Master", desc: "Competition simulation", color: C.navy, icon: "🏆",
      tasks: ["Timed full practice tests", "Review past state/national questions", "Maintain mastery with spaced review"] },
  ];

  return (
    <div>
      {ev && (
        <button onClick={() => navigate("events", ev)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: C.gray400, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
          <ArrowLeft size={14} /> Back to {ev.name}
        </button>
      )}

      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        🧠 Learning Path {ev ? `— ${ev.icon} ${ev.name}` : ""}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 32 }}>
        You're currently in <strong style={{ color: stages[currentStage - 1].color }}>Stage {currentStage}: {stages[currentStage - 1].name}</strong>
        {avg > 0 && ` with ${avg}% overall mastery.`}
      </p>

      {/* Stage Progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 40, position: "relative" }}>
        {stages.map((s, i) => {
          const isActive = s.num === currentStage;
          const isComplete = s.num < currentStage;
          return (
            <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              {i < 3 && (
                <div style={{ position: "absolute", top: 28, left: "50%", width: "100%", height: 4,
                  background: isComplete ? `linear-gradient(90deg, ${stages[i].color}, ${stages[i + 1].color})` : C.gray200,
                  zIndex: 0, borderRadius: 2 }} />
              )}
              <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                background: isActive ? s.color : isComplete ? s.color : C.gray100,
                color: isActive || isComplete ? C.white : C.gray400,
                border: isActive ? `3px solid ${s.color}` : "none",
                boxShadow: isActive ? `0 0 0 6px ${s.color}33` : "none",
                position: "relative", zIndex: 1, transition: "all 0.3s" }}>
                {isComplete ? <CheckCircle size={24} /> : s.icon}
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: isActive ? s.color : isComplete ? C.navy : C.gray400 }}>{s.name}</h4>
              <p style={{ fontSize: 12, color: C.gray400, maxWidth: 160, margin: "4px auto 0" }}>{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Current Stage Tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            📋 Stage {currentStage} Tasks: {stages[currentStage - 1].name}
          </h3>
          {stages[currentStage - 1].tasks.map((task, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: i === 0 ? C.goldLight : C.offWhite, borderRadius: 10, marginBottom: 8, fontSize: 13, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "center", background: i === 0 ? C.gold : C.gray200, flexShrink: 0 }}>
                {i === 0 ? <Play size={14} color={C.white} /> : <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400 }}>{i + 1}</span>}
              </div>
              <span style={{ fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.navy : C.gray600 }}>{task}</span>
            </div>
          ))}
          {ev && (
            <button onClick={() => navigate("quiz")}
              style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 10, border: "none",
                background: stages[currentStage - 1].color, color: C.white, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              Start Next Quiz →
            </button>
          )}
        </div>

        {/* Topic Priority List */}
        {ev && (
          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🎯 Priority Topics</h3>
            {[...mastery].sort((a, b) => a.score - b.score).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: i < mastery.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: i < 3 ? "#FEF2F2" : i < 5 ? C.goldLight : "#E2F0E6",
                  color: i < 3 ? C.coral : i < 5 ? "#A0522D" : C.tealDark }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.topic}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.score >= 80 ? C.tealDark : m.score >= 60 ? C.gold : C.coral }}>
                  {m.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PARTNER SYNERGY PAGE
// ═══════════════════════════════════════════════════════════════
function PartnerSynergyPage({ user, navigate }) {
  const userPartnerships = PARTNERSHIPS.filter(p => p.partners.includes(user.id));

  if (userPartnerships.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Users size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Partnerships Yet</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>Your coach will assign event partners soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>👥 Partner Synergy</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        See how you and your partners complement each other across event topics.
      </p>

      {userPartnerships.map(p => {
        const partnerId = p.partners.find(id => id !== user.id);
        const partner = STUDENTS.find(s => s.id === partnerId);
        const ev = EVENTS.find(e => e.id === p.eventId);
        if (!partner || !ev) return null;

        const myMastery = generateMastery(user.id, p.eventId);
        const theirMastery = generateMastery(partnerId, p.eventId);

        return (
          <div key={p.eventId} style={{ background: C.white, borderRadius: 16, padding: 28,
            border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{ev.icon}</span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{ev.name}</h3>
                  <p style={{ fontSize: 12, color: C.gray400 }}>Team of {ev.teamSize}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${user.color}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: user.color,
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {user.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>You</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: `${partner.color}15`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: partner.color,
                    fontSize: 9, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {partner.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{partner.name.split(" ")[0]}</span>
                </div>
              </div>
            </div>

            {/* Coverage Grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px", gap: 0, fontSize: 12 }}>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Topic</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400 }}>Coverage</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>You</div>
                <div style={{ padding: "8px 10px", fontWeight: 700, color: C.gray400, textAlign: "center" }}>{partner.name.split(" ")[0]}</div>
              </div>
              {ev.topics.map((topic, i) => {
                const myScore = myMastery[i]?.score || 0;
                const theirScore = theirMastery[i]?.score || 0;
                const combined = Math.max(myScore, theirScore);
                const status = combined >= 80 ? "green" : (myScore >= 70 || theirScore >= 70) ? "gold" : "red";
                const statusColor = status === "green" ? C.teal : status === "gold" ? C.gold : C.coral;
                const statusBg = status === "green" ? "#E2F0E6" : status === "gold" ? C.goldLight : "#FEF2F2";

                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px 60px",
                    gap: 0, borderTop: `1px solid ${C.gray100}`, alignItems: "center" }}>
                    <div style={{ padding: "10px", fontSize: 13, fontWeight: 500 }}>{topic}</div>
                    <div style={{ padding: "10px" }}>
                      <div style={{ height: 12, background: C.gray100, borderRadius: 100, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", height: "100%", width: `${myScore}%`, background: `${user.color}55`, borderRadius: 100 }} />
                        <div style={{ position: "absolute", height: "100%", width: `${theirScore}%`, background: `${partner.color}55`, borderRadius: 100 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: myScore >= 80 ? C.tealDark : myScore >= 60 ? C.gold : C.coral }}>
                      {myScore}%
                    </div>
                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: theirScore >= 80 ? C.tealDark : theirScore >= 60 ? C.gold : C.coral }}>
                      {theirScore}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#E2F0E6", color: C.tealDark }}>
                🟢 Both strong
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.goldLight, color: "#A0522D" }}>
                🟡 One covers it
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FEF2F2", color: C.coral }}>
                🔴 Gap for both
              </span>
            </div>

            <div style={{ marginTop: 16, padding: "14px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13 }}>
              <strong style={{ color: C.gold }}>🤖 AI Suggestion:</strong>{" "}
              <span style={{ color: C.gray600 }}>
                {user.name.split(" ")[0]}, focus on {myMastery.sort((a, b) => a.score - b.score)[0]?.topic}.{" "}
                {partner.name.split(" ")[0]} should prioritize {theirMastery.sort((a, b) => a.score - b.score)[0]?.topic}.
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  COACH DASHBOARD
// ═══════════════════════════════════════════════════════════════
function CoachDashboard({ navigate, isAdmin }) {
  const coachEvents = isAdmin ? EVENTS : EVENTS.slice(0, 4);
  const [selectedEventId, setSelectedEventId] = useState(coachEvents[0]?.id);
  const selectedEvent = EVENTS.find(e => e.id === selectedEventId);
  const eventStudents = STUDENTS.filter(s => s.events.includes(selectedEventId));

  const teamReadiness = coachEvents.map(ev => {
    const students = STUDENTS.filter(s => s.events.includes(ev.id));
    const avg = students.length ? Math.round(students.reduce((sum, s) => {
      const m = generateMastery(s.id, ev.id);
      return sum + Math.round(m.reduce((a, b) => a + b.score, 0) / m.length);
    }, 0) / students.length) : 0;
    return { ...ev, readiness: avg, studentCount: students.length };
  }).sort((a, b) => a.readiness - b.readiness);

  const trendData = [
    { week: "W1", score: 42 }, { week: "W2", score: 48 }, { week: "W3", score: 53 },
    { week: "W4", score: 58 }, { week: "W5", score: 62 }, { week: "W6", score: 68 },
    { week: "W7", score: 72 }, { week: "W8", score: 75 },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        {isAdmin ? "🛡️ Admin Dashboard" : "📊 Coach Dashboard"}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        {isAdmin ? "Full team oversight — all 23 events" : "Your assigned events overview"}
      </p>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Students", value: STUDENTS.length, color: C.navy },
          { label: "Events Monitored", value: coachEvents.length, color: C.teal },
          { label: "Avg Readiness", value: `${Math.round(teamReadiness.reduce((s, e) => s + e.readiness, 0) / teamReadiness.length)}%`, color: C.gold },
          { label: "Days to State", value: 33, color: C.coral },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Event Readiness Rankings */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {isAdmin ? "🏅 All Events Readiness" : "🏅 Your Events Readiness"}
          </h3>
          <div style={{ maxHeight: 340, overflow: "auto" }}>
            {teamReadiness.map((ev, i) => (
              <div key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: ev.id === selectedEventId ? C.goldLight : "transparent" }}>
                <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: i < 3 ? C.coral : C.gray400 }}>#{i + 1}</span>
                <span style={{ fontSize: 16 }}>{ev.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{ev.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ev.readiness >= 80 ? C.tealDark : ev.readiness >= 60 ? C.gold : C.coral }}>
                  {ev.readiness}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Progress Trend */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 Team Progress Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="score" stroke={C.teal} strokeWidth={3} dot={{ fill: C.teal, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {selectedEvent.icon} {selectedEvent.name} — Student Breakdown
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {eventStudents.map(s => {
              const m = generateMastery(s.id, selectedEventId);
              const avg = Math.round(m.reduce((sum, t) => sum + t.score, 0) / m.length);
              return (
                <div key={s.id} style={{ padding: "16px", background: C.offWhite, borderRadius: 12, border: `1px solid ${C.gray100}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: C.white }}>{s.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{avg}% mastery</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: C.gray200, borderRadius: 100 }}>
                    <div style={{ height: "100%", borderRadius: 100, width: `${avg}%`,
                      background: avg >= 80 ? C.teal : avg >= 60 ? C.gold : C.coral }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.gray400 }}>
                    Weakest: {m.sort((a, b) => a.score - b.score)[0]?.topic}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SCHEDULE PAGE
// ═══════════════════════════════════════════════════════════════
function SchedulePage({ navigate }) {
  const events = [
    { date: "Mar 22, 2026", name: "Wheeling Invitational", type: "invitational", status: "upcoming" },
    { date: "Apr 4, 2026", name: "Regional Tournament", type: "regional", status: "upcoming" },
    { date: "Apr 18, 2026", name: "State Tournament", type: "state", status: "upcoming" },
    { date: "May 29–30, 2026", name: "National Tournament", type: "nationals", status: "upcoming" },
    { date: "Mar 8, 2026", name: "Lincoln-Way Invitational", type: "invitational", status: "past" },
    { date: "Feb 22, 2026", name: "Niles West Invitational", type: "invitational", status: "past" },
  ];
  const typeColors = {
    invitational: { bg: C.goldLight, text: "#A0522D" },
    regional: { bg: "#E2F0E6", text: C.tealDark },
    state: { bg: "#EDE9FE", text: "#7C3AED" },
    nationals: { bg: "#FEF2F2", text: C.coral },
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📅 Competition Schedule</h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>2025–2026 Season</p>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: C.teal }}>Upcoming</h3>
      {events.filter(e => e.status === "upcoming").map((ev, i) => {
        const tc = typeColors[ev.type];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
            background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 10 }}>
            <div style={{ width: 48, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600 }}>{ev.date.split(" ")[0]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{ev.date.split(" ")[1]?.replace(",", "")}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ev.name}</div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", background: tc.bg, color: tc.text }}>{ev.type}</span>
          </div>
        );
      })}

      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "24px 0 14px", color: C.gray400 }}>Past Events</h3>
      {events.filter(e => e.status === "past").map((ev, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
          background: C.white, borderRadius: 12, border: `1px solid ${C.gray100}`, marginBottom: 8, opacity: 0.6 }}>
          <div style={{ width: 48, textAlign: "center", fontSize: 13, color: C.gray400 }}>{ev.date.split(",")[0]}</div>
          <div style={{ flex: 1, fontSize: 14, color: C.gray600 }}>{ev.name}</div>
          <span style={{ fontSize: 11, color: C.gray400 }}>Completed ✓</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BUILD EVENT LOG
// ═══════════════════════════════════════════════════════════════

const BUILD_EVENTS = EVENTS.filter(e => e.type === "build");

const INITIAL_BUILD_RUNS = {
  12: [ // Boomilever
    { id: 1, date: "2026-03-10", mass: 14.2, loadHeld: 8500, efficiency: 598.6, contactDepth: 12, notes: "Balsa cross-braced design #3. Held well but cracked at left joint under max load.", designVersion: "v3", tags: ["crack", "joint-failure"], imageCount: 2 },
    { id: 2, date: "2026-03-06", mass: 16.8, loadHeld: 7200, efficiency: 428.6, contactDepth: 15, notes: "Thicker members. Heavier but more stable. No cracking. Slow load application.", designVersion: "v3", tags: ["stable", "heavy"], imageCount: 1 },
    { id: 3, date: "2026-03-01", mass: 12.1, loadHeld: 5400, efficiency: 446.3, contactDepth: 10, notes: "Lightweight attempt. Buckled at center strut before reaching target load.", designVersion: "v2", tags: ["buckling", "lightweight"], imageCount: 1 },
    { id: 4, date: "2026-02-22", mass: 18.5, loadHeld: 9100, efficiency: 491.9, contactDepth: 15, notes: "First prototype with laminated joints. Very strong but way too heavy.", designVersion: "v1", tags: ["laminated", "heavy"], imageCount: 0 },
  ],
  13: [ // Helicopter
    { id: 1, date: "2026-03-12", flightTime: 8.42, mass: 3.2, notes: "Best flight so far! Blade angle 22° worked well. Slight wobble on descent.", designVersion: "v4", tags: ["personal-best", "wobble"], imageCount: 1 },
    { id: 2, date: "2026-03-08", flightTime: 6.87, mass: 3.5, notes: "Added counterweight. Too heavy, fell fast. Blade flex issue.", designVersion: "v3", tags: ["heavy", "blade-flex"], imageCount: 2 },
    { id: 3, date: "2026-03-03", flightTime: 7.15, mass: 2.8, notes: "Lighter build. Good float time but spins off course. Need better balance.", designVersion: "v3", tags: ["off-course", "balance"], imageCount: 0 },
    { id: 4, date: "2026-02-25", flightTime: 5.23, mass: 4.1, notes: "Prototype with paper blades. Way too heavy. Switching to balsa.", designVersion: "v2", tags: ["heavy", "prototype"], imageCount: 1 },
  ],
  14: [ // Hovercraft
    { id: 1, date: "2026-03-11", runTime: 4.32, distance: 8.0, accuracy: 92, notes: "Best accuracy yet. Skirt seal improved with tape. Slight drift left.", designVersion: "v3", tags: ["accurate", "drift"], imageCount: 1 },
    { id: 2, date: "2026-03-07", runTime: 3.89, distance: 8.0, accuracy: 78, notes: "Fast but inaccurate. Motor too powerful for fine control.", designVersion: "v2", tags: ["fast", "inaccurate"], imageCount: 0 },
    { id: 3, date: "2026-02-28", runTime: 5.67, distance: 8.0, accuracy: 85, notes: "New fan mount. Slower but more controlled. Skirt leak on right side.", designVersion: "v2", tags: ["controlled", "skirt-leak"], imageCount: 2 },
  ],
  15: [ // Mission Possible
    { id: 1, date: "2026-03-09", completionTime: 62, actionsCompleted: 8, totalActions: 10, notes: "Steps 7-8 failed. Marble didn't trigger lever. Need steeper ramp angle.", designVersion: "v2", tags: ["ramp-issue", "incomplete"], imageCount: 1 },
    { id: 2, date: "2026-03-04", completionTime: 78, actionsCompleted: 10, totalActions: 10, notes: "Full completion! But slow. Dominoes took 15 sec. Need tighter spacing.", designVersion: "v2", tags: ["complete", "slow"], imageCount: 3 },
    { id: 3, date: "2026-02-27", completionTime: 45, actionsCompleted: 6, totalActions: 10, notes: "Steps 4-10 failed. Pulley string snapped. Using stronger cord next time.", designVersion: "v1", tags: ["string-break", "incomplete"], imageCount: 0 },
  ],
  16: [ // Scrambler
    { id: 1, date: "2026-03-13", runTime: 2.84, targetDistance: 750, actualDistance: 738, eggIntact: true, notes: "Closest run yet! 12cm off target. Egg survived. Need finer braking adjustment.", designVersion: "v3", tags: ["close", "egg-safe"], imageCount: 1 },
    { id: 2, date: "2026-03-08", runTime: 2.51, targetDistance: 750, actualDistance: 692, eggIntact: false, notes: "Fast but overshot braking point. Egg cracked on rebound. Softer bumper needed.", designVersion: "v3", tags: ["egg-crack", "overshoot"], imageCount: 2 },
    { id: 3, date: "2026-03-02", runTime: 3.12, targetDistance: 750, actualDistance: 745, eggIntact: true, notes: "Very accurate! But too slow. Need more counterweight for faster acceleration.", designVersion: "v2", tags: ["accurate", "slow"], imageCount: 0 },
  ],
};

const BUILD_DESIGN_IMAGES = {
  12: [
    { id: 1, name: "Boomilever v3 — Side View", date: "2026-03-10", description: "Cross-braced design with reinforced joints. Note the 45° angle members.", version: "v3" },
    { id: 2, name: "Joint Detail — Epoxy Application", date: "2026-03-09", description: "Close-up of laminated joint with epoxy. 3 layers of balsa.", version: "v3" },
    { id: 3, name: "Boomilever v2 — Failed Center Strut", date: "2026-03-01", description: "Post-test photo showing buckling at center strut.", version: "v2" },
  ],
  13: [
    { id: 1, name: "Helicopter v4 — Blade Assembly", date: "2026-03-12", description: "22° blade angle with balsa blades. Lighter assembly.", version: "v4" },
    { id: 2, name: "Counterweight Test Setup", date: "2026-03-08", description: "Testing different counterweight positions.", version: "v3" },
  ],
  16: [
    { id: 1, name: "Scrambler v3 — Braking System", date: "2026-03-13", description: "Adjustable brake arm with rubber contact pad.", version: "v3" },
    { id: 2, name: "Egg Cradle Close-up", date: "2026-03-08", description: "Foam-lined cradle. Cracked on this run — adding more padding.", version: "v3" },
  ],
};

// AI Diagnostics Engine for Build Events
function generateBuildDiagnostics(eventId, runs) {
  if (!runs || runs.length < 2) return { issues: [], suggestions: [], trend: "insufficient" };

  const eventName = EVENTS.find(e => e.id === eventId)?.name || "Build Event";
  const issues = [];
  const suggestions = [];

  if (eventId === 12) { // Boomilever
    const avgEfficiency = runs.reduce((s, r) => s + (r.efficiency || 0), 0) / runs.length;
    const hasCracking = runs.some(r => r.tags?.includes("crack") || r.tags?.includes("joint-failure"));
    const hasBuckling = runs.some(r => r.tags?.includes("buckling"));
    const tooHeavy = runs.filter(r => r.mass > 16).length > runs.length / 2;
    const bestEfficiency = Math.max(...runs.map(r => r.efficiency || 0));
    const worstEfficiency = Math.min(...runs.map(r => r.efficiency || 0));

    if (hasCracking) {
      issues.push({ severity: "high", area: "Joint Integrity", detail: "Cracking detected at joints under load. This suggests the adhesive bond or wood grain orientation isn't distributing stress evenly.", icon: "🔴" });
      suggestions.push("Apply epoxy in thin, even layers and clamp joints for at least 4 hours. Consider adding small gusset plates (triangular reinforcements) at critical joints.");
      suggestions.push("Check wood grain direction — grain should run along the length of each member for maximum tensile strength. Cross-grain pieces are prone to splitting.");
    }
    if (hasBuckling) {
      issues.push({ severity: "high", area: "Member Buckling", detail: "Center strut buckling indicates the member is too slender for the compressive load. The slenderness ratio is likely too high.", icon: "🔴" });
      suggestions.push("Increase cross-section of compression members (struts) or add lateral bracing. For balsa, a 2:1 width-to-thickness ratio helps resist buckling.");
      suggestions.push("Consider laminating two thinner strips together — this creates a stronger composite section than a single piece of the same total thickness.");
    }
    if (tooHeavy) {
      issues.push({ severity: "medium", area: "Excessive Mass", detail: `${runs.filter(r => r.mass > 16).length} of ${runs.length} builds exceeded 16g. Higher mass directly reduces your efficiency score.`, icon: "🟡" });
      suggestions.push("Target 12-14g for optimal efficiency. Remove material from low-stress areas — the middle sections of tension members can often be thinner.");
    }
    if (bestEfficiency > 0) {
      issues.push({ severity: "info", area: "Efficiency Trend", detail: `Best efficiency: ${bestEfficiency.toFixed(1)} (Load/Mass). Your range is ${worstEfficiency.toFixed(1)} to ${bestEfficiency.toFixed(1)}.`, icon: "📊" });
      suggestions.push(`Top state-level teams achieve 700+ efficiency. You're at ${bestEfficiency.toFixed(1)} — focus on reducing mass while maintaining the load capacity of your v3 design.`);
    }
  }

  else if (eventId === 13) { // Helicopter
    const times = runs.map(r => r.flightTime || 0);
    const bestTime = Math.max(...times);
    const hasWobble = runs.some(r => r.tags?.includes("wobble") || r.tags?.includes("off-course"));
    const hasBalanceIssue = runs.some(r => r.tags?.includes("balance"));
    const hasBladeFlex = runs.some(r => r.tags?.includes("blade-flex"));
    const improving = times.length >= 2 && times[0] > times[times.length - 1];

    if (hasWobble || hasBalanceIssue) {
      issues.push({ severity: "high", area: "Flight Stability", detail: "Wobble and off-course behavior indicate a center-of-gravity imbalance or inconsistent blade geometry.", icon: "🔴" });
      suggestions.push("Ensure all blades are identical in weight and angle. Even 0.5° difference between blades causes wobble. Use a protractor jig for consistent blade angles.");
      suggestions.push("Check the center shaft is perfectly vertical. A bent or angled shaft creates asymmetric lift and drift.");
    }
    if (hasBladeFlex) {
      issues.push({ severity: "medium", area: "Blade Rigidity", detail: "Blade flex under rotation reduces effective lift and wastes energy. Blades should maintain their set angle during flight.", icon: "🟡" });
      suggestions.push("Stiffen blades with a thin balsa spar along the leading edge, or switch to a slightly thicker material. The blade should feel rigid when you gently push the tip.");
    }
    if (improving) {
      issues.push({ severity: "info", area: "Positive Trend", detail: `Flight times improving: ${times[times.length - 1].toFixed(2)}s → ${times[0].toFixed(2)}s. Best: ${bestTime.toFixed(2)}s.`, icon: "📈" });
    }
    suggestions.push(`State-winning helicopters typically achieve 10-14 seconds. Your best is ${bestTime.toFixed(2)}s — consider reducing total mass to under 3g and optimizing blade pitch angle between 20-25°.`);
  }

  else if (eventId === 16) { // Scrambler
    const hasEggBreak = runs.some(r => r.eggIntact === false);
    const accuracyRuns = runs.filter(r => r.targetDistance && r.actualDistance);
    const avgError = accuracyRuns.length ? accuracyRuns.reduce((s, r) => s + Math.abs(r.targetDistance - r.actualDistance), 0) / accuracyRuns.length : 0;
    const hasOvershoot = runs.some(r => r.tags?.includes("overshoot"));

    if (hasEggBreak) {
      issues.push({ severity: "high", area: "Egg Protection", detail: "Egg cracked during at least one run. This is an automatic penalty. The cradle or braking mechanism needs improvement.", icon: "🔴" });
      suggestions.push("Add more cushioning material (foam, cotton) around the egg cradle. The egg should not touch any hard surface during deceleration.");
      suggestions.push("Reduce braking force by extending the braking distance — a gentler stop over a longer distance protects the egg better than a sudden stop.");
    }
    if (hasOvershoot) {
      issues.push({ severity: "high", area: "Braking Accuracy", detail: "Vehicle overshooting the target suggests the braking mechanism engages too late or doesn't provide enough friction.", icon: "🔴" });
      suggestions.push("Calibrate brake engagement point for each target distance. Consider a string-based brake where string length = desired travel distance minus braking distance.");
    }
    if (avgError > 0) {
      issues.push({ severity: "medium", area: "Distance Accuracy", detail: `Average distance error: ${avgError.toFixed(0)}cm from target. Consistency is key for scoring.`, icon: "🟡" });
      suggestions.push(`Run at least 5 trials at each target distance and record the results. Your error of ${avgError.toFixed(0)}cm can be reduced by fine-tuning the string length for your braking system.`);
    }
  }

  else if (eventId === 14) { // Hovercraft
    const hasDrift = runs.some(r => r.tags?.includes("drift"));
    const hasSkirtLeak = runs.some(r => r.tags?.includes("skirt-leak"));

    if (hasDrift) {
      issues.push({ severity: "medium", area: "Directional Control", detail: "Vehicle drifting off course. This could be asymmetric thrust, uneven weight distribution, or a skirt leak on one side.", icon: "🟡" });
      suggestions.push("Check that the thrust fan is perfectly centered. Even 2-3mm offset creates a turning moment. Use a laser pointer or plumb bob to verify alignment.");
    }
    if (hasSkirtLeak) {
      issues.push({ severity: "high", area: "Skirt Seal", detail: "Air leaking from the skirt reduces lift and causes uneven hovering. This directly affects both speed and accuracy.", icon: "🔴" });
      suggestions.push("Reinforce skirt attachment with hot glue along the entire perimeter. Test the seal by running the lift fan with the vehicle stationary — listen for hissing and feel for air escape with your hand.");
    }
    suggestions.push("For competition tracks, practice on the same surface type (smooth gym floor vs. rough table). Hovercraft behavior changes dramatically with surface friction.");
  }

  else if (eventId === 15) { // Mission Possible
    const incompleteRuns = runs.filter(r => r.actionsCompleted < r.totalActions);
    const hasRampIssue = runs.some(r => r.tags?.includes("ramp-issue"));
    const hasStringBreak = runs.some(r => r.tags?.includes("string-break"));

    if (incompleteRuns.length > 0) {
      issues.push({ severity: "high", area: "Reliability", detail: `${incompleteRuns.length} of ${runs.length} runs failed to complete all actions. Reliability is more important than speed.`, icon: "🔴" });
      suggestions.push("Focus on 100% completion rate before optimizing for speed. Each failed action loses more points than a few extra seconds of time.");
    }
    if (hasRampIssue) {
      issues.push({ severity: "medium", area: "Ramp/Trigger Angle", detail: "Marble failed to trigger the next step — the ramp angle is likely too shallow for reliable energy transfer.", icon: "🟡" });
      suggestions.push("Increase ramp angle by 5-10° and test 10 times. The marble should trigger the next step at least 9/10 times before you consider it reliable.");
    }
    if (hasStringBreak) {
      issues.push({ severity: "high", area: "Materials Failure", detail: "String/cord broke during a run. Use stronger materials and test them under 2× the expected load.", icon: "🔴" });
      suggestions.push("Switch to braided fishing line (10lb test) instead of thread or twine. It's stronger, more consistent, and doesn't stretch.");
    }
  }

  // Generic suggestions for all build events
  if (runs.length < 5) {
    suggestions.push("You have only " + runs.length + " logged runs. Aim for at least 10 practice runs before competition to build consistency and identify patterns.");
  }

  return { issues, suggestions, trend: runs.length >= 3 ? "sufficient" : "insufficient" };
}

function BuildLogPage({ event, user, navigate }) {
  const buildEvents = BUILD_EVENTS.filter(e => user.events.includes(e.id));
  const [selectedBuildEvent, setSelectedBuildEvent] = useState(event?.type === "build" ? event : buildEvents[0]);
  const [runs, setRuns] = useState(INITIAL_BUILD_RUNS);
  const [showAddRun, setShowAddRun] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [activeTab, setActiveTab] = useState("runs"); // runs | images | diagnostics
  const [expandedRun, setExpandedRun] = useState(null);
  const [newRun, setNewRun] = useState({});

  const currentRuns = runs[selectedBuildEvent?.id] || [];
  const currentImages = BUILD_DESIGN_IMAGES[selectedBuildEvent?.id] || [];
  const diagnostics = generateBuildDiagnostics(selectedBuildEvent?.id, currentRuns);

  // Performance metric helpers per event type
  const getMetricLabel = (evId) => {
    const labels = { 12: "Efficiency", 13: "Flight Time", 14: "Run Time", 15: "Completion", 16: "Accuracy" };
    return labels[evId] || "Score";
  };
  const getMetricValue = (run, evId) => {
    if (evId === 12) return run.efficiency?.toFixed(1) || "—";
    if (evId === 13) return (run.flightTime?.toFixed(2) + "s") || "—";
    if (evId === 14) return (run.runTime?.toFixed(2) + "s") || "—";
    if (evId === 15) return `${run.actionsCompleted || 0}/${run.totalActions || 10}`;
    if (evId === 16) return `${Math.abs((run.targetDistance || 0) - (run.actualDistance || 0))}cm off`;
    return "—";
  };
  const getPrimaryMetric = (run, evId) => {
    if (evId === 12) return run.efficiency || 0;
    if (evId === 13) return run.flightTime || 0;
    if (evId === 14) return 10 - (run.runTime || 10);
    if (evId === 15) return ((run.actionsCompleted || 0) / (run.totalActions || 10)) * 100;
    if (evId === 16) return 100 - Math.abs((run.targetDistance || 0) - (run.actualDistance || 0));
    return 0;
  };

  // Chart data
  const chartData = [...currentRuns].reverse().map((run, i) => ({
    run: `#${i + 1}`,
    date: run.date?.slice(5) || "",
    value: getPrimaryMetric(run, selectedBuildEvent?.id),
    ...(selectedBuildEvent?.id === 12 ? { efficiency: run.efficiency, mass: run.mass, load: run.loadHeld / 100 } : {}),
    ...(selectedBuildEvent?.id === 13 ? { flightTime: run.flightTime, mass: run.mass } : {}),
    ...(selectedBuildEvent?.id === 14 ? { runTime: run.runTime, accuracy: run.accuracy } : {}),
    ...(selectedBuildEvent?.id === 15 ? { actions: ((run.actionsCompleted || 0) / (run.totalActions || 10)) * 100, completionTime: run.completionTime } : {}),
    ...(selectedBuildEvent?.id === 16 ? { error: Math.abs((run.targetDistance || 0) - (run.actualDistance || 0)), time: run.runTime } : {}),
  }));

  const addNewRun = () => {
    const evId = selectedBuildEvent?.id;
    const newId = Math.max(0, ...currentRuns.map(r => r.id)) + 1;
    const baseRun = {
      id: newId,
      date: new Date().toISOString().slice(0, 10),
      designVersion: newRun.designVersion || "v1",
      notes: newRun.notes || "",
      tags: newRun.tags ? newRun.tags.split(",").map(t => t.trim()) : [],
      imageCount: 0,
    };

    if (evId === 12) {
      baseRun.mass = parseFloat(newRun.mass) || 0;
      baseRun.loadHeld = parseFloat(newRun.loadHeld) || 0;
      baseRun.efficiency = baseRun.mass > 0 ? baseRun.loadHeld / baseRun.mass : 0;
      baseRun.contactDepth = parseFloat(newRun.contactDepth) || 0;
    } else if (evId === 13) {
      baseRun.flightTime = parseFloat(newRun.flightTime) || 0;
      baseRun.mass = parseFloat(newRun.mass) || 0;
    } else if (evId === 14) {
      baseRun.runTime = parseFloat(newRun.runTime) || 0;
      baseRun.distance = parseFloat(newRun.distance) || 8.0;
      baseRun.accuracy = parseFloat(newRun.accuracy) || 0;
    } else if (evId === 15) {
      baseRun.completionTime = parseFloat(newRun.completionTime) || 0;
      baseRun.actionsCompleted = parseInt(newRun.actionsCompleted) || 0;
      baseRun.totalActions = parseInt(newRun.totalActions) || 10;
    } else if (evId === 16) {
      baseRun.runTime = parseFloat(newRun.runTime) || 0;
      baseRun.targetDistance = parseFloat(newRun.targetDistance) || 750;
      baseRun.actualDistance = parseFloat(newRun.actualDistance) || 0;
      baseRun.eggIntact = newRun.eggIntact !== "false";
    }

    setRuns(prev => ({ ...prev, [evId]: [baseRun, ...(prev[evId] || [])] }));
    setNewRun({});
    setShowAddRun(false);
  };

  if (buildEvents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Wrench size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.navy }}>No Build Events Assigned</h2>
        <p style={{ color: C.gray400, fontSize: 14 }}>You don't have any build events. The Build Log is for Boomilever, Helicopter, Hovercraft, Mission Possible, and Scrambler.</p>
        <button onClick={() => navigate("events")}
          style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: "none", background: C.teal, color: C.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <Wrench size={24} color={C.coral} /> Build Event Log
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 24 }}>
        Track practice runs, upload design photos, and get AI diagnostics on your build events.
      </p>

      {/* Event Selector */}
      {buildEvents.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {buildEvents.map(ev => (
            <button key={ev.id} onClick={() => { setSelectedBuildEvent(ev); setShowAddRun(false); setExpandedRun(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10,
                border: selectedBuildEvent?.id === ev.id ? `2px solid ${C.coral}` : `1px solid ${C.gray200}`,
                background: selectedBuildEvent?.id === ev.id ? "#F5E2DC" : C.white,
                color: selectedBuildEvent?.id === ev.id ? C.coral : C.navy,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 18 }}>{ev.icon}</span>
              {ev.name}
              {currentRuns.length > 0 && selectedBuildEvent?.id === ev.id && (
                <span style={{ background: C.coral, color: C.white, fontSize: 11, fontWeight: 700,
                  padding: "2px 7px", borderRadius: 100 }}>{(runs[ev.id] || []).length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedBuildEvent && (
        <>
          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `2px solid ${C.gray200}` }}>
            {[
              { id: "runs", label: "Practice Runs", icon: <Timer size={15} />, count: currentRuns.length },
              { id: "images", label: "Design Photos", icon: <Camera size={15} />, count: currentImages.length },
              { id: "diagnostics", label: "AI Diagnostics", icon: <Brain size={15} />, count: diagnostics.issues.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px",
                  border: "none", borderBottom: activeTab === tab.id ? `3px solid ${C.coral}` : "3px solid transparent",
                  background: "transparent", color: activeTab === tab.id ? C.coral : C.gray400,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: -2 }}>
                {tab.icon} {tab.label}
                {tab.count > 0 && (
                  <span style={{ background: activeTab === tab.id ? C.coral : C.gray200,
                    color: activeTab === tab.id ? C.white : C.gray600,
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── PRACTICE RUNS TAB ─── */}
          {activeTab === "runs" && (
            <div>
              {/* Chart */}
              {currentRuns.length >= 2 && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                    📈 {getMetricLabel(selectedBuildEvent.id)} Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      {selectedBuildEvent.id === 12 && <>
                        <Line type="monotone" dataKey="efficiency" stroke={C.coral} strokeWidth={2.5} name="Efficiency" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="mass" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Mass (g)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 13 && <>
                        <Line type="monotone" dataKey="flightTime" stroke={C.coral} strokeWidth={2.5} name="Flight Time (s)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="mass" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Mass (g)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 16 && <>
                        <Line type="monotone" dataKey="error" stroke={C.coral} strokeWidth={2.5} name="Distance Error (cm)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="time" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Run Time (s)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 14 && <>
                        <Line type="monotone" dataKey="runTime" stroke={C.coral} strokeWidth={2.5} name="Run Time (s)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="accuracy" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 4" name="Accuracy (%)" dot={{ fill: C.teal, r: 3 }} />
                      </>}
                      {selectedBuildEvent.id === 15 && <>
                        <Line type="monotone" dataKey="actions" stroke={C.coral} strokeWidth={2.5} name="Completion (%)" dot={{ fill: C.coral, r: 4 }} />
                        <Line type="monotone" dataKey="completionTime" stroke={C.gold} strokeWidth={1.5} strokeDasharray="4 4" name="Time (s)" dot={{ fill: C.gold, r: 3 }} />
                      </>}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Add Run Button */}
              <button onClick={() => setShowAddRun(!showAddRun)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: showAddRun ? C.gray200 : C.coral, color: showAddRun ? C.navy : C.white,
                  fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                {showAddRun ? <XCircle size={16} /> : <Plus size={16} />}
                {showAddRun ? "Cancel" : "Log New Practice Run"}
              </button>

              {/* Add Run Form */}
              {showAddRun && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `2px solid ${C.coral}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.coral }}>
                    ✏️ Log Practice Run — {selectedBuildEvent.icon} {selectedBuildEvent.name}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {selectedBuildEvent.id === 12 && <>
                      <FormField label="Structure Mass (g)" value={newRun.mass} onChange={v => setNewRun({...newRun, mass: v})} placeholder="e.g. 14.2" />
                      <FormField label="Load Held (g)" value={newRun.loadHeld} onChange={v => setNewRun({...newRun, loadHeld: v})} placeholder="e.g. 8500" />
                      <FormField label="Contact Depth (cm)" value={newRun.contactDepth} onChange={v => setNewRun({...newRun, contactDepth: v})} placeholder="10, 15, or 20" />
                    </>}
                    {selectedBuildEvent.id === 13 && <>
                      <FormField label="Flight Time (seconds)" value={newRun.flightTime} onChange={v => setNewRun({...newRun, flightTime: v})} placeholder="e.g. 8.42" />
                      <FormField label="Mass (g)" value={newRun.mass} onChange={v => setNewRun({...newRun, mass: v})} placeholder="e.g. 3.2" />
                    </>}
                    {selectedBuildEvent.id === 14 && <>
                      <FormField label="Run Time (seconds)" value={newRun.runTime} onChange={v => setNewRun({...newRun, runTime: v})} placeholder="e.g. 4.32" />
                      <FormField label="Distance (m)" value={newRun.distance} onChange={v => setNewRun({...newRun, distance: v})} placeholder="e.g. 8.0" />
                      <FormField label="Accuracy (%)" value={newRun.accuracy} onChange={v => setNewRun({...newRun, accuracy: v})} placeholder="e.g. 92" />
                    </>}
                    {selectedBuildEvent.id === 15 && <>
                      <FormField label="Completion Time (s)" value={newRun.completionTime} onChange={v => setNewRun({...newRun, completionTime: v})} placeholder="e.g. 62" />
                      <FormField label="Actions Completed" value={newRun.actionsCompleted} onChange={v => setNewRun({...newRun, actionsCompleted: v})} placeholder="e.g. 8" />
                      <FormField label="Total Actions" value={newRun.totalActions} onChange={v => setNewRun({...newRun, totalActions: v})} placeholder="e.g. 10" />
                    </>}
                    {selectedBuildEvent.id === 16 && <>
                      <FormField label="Run Time (seconds)" value={newRun.runTime} onChange={v => setNewRun({...newRun, runTime: v})} placeholder="e.g. 2.84" />
                      <FormField label="Target Distance (cm)" value={newRun.targetDistance} onChange={v => setNewRun({...newRun, targetDistance: v})} placeholder="e.g. 750" />
                      <FormField label="Actual Distance (cm)" value={newRun.actualDistance} onChange={v => setNewRun({...newRun, actualDistance: v})} placeholder="e.g. 738" />
                    </>}
                    <FormField label="Design Version" value={newRun.designVersion} onChange={v => setNewRun({...newRun, designVersion: v})} placeholder="e.g. v3" />
                    <FormField label="Tags (comma-separated)" value={newRun.tags} onChange={v => setNewRun({...newRun, tags: v})} placeholder="e.g. crack, heavy" />
                    {selectedBuildEvent.id === 16 && (
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>Egg Intact?</label>
                        <select value={newRun.eggIntact || "true"} onChange={e => setNewRun({...newRun, eggIntact: e.target.value})}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
                            fontSize: 14, fontFamily: "inherit", background: C.white }}>
                          <option value="true">✅ Yes</option>
                          <option value="false">❌ No — Cracked</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>Notes</label>
                    <textarea value={newRun.notes || ""} onChange={e => setNewRun({...newRun, notes: e.target.value})}
                      placeholder="Describe what happened during this practice run..."
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.gray200}`,
                        fontSize: 14, fontFamily: "inherit", minHeight: 70, resize: "vertical" }} />
                  </div>
                  <button onClick={addNewRun}
                    style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.coral,
                      color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Save Practice Run
                  </button>
                </div>
              )}

              {/* Run List */}
              {currentRuns.map((run, idx) => (
                <div key={run.id} style={{ background: C.white, borderRadius: 14, padding: 0,
                  border: `1px solid ${C.gray200}`, marginBottom: 10, overflow: "hidden" }}>
                  {/* Run Header */}
                  <div onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10,
                      background: idx === 0 ? "#F5E2DC" : C.gray100,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: idx === 0 ? C.coral : C.gray400 }}>
                      #{currentRuns.length - idx}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{run.date} · {run.designVersion}</div>
                      <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
                        {run.notes?.slice(0, 80)}{(run.notes?.length || 0) > 80 ? "..." : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{getMetricValue(run, selectedBuildEvent.id)}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{getMetricLabel(selectedBuildEvent.id)}</div>
                    </div>
                    {run.tags?.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 120 }}>
                        {run.tags.slice(0, 2).map(tag => (
                          <span key={tag} style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600,
                            background: tag.includes("crack") || tag.includes("fail") || tag.includes("break") || tag.includes("egg-crack") ? "#FEF2F2" :
                              tag.includes("best") || tag.includes("stable") || tag.includes("accurate") || tag.includes("complete") ? "#E2F0E6" : C.goldLight,
                            color: tag.includes("crack") || tag.includes("fail") || tag.includes("break") || tag.includes("egg-crack") ? C.coral :
                              tag.includes("best") || tag.includes("stable") || tag.includes("accurate") || tag.includes("complete") ? C.tealDark : "#A0522D" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {expandedRun === run.id ? <ChevronUp size={16} color={C.gray400} /> : <ChevronDown size={16} color={C.gray400} />}
                  </div>

                  {/* Expanded Details */}
                  {expandedRun === run.id && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.gray100}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16, marginBottom: 14 }}>
                        {selectedBuildEvent.id === 12 && <>
                          <MiniStat label="Mass" value={`${run.mass}g`} />
                          <MiniStat label="Load Held" value={`${run.loadHeld}g`} />
                          <MiniStat label="Efficiency" value={run.efficiency?.toFixed(1)} highlight />
                          <MiniStat label="Contact Depth" value={`${run.contactDepth}cm`} />
                        </>}
                        {selectedBuildEvent.id === 13 && <>
                          <MiniStat label="Flight Time" value={`${run.flightTime}s`} highlight />
                          <MiniStat label="Mass" value={`${run.mass}g`} />
                        </>}
                        {selectedBuildEvent.id === 14 && <>
                          <MiniStat label="Run Time" value={`${run.runTime}s`} />
                          <MiniStat label="Distance" value={`${run.distance}m`} />
                          <MiniStat label="Accuracy" value={`${run.accuracy}%`} highlight />
                        </>}
                        {selectedBuildEvent.id === 15 && <>
                          <MiniStat label="Time" value={`${run.completionTime}s`} />
                          <MiniStat label="Actions" value={`${run.actionsCompleted}/${run.totalActions}`} highlight />
                        </>}
                        {selectedBuildEvent.id === 16 && <>
                          <MiniStat label="Run Time" value={`${run.runTime}s`} />
                          <MiniStat label="Target" value={`${run.targetDistance}cm`} />
                          <MiniStat label="Actual" value={`${run.actualDistance}cm`} />
                          <MiniStat label="Error" value={`${Math.abs(run.targetDistance - run.actualDistance)}cm`} highlight />
                          <MiniStat label="Egg" value={run.eggIntact ? "✅ Safe" : "❌ Cracked"} />
                        </>}
                      </div>
                      <div style={{ padding: "12px 14px", background: C.offWhite, borderRadius: 10, fontSize: 13, color: C.gray600 }}>
                        <strong style={{ color: C.navy }}>Notes:</strong> {run.notes}
                      </div>
                      {run.imageCount > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, color: C.teal, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <Camera size={14} /> {run.imageCount} photo{run.imageCount > 1 ? "s" : ""} attached
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {currentRuns.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>
                  <Timer size={32} color={C.gray200} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>No practice runs logged yet. Click "Log New Practice Run" to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── DESIGN IMAGES TAB ─── */}
          {activeTab === "images" && (
            <div>
              <button onClick={() => setShowAddImage(!showAddImage)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: showAddImage ? C.gray200 : C.navy, color: showAddImage ? C.navy : C.white,
                  fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
                {showAddImage ? <XCircle size={16} /> : <Camera size={16} />}
                {showAddImage ? "Cancel" : "Upload Design Photo"}
              </button>

              {showAddImage && (
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `2px solid ${C.navy}`, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📸 Upload Design Photo</h3>
                  <div style={{ border: `2px dashed ${C.gray200}`, borderRadius: 14, padding: "36px 20px",
                    textAlign: "center", marginBottom: 16, cursor: "pointer", background: C.offWhite }}
                    onClick={() => setShowAddImage(false)}>
                    <Image size={32} color={C.gray400} style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Click to upload photo</p>
                    <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>JPG, PNG — Take a photo of your build, design sketch, or test results</p>
                  </div>
                  <p style={{ fontSize: 12, color: C.gray400, padding: "8px 12px", background: C.goldLight, borderRadius: 8 }}>
                    <strong style={{ color: C.gold }}>Tip:</strong> Include multiple angles (side, top, detail of joints/mechanisms) for better AI analysis.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {currentImages.map(img => (
                  <div key={img.id} style={{ background: C.white, borderRadius: 14, overflow: "hidden",
                    border: `1px solid ${C.gray200}` }}>
                    {/* Placeholder for actual image */}
                    <div style={{ height: 160, background: `linear-gradient(135deg, ${C.gray100}, ${C.gray200})`,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <Camera size={28} color={C.gray400} />
                        <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>{img.version}</p>
                      </div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{img.name}</h4>
                      <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5 }}>{img.description}</p>
                      <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>{img.date}</p>
                    </div>
                  </div>
                ))}
              </div>

              {currentImages.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>
                  <Camera size={32} color={C.gray200} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>No design photos uploaded yet. Photos help the AI analyze your build.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── AI DIAGNOSTICS TAB ─── */}
          {activeTab === "diagnostics" && (
            <div>
              {diagnostics.issues.length === 0 && diagnostics.suggestions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}` }}>
                  <Brain size={40} color={C.gray200} style={{ marginBottom: 12 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Not Enough Data Yet</h3>
                  <p style={{ color: C.gray400, fontSize: 14 }}>
                    Log at least 2 practice runs to activate AI diagnostics. The more data you provide, the better the analysis.
                  </p>
                </div>
              ) : (
                <>
                  {/* Issues */}
                  {diagnostics.issues.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                        🤖 AI-Detected Issues
                      </h3>
                      {diagnostics.issues.map((issue, i) => (
                        <div key={i} style={{ display: "flex", gap: 14, padding: "16px 18px",
                          background: issue.severity === "high" ? "#FEF2F2" : issue.severity === "medium" ? C.goldLight : C.offWhite,
                          borderRadius: 12, marginBottom: 10,
                          border: `1px solid ${issue.severity === "high" ? "#FECACA" : issue.severity === "medium" ? "#FDE68A" : C.gray200}` }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{issue.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4,
                              color: issue.severity === "high" ? C.coral : issue.severity === "medium" ? "#A0522D" : C.navy }}>
                              {issue.area}
                            </div>
                            <p style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>{issue.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {diagnostics.suggestions.length > 0 && (
                    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                        💡 Recommendations
                      </h3>
                      {diagnostics.suggestions.map((sug, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px",
                          background: i === 0 ? C.goldLight : C.offWhite, borderRadius: 10, marginBottom: 8,
                          fontSize: 13, color: C.gray600, lineHeight: 1.6, alignItems: "flex-start" }}>
                          <span style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                            background: i === 0 ? C.gold : C.gray200, color: i === 0 ? C.white : C.gray600 }}>
                            {i + 1}
                          </span>
                          {sug}
                        </div>
                      ))}

                      <div style={{ marginTop: 16, padding: "14px 16px", background: "#E2F0E6", borderRadius: 10,
                        border: "1px solid #BBF7D0", fontSize: 13, color: C.tealDark }}>
                        <strong>Pro tip:</strong> Upload photos of your build from multiple angles. In production, the AI can analyze structural geometry, identify weak points, and compare your design to proven competition-winning approaches.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Small helper components for Build Log ───
function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.gray600 }}>{label}</label>
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`,
          fontSize: 14, fontFamily: "inherit", background: C.white }} />
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div style={{ padding: "10px 12px", background: highlight ? "#F5E2DC" : C.gray100, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: highlight ? C.coral : C.navy, marginTop: 2 }}>{value}</div>
    </div>
  );
}