import { useState, useEffect, useCallback, memo } from 'react';
import { ArrowLeft, Trophy, RotateCcw, ChevronRight, Timer, Zap } from 'lucide-react';
import Breadcrumbs from '../shared/Breadcrumbs';
import { useNavigate } from 'react-router-dom';
import { C } from '../../ui';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import {
  CIPHER_TYPES,
  CIPHER_LABELS,
  getRandomPlaintext,
  generateShuffledKey,
  encryptSubstitution,
  encodeToMorse,
  encodeBaconian,
  columnarEncrypt,
  getColumnarKeywords,
} from './cipherUtils';
import AristocratDrill from './AristocratDrill';
import MorseDrill from './MorseDrill';
import BaconianDrill from './BaconianDrill';
import ColumnarDrill from './ColumnarDrill';

// ─── Constants ────────────────────────────────────────────────────────────────
const CIPHER_COLOR = '#7C3AED';
const CIPHER_LIGHT = '#EDE9FE';
const CIPHER_MID   = '#A78BFA';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const CIPHER_DESCRIPTIONS = {
  aristocrat:   'Monoalphabetic substitution with word spaces preserved.',
  patristocrat: 'Monoalphabetic substitution in 5-letter groups (no word breaks).',
  morse:        'Dots and dashes — decode or encode a message.',
  baconian:     '5-bit A/B encoding. Each letter maps to a 5-character code.',
  columnar:     'Letters are written in rows and read out by column order.',
};

// ─── Puzzle Generator ─────────────────────────────────────────────────────────
function generatePuzzle(type, difficulty) {
  const plaintext = getRandomPlaintext(difficulty);

  if (type === 'aristocrat') {
    const { encryptMap, decryptMap } = generateShuffledKey();
    const ciphertext = encryptSubstitution(plaintext, encryptMap);
    return { plaintext, ciphertext, encryptMap, decryptMap, showSpaces: true };
  }

  if (type === 'patristocrat') {
    const { encryptMap, decryptMap } = generateShuffledKey();
    const ciphertext = encryptSubstitution(plaintext, encryptMap);
    return { plaintext, ciphertext, encryptMap, decryptMap, showSpaces: false };
  }

  if (type === 'morse') {
    const mode = Math.random() < 0.5 ? 'decode' : 'encode';
    const ciphertext = encodeToMorse(plaintext);
    return { plaintext, ciphertext, mode };
  }

  if (type === 'baconian') {
    const ciphertext = encodeBaconian(plaintext);
    return { plaintext, ciphertext };
  }

  if (type === 'columnar') {
    const keywords = getColumnarKeywords();
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    const ciphertext = columnarEncrypt(plaintext, keyword);
    return { plaintext, ciphertext, keyword };
  }

  return { plaintext, ciphertext: plaintext };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ─── CipherTab ────────────────────────────────────────────────────────────────
// memo: only re-renders when its own type becomes selected/deselected
const CipherTab = memo(function CipherTab({ type, selected, onClick }) {
  const isActive = type === selected;
  return (
    <button
      onClick={() => onClick(type)}
      style={{
        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: isActive ? CIPHER_COLOR : C.gray100,
        color: isActive ? C.white : C.gray600,
        fontSize: 13, fontWeight: isActive ? 700 : 500, fontFamily: 'inherit',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {CIPHER_LABELS[type]}
    </button>
  );
});

// ─── StatsBar ─────────────────────────────────────────────────────────────────
// Owns its own timer interval so the parent never re-renders from ticks.
// memo: re-renders only when solved/correct/streak change, or session restarts.
const StatsBar = memo(function StatsBar({ solved, correct, streak, sessionStartMs }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionStartMs) { setElapsed(0); return; }
    // Sync immediately, then tick every 500 ms
    setElapsed(Date.now() - sessionStartMs);
    const id = setInterval(() => setElapsed(Date.now() - sessionStartMs), 500);
    return () => clearInterval(id);
  }, [sessionStartMs]);

  const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
  const stats = [
    { label: 'Solved',   value: solved,           color: C.teal },
    { label: 'Correct',  value: correct,           color: '#22C55E' },
    { label: 'Accuracy', value: `${accuracy}%`,    color: accuracy >= 80 ? C.teal : accuracy >= 60 ? C.gold : C.coral },
    { label: 'Streak',   value: `🔥 ${streak}`,   color: C.gold },
    { label: 'Time',     value: formatTime(elapsed), color: C.gray600 },
  ];

  return (
    <div style={{
      display: 'flex', gap: 0, background: C.white, borderRadius: 12,
      border: `1px solid ${C.gray200}`, overflow: 'hidden', marginBottom: 20,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1, padding: '10px 0', textAlign: 'center',
          borderRight: i < stats.length - 1 ? `1px solid ${C.gray100}` : 'none',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 11, color: C.gray400, fontWeight: 500, marginTop: 1 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
});

// ─── TimerBadge ───────────────────────────────────────────────────────────────
// Small timer in the active drill header — also self-contained so no parent re-renders.
const TimerBadge = memo(function TimerBadge({ sessionStartMs }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!sessionStartMs) return;
    setElapsed(Date.now() - sessionStartMs);
    const id = setInterval(() => setElapsed(Date.now() - sessionStartMs), 500);
    return () => clearInterval(id);
  }, [sessionStartMs]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: CIPHER_COLOR, fontWeight: 700, fontSize: 13 }}>
      <Timer size={14} /> {formatTime(elapsed)}
    </div>
  );
});

