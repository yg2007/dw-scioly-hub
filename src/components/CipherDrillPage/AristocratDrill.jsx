import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { C } from '../../ui';
import { getLetterFrequencies } from './cipherUtils';
import { HelpCircle, RotateCcw } from 'lucide-react';

const CIPHER_COLOR = '#7C3AED';
const CIPHER_LIGHT = '#EDE9FE';

// memo: parent's timer ticks won't re-render this component since it receives no
// time-related props. Only re-mounts when the key (puzzle.ciphertext) changes.
export default memo(function AristocratDrill({
  ciphertext,
  plaintext,
  encryptMap,
  decryptMap,
  onSolve,
  onSkip,
  showSpaces = true,
}) {
  const [letterMap, setLetterMap] = useState({});
  const [selectedCipher, setSelectedCipher] = useState(null);
  const [showFreq, setShowFreq] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime] = useState(Date.now());

  // Stable formatted ciphertext — only recomputes if ciphertext or showSpaces changes
  const displayText = useMemo(() => {
    if (showSpaces) return ciphertext;
    const cleanText = ciphertext.replace(/\s/g, '');
    let formatted = '';
    for (let i = 0; i < cleanText.length; i++) {
      if (i > 0 && i % 5 === 0) formatted += ' ';
      formatted += cleanText[i];
    }
    return formatted;
  }, [ciphertext, showSpaces]);

  // Frequency data — only recomputes if ciphertext changes (not on every keystroke)
  const { frequencySorted, maxFreq } = useMemo(() => {
    const frequencies = getLetterFrequencies(ciphertext.toUpperCase());
    const sorted = Object.entries(frequencies)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    return { frequencySorted: sorted, maxFreq: sorted[0]?.[1] || 1 };
  }, [ciphertext]);

  // Stable keyboard handler — rebuilds only when selectedCipher changes
  const handleKeyDown = useCallback((e) => {
    if (!selectedCipher) return;
    const key = e.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();
      setLetterMap(prev => ({ ...prev, [selectedCipher]: key }));
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setLetterMap(prev => ({ ...prev, [selectedCipher]: '' }));
    }
  }, [selectedCipher]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getDecodedText = useCallback(() => {
    return displayText
      .split('')
      .map(char => (/[A-Z]/.test(char) ? letterMap[char] || '_' : char))
      .join('');
  }, [displayText, letterMap]);

  const handleCheckAnswer = useCallback(() => {
    const studentAnswer = displayText
      .split('')
      .map(char => letterMap[char] || '')
      .filter(c => /[A-Z]/.test(c))
      .join('');
    const expectedAnswer = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    const correct = studentAnswer === expectedAnswer;
    setIsCorrect(correct);
    setChecked(true);
    if (correct) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setTimeout(() => onSolve(elapsed), 500);
    }
  }, [displayText, letterMap, plaintext, startTime, onSolve]);

  const handleRevealLetter = useCallback(() => {
    if (hintsUsed >= 3) return;
    const unmapped = displayText
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .split('')
      .find(c => !letterMap[c]);
    if (unmapped) {
      setLetterMap(prev => ({ ...prev, [unmapped]: decryptMap[unmapped] }));
      setHintsUsed(h => h + 1);
    }
  }, [hintsUsed, displayText, letterMap, decryptMap]);

  // Character cell renderer — inline, fine since it's called in a .map() within the render
  const renderCharacter = (char, index) => {
    if (!/[A-Z]/.test(char)) {
      return (
        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: C.gray600 }}>{char === ' ' ? '·' : char}</span>
        </div>
      );
    }

    const isSelected = selectedCipher === char;
    const guess = letterMap[char] || '';
    let bgColor = isSelected ? CIPHER_LIGHT : C.white;
    let borderColor = isSelected ? CIPHER_COLOR : C.gray300;

    if (checked && guess) {
      const isCorrectLetter = decryptMap[char] === guess;
      bgColor = isCorrectLetter ? '#DCFCE7' : '#FEE2E2';
      borderColor = isCorrectLetter ? '#16A34A' : '#DC2626';
    }

    return (
      <div
        key={index}
        onClick={() => setSelectedCipher(char)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          cursor: 'pointer', padding: 8, borderRadius: 8,
          backgroundColor: bgColor, border: `2px solid ${borderColor}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 'bold', color: C.gray600, height: 16 }}>{char}</div>
        <input
          type="text"
          maxLength="1"
          value={guess}
          onChange={e => setLetterMap(prev => ({ ...prev, [char]: e.target.value.toUpperCase() }))}
          onClick={e => { e.stopPropagation(); setSelectedCipher(char); }}
          style={{
            width: 32, height: 32, textAlign: 'center', fontSize: 14, fontWeight: 'bold',
            border: `1px solid ${C.gray300}`, borderRadius: 4, padding: 4,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Challenge card */}
      <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
        <h3 style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: C.gray900 }}>
          Encrypted Message
        </h3>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16,
          backgroundColor: '#F9FAFB', borderRadius: 12, minHeight: 100, alignContent: 'flex-start',
        }}>
          {displayText.split('').map((char, idx) => renderCharacter(char, idx))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowFreq(v => !v)}
          style={{
            padding: '10px 16px', backgroundColor: showFreq ? CIPHER_COLOR : C.gray200,
            color: showFreq ? C.white : C.gray900, border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 14, fontWeight: '500',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <HelpCircle size={16} /> Frequency Analysis
        </button>

        <button
          onClick={handleRevealLetter}
          disabled={hintsUsed >= 3}
          style={{
            padding: '10px 16px',
            backgroundColor: hintsUsed >= 3 ? C.gray200 : '#F59E0B',
            color: C.white, border: 'none', borderRadius: 8,
            cursor: hintsUsed >= 3 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: '500', opacity: hintsUsed >= 3 ? 0.5 : 1,
          }}
        >
          Reveal Letter ({3 - hintsUsed} left)
        </button>
      </div>

      {/* Frequency analysis */}
      {showFreq && (
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
          <h4 style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: C.gray900 }}>
            Letter Frequency in Ciphertext
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {frequencySorted.map(([letter, count]) => (
              <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 30, fontWeight: 'bold', color: C.gray700 }}>{letter}</div>
                <div style={{ flex: 1, height: 24, backgroundColor: C.gray200, borderRadius: 4, position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${(count / maxFreq) * 100}%`,
                    backgroundColor: CIPHER_COLOR, borderRadius: 4, transition: 'width 0.2s',
                  }} />
                </div>
                <div style={{ width: 40, textAlign: 'right', color: C.gray600, fontSize: 12 }}>{count}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: C.gray600, fontStyle: 'italic' }}>
            Tip: E, T, A, O are the most common letters in English.
          </p>
        </div>
      )}

      {/* Feedback */}
      {checked && (
        <div style={{
          padding: 16, borderRadius: 12,
          backgroundColor: isCorrect ? '#DCFCE7' : '#FEE2E2',
          border: `1px solid ${isCorrect ? '#16A34A' : '#DC2626'}`,
          color: isCorrect ? '#166534' : '#991B1B', fontSize: 14, fontWeight: '500',
        }}>
          {isCorrect ? '✓ Correct! Great work!' : '✗ Not quite right. Try again!'}
        </div>
      )}

      {/* Decoded preview */}
      {Object.keys(letterMap).length > 0 && !checked && (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, fontSize: 13, color: C.gray600, fontFamily: 'monospace' }}>
          <strong style={{ color: C.teal }}>Decoding so far:</strong> {getDecodedText()}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleCheckAnswer}
          style={{
            flex: 1, padding: '12px 24px', backgroundColor: CIPHER_COLOR, color: C.white,
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: '600',
          }}
        >
          Check Answer
        </button>
        <button
          onClick={onSkip}
          style={{
            flex: 1, padding: '12px 24px', backgroundColor: C.gray200, color: C.gray900,
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: '600',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
});
