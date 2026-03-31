import { memo, useState } from 'react';
import { C } from '../../ui';
import { BACONIAN } from './cipherUtils';
import { BookOpen } from 'lucide-react';

const CIPHER_COLOR = '#7C3AED';
const CIPHER_LIGHT = '#EDE9FE';

// Pre-computed at module load — stable across all renders
const BACONIAN_ALPHA = Object.entries(BACONIAN).slice(0, 26);

export default memo(function BaconianDrill({ ciphertext, plaintext, onSolve, onSkip }) {
  const [answer, setAnswer] = useState('');
  const [showRef, setShowRef] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());

  const handleCheckAnswer = () => {
    const normalize = (str) => str.toUpperCase().trim().replace(/\s+/g, ' ');
    const expected = normalize(plaintext);
    const studentAnswer = normalize(answer);

    const correct = studentAnswer === expected;
    setIsCorrect(correct);
    setChecked(true);

    if (correct) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setTimeout(() => onSolve(elapsed), 500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          Baconian Encoded Message
        </h3>
        <div
          style={{
            padding: 20,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: '600',
            color: C.gray900,
            wordBreak: 'break-word',
            minHeight: 100,
            lineHeight: 1.8,
            overflowX: 'auto',
          }}
        >
          {ciphertext}
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
          placeholder="Type the decoded message..."
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
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
        {showRef ? 'Hide' : 'Show'} Baconian Reference
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
            Baconian Cipher Reference (26-Letter Alphabet)
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
            }}
          >
            {BACONIAN_ALPHA.map(([char, code]) => (
              <div
                key={char}
                style={{
                  padding: 12,
                  backgroundColor: CIPHER_LIGHT,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 'bold', color: CIPHER_COLOR, minWidth: 30 }}>
                  {char} =
                </span>
                <span style={{ color: C.gray700 }}>{code}</span>
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
          {isCorrect ? '✓ Correct! Fantastic!' : '✗ Not quite right. Try again!'}
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
