import React from 'react';

const GannPatternChart = ({ campaignType, currentSection, timeframe, currentPrice, entryPrice, targetPrice, stopLossPrice }) => {
  const bullSections = [
    { id: 1, name: 'Accumulation', color: '#27ae60', description: 'Smart money buying' },
    { id: 2, name: 'Markup', color: '#2ecc71', description: 'Trend acceleration' },
    { id: 3, name: 'Distribution', color: '#f39c12', description: 'Smart money selling' },
    { id: 4, name: 'Decline', color: '#e74c3c', description: 'Price decline' }
  ];

  const bearSections = [
    { id: 'A', name: 'Initial Decline', color: '#e74c3c', description: 'First drop' },
    { id: 'a', name: 'Bounce', color: '#f39c12', description: 'Relief rally' },
    { id: 'b', name: 'Retest', color: '#e67e22', description: 'Test previous low' },
    { id: 'B', name: 'Breakdown', color: '#c0392b', description: 'Major decline' },
    { id: 'c', name: 'Rally', color: '#f1c40f', description: 'Counter-trend move' },
    { id: 'C', name: 'Final Decline', color: '#8e44ad', description: 'Capitulation' }
  ];

  const sections = campaignType === 'Bull' ? bullSections : bearSections;
  
  // Determine current section based on the description
  const getCurrentSectionId = () => {
    if (!currentSection) return null;
    
    if (campaignType === 'Bull') {
      if (currentSection.includes('1') || currentSection.includes('Accumulation')) return 1;
      if (currentSection.includes('2') || currentSection.includes('Markup')) return 2;
      if (currentSection.includes('3') || currentSection.includes('Distribution')) return 3;
      if (currentSection.includes('4') || currentSection.includes('Decline')) return 4;
    } else {
      if (currentSection.includes('A') || currentSection.includes('Initial')) return 'A';
      if (currentSection.includes('a') || currentSection.includes('Bounce')) return 'a';
      if (currentSection.includes('b') || currentSection.includes('Retest')) return 'b';
      if (currentSection.includes('B') || currentSection.includes('Breakdown')) return 'B';
      if (currentSection.includes('c') || currentSection.includes('Rally')) return 'c';
      if (currentSection.includes('C') || currentSection.includes('Final')) return 'C';
    }
    return null;
  };

  const currentSectionId = getCurrentSectionId();

  // Generate price chart data for visualization
  const generateChartData = () => {
    const basePrice = currentPrice || entryPrice || 50000;
    const points = [];
    
    if (campaignType === 'Bull' || campaignType === 'bull') {
      // Bull campaign pattern: rising trend with 4 sections
      points.push({ x: 0, y: basePrice * 0.7, section: 1, label: 'Accumulation' });
      points.push({ x: 25, y: basePrice * 0.85, section: 2, label: 'Markup Begin' });
      points.push({ x: 50, y: basePrice * 1.2, section: 2, label: 'Markup Peak' });
      points.push({ x: 75, y: basePrice * 1.1, section: 3, label: 'Distribution' });
      points.push({ x: 100, y: basePrice * 0.9, section: 4, label: 'Decline' });
    } else {
      // Bear campaign pattern: declining trend with 6 sections
      points.push({ x: 0, y: basePrice * 1.2, section: 'A', label: 'Initial Decline' });
      points.push({ x: 15, y: basePrice * 1.05, section: 'a', label: 'Bounce' });
      points.push({ x: 30, y: basePrice * 0.95, section: 'b', label: 'Retest' });
      points.push({ x: 50, y: basePrice * 0.75, section: 'B', label: 'Breakdown' });
      points.push({ x: 70, y: basePrice * 0.85, section: 'c', label: 'Rally' });
      points.push({ x: 100, y: basePrice * 0.6, section: 'C', label: 'Final Decline' });
    }
    
    return points;
  };
  
  const chartData = generateChartData();
  const maxPrice = Math.max(...chartData.map(p => p.y));
  const minPrice = Math.min(...chartData.map(p => p.y));
  const priceRange = maxPrice - minPrice;
  
  // Convert price to SVG y coordinate
  const priceToY = (price) => 200 - ((price - minPrice) / priceRange) * 160;
  
  // Calculate current price position on chart
  const currentPriceY = currentPrice ? priceToY(currentPrice) : priceToY(chartData[2].y);

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    if (typeof price !== 'number') return price;
    
    if (price >= 1000) {
      return price.toFixed(2).replace(/\.?0+$/, '');
    } else if (price >= 1) {
      return price.toFixed(4).replace(/\.?0+$/, '');
    } else {
      return price.toFixed(6).replace(/\.?0+$/, '');
    }
  };
  
  return (
    <div className="gann-pattern-chart">
      <div className="pattern-header">
        <h5>{campaignType} Campaign Pattern - {timeframe}</h5>
        <span className="current-indicator">Current: {currentSection}</span>
      </div>
      
      {/* SVG Chart */}
      <svg width="100%" height="220" viewBox="0 0 300 220" style={{ border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9', maxWidth: '300px' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Price levels */}
        <text x="5" y="25" fontSize="10" fill="#666">${formatPrice(maxPrice)}</text>
        <text x="5" y="115" fontSize="10" fill="#666">${formatPrice((maxPrice + minPrice) / 2)}</text>
        <text x="5" y="195" fontSize="10" fill="#666">${formatPrice(minPrice)}</text>
        
        {/* Campaign pattern line */}
        <polyline
          points={chartData.map(p => `${(p.x / 100) * 280 + 10},${priceToY(p.y)}`).join(' ')}
          fill="none"
          stroke={campaignType === 'Bull' || campaignType === 'bull' ? '#27ae60' : '#e74c3c'}
          strokeWidth="2"
        />
        
        {/* Section markers */}
        {chartData.map((point, index) => {
          const isCurrentSection = point.section.toString() === currentSectionId?.toString();
          return (
            <g key={index}>
              <circle
                cx={(point.x / 100) * 280 + 10}
                cy={priceToY(point.y)}
                r={isCurrentSection ? "6" : "4"}
                fill={isCurrentSection ? '#4facfe' : '#666'}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={(point.x / 100) * 280 + 10}
                y={priceToY(point.y) - 10}
                fontSize="8"
                textAnchor="middle"
                fill="#333"
                fontWeight={isCurrentSection ? 'bold' : 'normal'}
              >
                {point.section}
              </text>
            </g>
          );
        })}
        
        {/* Current price line and red dot */}
        {currentPrice && (
          <g>
            {/* Horizontal price line */}
            <line
              x1="10"
              y1={currentPriceY}
              x2="290"
              y2={currentPriceY}
              stroke="#dc3545"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            {/* Current price red dot */}
            <circle
              cx="250"
              cy={currentPriceY}
              r="5"
              fill="#dc3545"
              stroke="white"
              strokeWidth="2"
            />
            {/* Price label */}
            <text
              x="255"
              y={currentPriceY + 4}
              fontSize="9"
              fill="#dc3545"
              fontWeight="bold"
            >
              ${formatPrice(currentPrice)}
            </text>
          </g>
        )}
        
        {/* Entry, Target, Stop Loss markers */}
        {entryPrice && (
          <g>
            <circle
              cx="220"
              cy={priceToY(entryPrice)}
              r="3"
              fill="#28a745"
              stroke="white"
              strokeWidth="1"
            />
            <text x="225" y={priceToY(entryPrice) + 3} fontSize="8" fill="#28a745">E</text>
          </g>
        )}
        {targetPrice && (
          <g>
            <circle
              cx="240"
              cy={priceToY(targetPrice)}
              r="3"
              fill="#17a2b8"
              stroke="white"
              strokeWidth="1"
            />
            <text x="245" y={priceToY(targetPrice) + 3} fontSize="8" fill="#17a2b8">T</text>
          </g>
        )}
        {stopLossPrice && (
          <g>
            <circle
              cx="200"
              cy={priceToY(stopLossPrice)}
              r="3"
              fill="#ffc107"
              stroke="white"
              strokeWidth="1"
            />
            <text x="205" y={priceToY(stopLossPrice) + 3} fontSize="8" fill="#ffc107">S</text>
          </g>
        )}
      </svg>
      
      {/* Legend */}
      <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ color: '#dc3545' }}>🔴 Current Price</span>
        {entryPrice && <span style={{ color: '#28a745' }}>🟢 Entry</span>}
        {targetPrice && <span style={{ color: '#17a2b8' }}>🔵 Target</span>}
        {stopLossPrice && <span style={{ color: '#ffc107' }}>🟡 Stop</span>}
      </div>
      
      <div className="pattern-flow" style={{ marginTop: '10px', textAlign: 'center' }}>
        <div className="flow-arrow" style={{ fontSize: '12px', color: '#666' }}>
          {campaignType === 'Bull' || campaignType === 'bull' ? '1 → 2 → 3 → 4' : 'A → a → b → B → c → C'}
        </div>
      </div>
    </div>
  );
};

export default GannPatternChart;