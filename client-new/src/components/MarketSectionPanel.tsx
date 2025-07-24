import React from 'react';

interface MarketSectionPanelProps {
  section: string;
  stage: number;
  cycles: { cycles: string[]; signals: string[] };
}

const MarketSectionPanel: React.FC<MarketSectionPanelProps> = ({ section, stage, cycles }) => (
  <div>
    <h3>Market Section</h3>
    <p>Section: {section}</p>
    <p>Stage: {stage}</p>
    <h4>Cycles</h4>
    <ul>
      {cycles.cycles.map((c, i) => (
        <li key={i}>{c}</li>
      ))}
    </ul>
    <h4>Cycle Signals</h4>
    <ul>
      {cycles.signals.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  </div>
);

export default MarketSectionPanel;