// ─── ResultsScreen ────────────────────────────────────────────────────────────
const ResultsScreen = memo(function ResultsScreen({ solved, correct, elapsed, onRestart }) {
  const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
  const grade = accuracy >= 90 ? { emoji: '🏆', label: 'Excellent!', color: C.teal } :
                accuracy >= 75 ? { emoji: '⭐', label: 'Great Work!', color: C.gold } :
                accuracy >= 60 ? { emoji: '👍', label: 'Good Job!',  color: '#F59E0B' } :
                                 { emoji: '📚', label: 'Keep Practicing', color: C.coral };

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 12 }}>{grade.emoji}</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: grade.color, marginBottom: 6 }}>
        {grade.label}
      </h2>
      <p style={{ color: C.gray600, fontSize: 15, marginBottom: 28 }}>
        Session complete — here&apos;s how you did:
      </p>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
        {[
          { label: 'Ciphers Solved', value: solved, color: CIPHER_COLOR },
          { label: 'Correct',        value: correct, color: '#22C55E' },
          { label: 'Accuracy',       value: `${accuracy}%`, color: grade.color },
          { label: 'Total Time',     value: formatTime(elapsed), color: C.gray600 },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 12, padding: '16px 20px', minWidth: 90,
            border: `1px solid ${C.gray200}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        style={{
          padding: '14px 32px', borderRadius: 12, border: 'none',
          background: CIPHER_COLOR, color: C.white,
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <RotateCcw size={16} /> New Session
      </button>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CipherDrillPage() {
  const navigate = useNavigate();
  const { event: ev } = useCurrentEvent();

  // ── Settings ──────────────────────────────────────────────────────────────
  const [selectedType,       setSelectedType]       = useState('aristocrat');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  // ── Session tracking ──────────────────────────────────────────────────────
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionDone,    setSessionDone]    = useState(false);
  const [solved,    setSolved]    = useState(0);
  const [correct,   setCorrect]   = useState(0);
  const [streak,    setStreak]    = useState(0);
  // sessionStartMs drives both StatsBar and TimerBadge; no interval in parent
  const [sessionStartMs, setSessionStartMs] = useState(null);
  const [finalElapsed,   setFinalElapsed]   = useState(0);

  // ── Current puzzle ────────────────────────────────────────────────────────
  const [puzzle, setPuzzle] = useState(null);

  const nextPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle(selectedType, selectedDifficulty));
  }, [selectedType, selectedDifficulty]);

  const startSession = useCallback(() => {
    setSolved(0); setCorrect(0); setStreak(0);
    setSessionDone(false);
    setSessionStartMs(Date.now());
    setFinalElapsed(0);
    setPuzzle(generatePuzzle(selectedType, selectedDifficulty));
    setSessionStarted(true);
  }, [selectedType, selectedDifficulty]);

  const endSession = useCallback(() => {
    setFinalElapsed(sessionStartMs ? Date.now() - sessionStartMs : 0);
    setSessionStartMs(null); // stops timer ticking in StatsBar / TimerBadge
    setSessionDone(true);
  }, [sessionStartMs]);

  const restartSession = useCallback(() => {
    setSessionStartMs(null);
    setSessionStarted(false);
    setSessionDone(false);
    setPuzzle(null);
  }, []);

  const handleSolve = useCallback((wasCorrect) => {
    setSolved(s => s + 1);
    if (wasCorrect) {
      setCorrect(c => c + 1);
      setStreak(st => st + 1);
    } else {
      setStreak(0);
    }
    setTimeout(() => nextPuzzle(), 800);
  }, [nextPuzzle]);

  const handleSkip = useCallback(() => {
    setSolved(s => s + 1);
    setStreak(0);
    nextPuzzle();
  }, [nextPuzzle]);

  // ── Render: session results ────────────────────────────────────────────────
  const breadcrumbs = ev ? [
    { label: "Events", path: "/events" },
    { label: `${ev.icon} ${ev.name}`, path: `/events/${ev.id}` },
    { label: "Cipher Drills" },
  ] : [{ label: "Events", path: "/events" }, { label: "Cipher Drills" }];

  if (sessionDone) {
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <ResultsScreen
          solved={solved}
          correct={correct}
          elapsed={finalElapsed}
          onRestart={restartSession}
        />
      </div>
    );
  }

  // ── Render: active drill ──────────────────────────────────────────────────
  if (sessionStarted && puzzle) {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Breadcrumbs items={breadcrumbs} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TimerBadge sessionStartMs={sessionStartMs} />
            <button onClick={endSession}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'none',
                color: C.gray600, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              End Session
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          🔐 Cipher Drills
          <span style={{ fontSize: 14, fontWeight: 500, color: CIPHER_MID, marginLeft: 10 }}>
            {CIPHER_LABELS[selectedType]} · {selectedDifficulty}
          </span>
        </h2>

        {/* Stats bar — self-contained timer, isolated from parent re-renders */}
        <StatsBar
          solved={solved}
          correct={correct}
          streak={streak}
          sessionStartMs={sessionStartMs}
        />

        {/* Drill component — key forces remount only on new puzzle */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          {(selectedType === 'aristocrat' || selectedType === 'patristocrat') && (
            <AristocratDrill
              key={puzzle.ciphertext}
              ciphertext={puzzle.ciphertext}
              plaintext={puzzle.plaintext}
              encryptMap={puzzle.encryptMap}
              decryptMap={puzzle.decryptMap}
              onSolve={handleSolve}
              onSkip={handleSkip}
              showSpaces={puzzle.showSpaces}
            />
          )}
          {selectedType === 'morse' && (
            <MorseDrill
              key={puzzle.ciphertext}
              mode={puzzle.mode}
              ciphertext={puzzle.ciphertext}
              plaintext={puzzle.plaintext}
              onSolve={handleSolve}
              onSkip={handleSkip}
            />
          )}
          {selectedType === 'baconian' && (
            <BaconianDrill
              key={puzzle.ciphertext}
              ciphertext={puzzle.ciphertext}
              plaintext={puzzle.plaintext}
              onSolve={handleSolve}
              onSkip={handleSkip}
            />
          )}
          {selectedType === 'columnar' && (
            <ColumnarDrill
              key={puzzle.ciphertext}
              ciphertext={puzzle.ciphertext}
              plaintext={puzzle.plaintext}
              keyword={puzzle.keyword}
              onSolve={handleSolve}
              onSkip={handleSkip}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Render: configuration screen ──────────────────────────────────────────
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        🔐 Cipher Drills {ev ? `— ${ev.icon} ${ev.name}` : ''}
      </h2>
      <p style={{ color: C.gray600, fontSize: 14, marginBottom: 28 }}>
        Practice all five Science Olympiad Codebusters cipher types.
      </p>

      {/* Cipher type selector */}
      <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Cipher Type
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CIPHER_TYPES.map(type => (
            <CipherTab key={type} type={type} selected={selectedType} onClick={setSelectedType} />
          ))}
        </div>
        <div style={{
          padding: '10px 14px', background: CIPHER_LIGHT, borderRadius: 10,
          fontSize: 13, color: CIPHER_COLOR, fontWeight: 500,
        }}>
          {CIPHER_DESCRIPTIONS[selectedType]}
        </div>
      </div>

      {/* Difficulty selector */}
      <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Difficulty
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {DIFFICULTIES.map(d => {
            const isActive = d === selectedDifficulty;
            const meta = {
              easy:   { emoji: '🟢', label: 'Easy',   desc: 'Short phrases (3–5 words)' },
              medium: { emoji: '🟡', label: 'Medium', desc: 'Longer sentences (6–12 words)' },
              hard:   { emoji: '🔴', label: 'Hard',   desc: 'Complex, long sentences (13+ words)' },
            }[d];
            return (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                style={{
                  flex: 1, padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${isActive ? CIPHER_COLOR : C.gray200}`,
                  background: isActive ? CIPHER_LIGHT : C.white,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{meta.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? CIPHER_COLOR : C.navy }}>{meta.label}</div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{meta.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* What to expect */}
      <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}`, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          What to expect
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '⏱', text: 'A running timer tracks your session.' },
            { icon: '🔑', text: `Each puzzle is a randomly generated ${CIPHER_LABELS[selectedType]} cipher.` },
            { icon: '💡', text: selectedType === 'aristocrat' || selectedType === 'patristocrat'
                ? 'Hints reveal one letter mapping (up to 3 per puzzle).'
                : 'A reference table is available during the drill.' },
            { icon: '📊', text: 'Session stats update live — accuracy, streak, and solve count.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: C.gray600 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startSession}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: CIPHER_COLOR, color: C.white, fontSize: 16, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: `0 4px 20px ${CIPHER_COLOR}44`, transition: 'all 0.15s',
        }}
      >
        <Zap size={18} />
        Start Drill — {CIPHER_LABELS[selectedType]} · {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
        <ChevronRight size={18} />
      </button>

      <div style={{ textAlign: 'center', marginTop: 16, color: C.gray400, fontSize: 12 }}>
        <Trophy size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Aim for 80%+ accuracy to hit Codebusters competition readiness
      </div>
    </div>
  );
}
