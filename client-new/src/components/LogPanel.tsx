import React from 'react';

interface LogPanelProps {
  logs: { timestamp: string; type: string; message: string; data?: any }[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => (
  <div>
    <h3>System Logs</h3>
    <ul>
      {logs.map((log, i) => (
        <li key={i}>
          [{log.timestamp}] <b>{log.type}</b>: {log.message}
        </li>
      ))}
    </ul>
  </div>
);

export default LogPanel;