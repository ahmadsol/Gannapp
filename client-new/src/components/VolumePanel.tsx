import React from 'react';

interface VolumePanelProps {
  volume: { signal: string; details: any };
  risk: { allowedRisk: number; stopLoss: number; lossStreak: number; pauseTrading: boolean };
}

const VolumePanel: React.FC<VolumePanelProps> = ({ volume, risk }) => (
  <div>
    <h3>Volume Analysis</h3>
    <p>Signal: {volume.signal}</p>
    <pre>{JSON.stringify(volume.details, null, 2)}</pre>
    <h4>Risk Management</h4>
    <ul>
      <li>Allowed Risk: {risk.allowedRisk}</li>
      <li>Stop Loss: {risk.stopLoss}</li>
      <li>Loss Streak: {risk.lossStreak}</li>
      <li>Pause Trading: {risk.pauseTrading ? 'Yes' : 'No'}</li>
    </ul>
  </div>
);

export default VolumePanel;