import React from 'react';

interface ChartPanelProps {
  supportResistance: { label: string; value: number }[];
  patterns: { patterns: string[]; signals: string[] };
}

const ChartPanel: React.FC<ChartPanelProps> = ({ supportResistance, patterns }) => (
  <div>
    <h3>Chart & Support/Resistance</h3>
    <ul>
      {supportResistance.map((level) => (
        <li key={level.label}>{level.label}: {level.value}</li>
      ))}
    </ul>
    <h4>Patterns</h4>
    <ul>
      {patterns.patterns.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  </div>
);

export default ChartPanel;