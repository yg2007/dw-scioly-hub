import { memo, useState, useMemo } from 'react';
import { C } from '../../ui';
import { Grid3x3 } from 'lucide-react';

const CIPHER_COLOR = '#7C3AED';
const CIPHER_LIGHT = '#EDE9FE';

export default memo(function ColumnarDrill({ ciphertext, plaintext, keyword, onSolve, onSkip }) {
  const [answer, setAnswer] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());

  const handleCheckAnswer = () => {
    const normalize = (str) => str.toUpperCase().replace(/[^A-Z]/g, '');
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

  // Memoized column order — only recomputes when keyword changes
  const { columnOrder, cols, rows } = useMemo(() => {
    const keywordWithIndex = keyword.split('').map((char, idx) => ({ char, idx }));
    const sorted = [...keywordWithIndex].sort((a, b) => a.char.localeCompare(b.char));
    const order = sorted.map(item => ({
      originalIdx: item.idx,
      order: sorted.findIndex(s => s.idx === item.idx) + 1,
    }));
    const c = keyword.length;
    const r = Math.ceil(ciphertext.length / c);
    return { columnOrder: order, cols: c, rows: r };
  }, [keyword, ciphertext.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header info */}
      <div
        style={{
          background: C.white,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${C.gray200}`,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: C.gray600, marginBottom: 8 }}>
            <strong>Keyword:</strong> <span style={{ fontFamily: 'monospace', fontSize: 16 }}>{keyword}</span>
          </p>
          <p style={{ fontSize: 14, color: C.gray600 }}>
            <strong>Message length:</strong> {ciphertext.length} characters
          </p>
          <p style={{ fontSize: 14, color: C.gray600, marginTop: 8 }}>
            <strong>Grid:</strong> {rows} rows × {cols} columns
          </p>
        </div>

        {/* Column order hint */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.gray200}` }}>
          <p style={{ fontSize: 14, fontWeight: '600', color: C.gray900, marginBottom: 12 }}>
            Column Reading Order (Alphabetical):
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {columnOrder.map((col, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: CIPHER_LIGHT,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: CIPHER_COLOR,
                  }}
                >
                  {keyword[col.originalIdx]}
                </div>
                <div style={{ fontSize: 12, color: C.gray600, fontWeight: '600' }}>
                  {col.order}
                </div>
              </div>
            ))}
          </div>
        </div>
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
          Encrypted Message
        </h3>
        <div
          style={{
            padding: 20,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: '600',
            color: C.gray900,
            wordBreak: 'break-all',
            minHeight: 80,
            lineHeight: 1.8,
          }}
        >
          {ciphertext}
        </div>
      </div>

      {/* Grid toggle */}
      <button
        onClick={() => setShowGrid(!showGrid)}
        style={{
          padding: '10px 16px',
          backgroundColor: showGrid ? CIPHER_COLOR : C.gray200,
          color: showGrid ? C.white : C.gray900,
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
        <Grid3x3 size={16} />
        {showGrid ? 'Hide' : 'Show'} Reconstruction Grid
      </button>

      {/* Reconstruction grid */}
      {showGrid && (
        <div
          style={{
            background: C.white,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${C.gray200}`,
          }}
        >
          <h4 style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: C.gray900 }}>
            Columnar Transposition Grid
          </h4>
          <p style={{ fontSize: 12, color: C.gray600, marginBottom: 16 }}>
            Use this grid to help visualize how the message is arranged. Fill in the ciphertext reading down each column in the order shown above.
          </p>
          <div
            style={{
              display: 'inline-block',
              border: `2px solid ${C.gray300}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {Array(rows)
              .fill(null)
              .map((_, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex' }}>
                  {Array(cols)
                    .fill(null)
                    .map((_, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        style={{
                          width: 48,
                          height: 48,
                          border: `1px solid ${C.gray300}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: rowIdx === 0 ? CIPHER_LIGHT : C.white,
                          fontWeight: rowIdx === 0 ? '600' : '400',
                          color: rowIdx === 0 ? CIPHER_COLOR : C.gray400,
                          fontSize: 12,
                        }}
                      >
                        {rowIdx === 0 ? keyword[colIdx] : '·'}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </div>
      )}

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
          placeholder="Type the decrypted message..."
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
          {isCorrect ? '✓ Correct! Brilliant work!' : '✗ Not quite right. Try again!'}
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
