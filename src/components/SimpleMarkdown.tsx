import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono"
          style={{
            fontSize: '0.9em',
            padding: '1px 5px',
            borderRadius: 4,
            background: 'var(--bg-well)',
          }}
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

export function SimpleMarkdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {blocks.map((block, idx) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        if (lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))) {
          return (
            <ul key={idx} style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }

        return (
          <div key={idx} style={{ lineHeight: 1.58 }}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l)}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
