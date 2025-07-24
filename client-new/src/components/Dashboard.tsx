import React, { useEffect, useState } from 'react';
import { fetchGannAnalysis } from '../api/gannApi';
import { GannAnalysisResult } from '../src/types/gannTypes';
import ChartPanel from './ChartPanel';
import MarketSectionPanel from './MarketSectionPanel';
import VolumePanel from './VolumePanel';
import LogPanel from './LogPanel';
import { Container, Typography, Box } from '@mui/material';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<GannAnalysisResult | null>(null);

  useEffect(() => {
    fetchGannAnalysis().then(setData);
  }, []);

  if (!data) return <div>Loading analysis...</div>;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Gann Analysis Dashboard</Typography>
      <Box display="flex" flexDirection="row" gap={2}>
        <ChartPanel supportResistance={data.supportResistance} patterns={data.patterns} />
        <MarketSectionPanel section={data.section} stage={data.stage} cycles={data.cycles} />
      </Box>
      <Box display="flex" flexDirection="row" gap={2} mt={2}>
        <VolumePanel volume={data.volume} risk={data.risk} />
        <LogPanel logs={data.logs} />
      </Box>
    </Container>
  );
};

export default Dashboard;