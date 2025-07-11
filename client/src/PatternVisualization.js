import React from 'react';

const PatternVisualization = ({ campaignData, timeframe = 'daily', size = 'medium' }) => {
  if (!campaignData) {
    return <div className="pattern-placeholder">No pattern data available</div>;
  }

  const { campaignType, currentSection, structuralBias, reversalProbability } = campaignData;
  
  // Size configurations
  const sizeConfig = {
    small: { width: 200, height: 120, strokeWidth: 2, fontSize: 10 },
    medium: { width: 300, height: 180, fontSize: 12, strokeWidth: 2.5 },
    large: { width: 400, height: 240, fontSize: 14, strokeWidth: 3 }
  };
  
  const config = sizeConfig[size] || sizeConfig.medium;
  const { width, height, strokeWidth, fontSize } = config;
  
  // Color scheme based on bias
  const getColorScheme = () => {
    if (structuralBias === 'BULL') return {
      primary: '#28a745',
      secondary: '#20c997',
      accent: '#17a2b8',
      warning: '#ffc107',
      danger: '#dc3545'
    };
    if (structuralBias === 'BEAR') return {
      primary: '#dc3545',
      secondary: '#fd7e14',
      accent: '#6f42c1',
      warning: '#ffc107',
      danger: '#e83e8c'
    };
    return {
      primary: '#6c757d',
      secondary: '#adb5bd',
      accent: '#495057',
      warning: '#ffc107',
      danger: '#dc3545'
    };
  };
  
  const colors = getColorScheme();
  
  // Bull Market Pattern (1→2→3→4)
  const BullPattern = () => {
    const sections = [
      { x: 50, y: height - 40, label: '1' },
      { x: 120, y: height - 80, label: '2' },
      { x: 190, y: height - 120, label: '3' },
      { x: 260, y: height - 140, label: '4' }
    ];
    
    const pathData = sections.map((section, index) => 
      `${index === 0 ? 'M' : 'L'} ${section.x} ${section.y}`
    ).join(' ');
    
    return (
      <g>
        {/* Main trend line */}
        <path 
          d={pathData} 
          stroke={colors.primary} 
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Section points and labels */}
        {sections.map((section, index) => (
          <g key={index}>
            <circle 
              cx={section.x} 
              cy={section.y} 
              r={6}
              fill={currentSection === (index + 1) ? colors.accent : colors.secondary}
              stroke={colors.primary}
              strokeWidth={1.5}
            />
            <text 
              x={section.x} 
              y={section.y - 12} 
              textAnchor="middle" 
              fontSize={fontSize}
              fill={colors.primary}
              fontWeight="bold"
            >
              {section.label}
            </text>
          </g>
        ))}
        
        {/* 4th section warning indicator */}
        {currentSection === 4 && (
          <g>
            <circle 
              cx={260} 
              cy={height - 140} 
              r={15}
              fill="none"
              stroke={colors.danger}
              strokeWidth={2}
              strokeDasharray="3,3"
            />
            <text 
              x={280} 
              y={height - 135} 
              fontSize={fontSize - 2}
              fill={colors.danger}
              fontWeight="bold"
            >
              REVERSAL
            </text>
          </g>
        )}
        
        {/* Current section progress indicator */}
        {currentSection <= 4 && (
          <rect
            x={sections[currentSection - 1]?.x - 3}
            y={sections[currentSection - 1]?.y - 25}
            width={6}
            height={15}
            fill={colors.accent}
            opacity={0.7}
          />
        )}
      </g>
    );
  };
  
  // Bear Market Pattern (A→a→b→B→c→C)
  const BearPattern = () => {
    const sections = [
      { x: 50, y: 40, label: 'A' },
      { x: 90, y: 60, label: 'a' },
      { x: 130, y: 80, label: 'b' },
      { x: 170, y: 90, label: 'B' },
      { x: 210, y: 120, label: 'c' },
      { x: 260, y: 140, label: 'C' }
    ];
    
    const pathData = sections.map((section, index) => 
      `${index === 0 ? 'M' : 'L'} ${section.x} ${section.y}`
    ).join(' ');
    
    return (
      <g>
        {/* Main trend line */}
        <path 
          d={pathData} 
          stroke={colors.primary} 
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Section points and labels */}
        {sections.map((section, index) => (
          <g key={index}>
            <circle 
              cx={section.x} 
              cy={section.y} 
              r={6}
              fill={currentSection === section.label ? colors.accent : colors.secondary}
              stroke={colors.primary}
              strokeWidth={1.5}
            />
            <text 
              x={section.x} 
              y={section.y - 12} 
              textAnchor="middle" 
              fontSize={fontSize}
              fill={colors.primary}
              fontWeight="bold"
            >
              {section.label}
            </text>
          </g>
        ))}
        
        {/* C section reversal warning */}
        {currentSection === 'C' && (
          <g>
            <circle 
              cx={260} 
              cy={140} 
              r={15}
              fill="none"
              stroke={colors.warning}
              strokeWidth={2}
              strokeDasharray="3,3"
            />
            <text 
              x={280} 
              y={145} 
              fontSize={fontSize - 2}
              fill={colors.warning}
              fontWeight="bold"
            >
              REVERSAL
            </text>
          </g>
        )}
        
        {/* Bear rally indicators */}
        <path 
          d="M 90 60 Q 110 45 130 80" 
          stroke={colors.secondary} 
          strokeWidth={strokeWidth - 0.5}
          fill="none"
          strokeDasharray="2,2"
          opacity={0.6}
        />
        <path 
          d="M 170 90 Q 190 75 210 120" 
          stroke={colors.secondary} 
          strokeWidth={strokeWidth - 0.5}
          fill="none"
          strokeDasharray="2,2"
          opacity={0.6}
        />
      </g>
    );
  };
  
  return (
    <div className="pattern-visualization">
      <div className="pattern-header">
        <h4>{timeframe.toUpperCase()} Pattern</h4>
        <div className="pattern-meta">
          <span className={`bias-indicator ${structuralBias.toLowerCase()}`}>
            {structuralBias}
          </span>
          <span className="current-section">
            Section: {currentSection}
          </span>
          {reversalProbability > 70 && (
            <span className="reversal-warning">
              ⚠️ {reversalProbability}% Reversal
            </span>
          )}
        </div>
      </div>
      
      <div className="pattern-svg-container">
        <svg width={width} height={height} className="pattern-svg">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Timeframe label */}
          <text 
            x={10} 
            y={20} 
            fontSize={fontSize - 2}
            fill="#666"
            fontWeight="bold"
          >
            {timeframe.toUpperCase()}
          </text>
          
          {/* Pattern visualization */}
          {campaignType === 'bull' ? <BullPattern /> : <BearPattern />}
          
          {/* Volume indicator */}
          {campaignData.volumeConfirmation && (
            <g>
              <circle 
                cx={width - 30} 
                cy={height - 30} 
                r={8}
                fill={colors.primary}
                opacity={0.8}
              />
              <text 
                x={width - 30} 
                y={height - 26} 
                textAnchor="middle" 
                fontSize={fontSize - 4}
                fill="white"
                fontWeight="bold"
              >
                V
              </text>
            </g>
          )}
        </svg>
      </div>
      
      {/* Pattern details */}
      <div className="pattern-details">
        <div className="detail-row">
          <span>Type:</span>
          <span>{campaignType.toUpperCase()} Campaign</span>
        </div>
        <div className="detail-row">
          <span>Progress:</span>
          <span>{campaignData.sections || 'Unknown'}</span>
        </div>
        {campaignData.nextExpectedMove && (
          <div className="detail-row">
            <span>Next:</span>
            <span>{campaignData.nextExpectedMove}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternVisualization;