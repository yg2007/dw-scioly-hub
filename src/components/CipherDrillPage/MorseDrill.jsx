import { memo, useState } from 'react';
import { C } from '../../ui';
import { MORSE_CODE } from './cipherUtils';
import { BookOpen } from 'lucide-react';

const CIPHER_COLOR = '#7C3AED';
const CIPHER_LIGHT = '#EDE9FE';

// Pre-computed at module load — never changes, no need to recompute on render
const MORSE_CODES_LIST = Object.entries(MORSE_CODE).filter(([char]) => /[A-Z0-9]/.test(char));

export default memo(function MorseDrill({ mode = 'decode', ciphertext, plaintext, onSolve, onSkip }) {
  const [answer, setAnswer] = useState('');
  const [showRef, setShowRef] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [startTime] = useState(Date.now());

  const handleCheckAnswer = () => {
    const normalize = (str) => str.toUpperCase().trim().replace(/\s+/g, ' ');

    let expected = '';
    let studentAnswer = answer;

    if (currentMode === 'decode') {
      expected = normalize(plaintext);
      studentAnswer = normalize(studentAnswer);
    } else {
      expected = normalize(ciphertext);
      studentAnswer = normalize(studentAnswer);
    }

    const correct = studentAnswer === expected;
    setIsCorrect(correct);
    setChecked(true);

    if (correct) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setTimeout(() => onSolve(elapsed), 500);
    }
  };

  const handleModeChange = (newMode) => {
    setCurrentMode(newMode);
    setAnswer('');
    setChecked(false);
    setIsCorrect(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => handleModeChange('decode')}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: currentMode === 'decode' ? CIPHER_COLOR : C.gray200,
            color: currentMode === 'decode' ? C.white : C.gray900,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: '600',
            transition: 'all 0.2s',
          }}
        >
          📍 Decode Morse → Text
        </button>
        <button
          onClick={() => handleModeChange('encode')}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: currentMode === 'encode' ? CIPHER_COLOR : C.gray200,
            color: currentMode === 'encode' ? C.white : C.gray900,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: '600',
            transition: 'all 0.2s',
          }}
        >
          📤 Encode Text → Morse
        </button>
      </div>

      {/* Challenge display */}
      <div
        style={{
          background: C.white,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${C.gray200}`,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: C.gray900 }}>
          {currentMode === 'decode' ? 'Morse Code to Decode' : 'Text to Encode'}
        </h3>
        <div
          style={{
            padding: 20,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            fontFamily: currentMode === 'decode' ? 'monospace' : 'inherit',
            fontSize: currentMode === 'decode' ? 16 : 18,
            fontWeight: '600',
            color: C.gray900,
            wordBreak: 'break-word',
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {currentMode === 'decode' ? ciphertext : plaintext}
        </div>
      </div>

      {/* Answer input */}
      <div
        style={{
          background: C.white,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${C.gray200}`,
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 12,
            color: C.gray900,
          }}
        >
          Your Answer:
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            currentMode === 'decode'
              ? 'Type the plain text message...'
              : 'Type the morse code (letters and / for word breaks)...'
          }
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            fontFamily: currentMode === 'encode' ? 'monospace' : 'inherit',
            border: `2px solid ${C.gray300}`,
            borderRadius: 8,
            outline: 'none',
            resize: 'vertical',
            minHeight: 80,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Reference toggle */}
      <button
        onClick={() => setShowRef(!showRef)}
        style={{
          padding: '10px 16px',
          backgroundColor: showRef ? CIPHER_COLOR : C.gray200,
          color: showRef ? C.white : C.gray900,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        <BookOpen size={16} />
        {showRef ? 'Hide' : 'Show'} Morse Reference
      </button>

      {/* Reference table */}
      {showRef && (
        <div
          style={{
            background: C.white,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${C.gray200}`,
          }}
        >
          <h4 style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: C.gray900 }}>
            Morse Code Reference
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 12,
            }}
          >
            {MORSE_CODES_LIST.map(([char, code]) => (
              <div
                key={char}
                style={{
                  padding: 12,
                  backgroundColor: CIPHER_LIGHT,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 'bold', color: CIPHER_COLOR, marginBottom: 4 }}>
                  {char}
                </div>
                <div style={{ color: C.gray700 }}>{code}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {checked && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: isCorrect ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${isCorrect ? '#16A34A' : '#DC2626'}`,
            color: isCorrect ? '#166534' : '#991B1B',
            fontSize: 14,
            fontWeight: '500',
          }}
        >
          {isCorrect ? '✓ Correct! Excellent work!' : '✗ Not quite right. Try again!'}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleCheckAnswer}
          style={{
            flex: 1,
            padding: '12px 24px',
            backgroundColor: CIPHER_COLOR,
            color: C.white,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          Check Answer
        </button>
        <button
          onClick={onSkip}
          style={{
            flex: 1,
            padding: '12px 24px',
            backgroundColor: C.gray200,
            color: C.gray900,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
});
