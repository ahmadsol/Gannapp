import React from 'react';
import { gannBookChapters } from './GannHelp';

const GannRulesSection = () => {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>W.D. Gann’s Trading Rules & Principles</h1>
      {gannBookChapters.map((chapter, idx) => (
        <details key={chapter.chapter} open={idx === 0} style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafbfc' }}>
          <summary style={{ fontSize: 22, fontWeight: 600, padding: '12px 20px', cursor: 'pointer', background: '#f5f7fa', borderRadius: '8px 8px 0 0' }}>{chapter.chapter}</summary>
          <div style={{ padding: '20px 28px' }}>
            {chapter.sections.map((section, sidx) => (
              <div key={section.title} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, color: '#2c3e50', margin: '16px 0 8px 0' }}>{section.title}</h3>
                <div style={{ fontSize: 15, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{section.content}</div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

export default GannRulesSection; 