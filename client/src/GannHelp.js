// Gann Trading Help Content and Explanations

export const gannExplanations = {
  // Campaign Structure Explanations
  structuralBias: {
    title: "Structural Bias",
    content: "Gann's method to determine overall market direction. BULL indicates upward momentum through sections 1→2→3→4. BEAR indicates downward movement through sections A→a→b→B→c→C. This bias guides all trading decisions."
  },
  
  campaignSection: {
    title: "Campaign Section",
    content: "W.D. Gann identified 4 distinct sections in every market movement. Bull markets: Section 1 (accumulation), Section 2 (markup), Section 3 (distribution), Section 4 (decline). Bear markets follow A→a→b→B→c→C pattern."
  },
  
  completionSignal: {
    title: "Completion Signal",
    content: "Indicates how close the current section is to completion. HIGH suggests section end is near (potential reversal). MEDIUM shows mid-section. LOW indicates section beginning. Critical for timing entries and exits."
  },
  
  reversalProbability: {
    title: "Reversal Probability",
    content: "Gann's mathematical calculation of trend reversal likelihood. Based on section completion, volume confirmation, and time cycles. Values >70% suggest high reversal probability requiring defensive positioning."
  },
  
  volumeConfirmation: {
    title: "Volume Confirmation",
    content: "Gann emphasized volume as crucial confirmation. Strong volume in 2nd sections confirms breakouts. Weak volume in 4th sections suggests reversals. Volume must align with price action for valid signals."
  },
  
  // Retracement Levels
  retracementLevels: {
    title: "Gann Retracement Levels",
    content: "Gann's key retracement percentages: 25%, 37.5%, 50%, 62.5%, 75%. The 50% level is most important - Gann said 'when in doubt, use 50%'. These levels act as support/resistance and reversal points."
  },
  
  fiftyPercent: {
    title: "50% Retracement",
    content: "Gann's most important level. He stated 'the 50% retracement is the most important of all'. Markets often find support or resistance at this exact midpoint between major highs and lows."
  },
  
  // Time Cycles
  timeCycles: {
    title: "Gann Time Cycles",
    content: "Gann discovered markets move in predictable time patterns. Key cycles: 49-52 days, 90-98 days, and seasonal patterns. These cycles help predict when price movements will begin, peak, and end."
  },
  
  timeframeHierarchy: {
    title: "Timeframe Hierarchy",
    content: "Gann's principle that higher timeframes control lower ones. Monthly (Weight 10) dominates all others. Weekly (Weight 9) controls daily, etc. Always trade in direction of higher timeframe bias."
  },
  
  // Trading Opportunities
  gannRules: {
    title: "Gann Trading Rules",
    content: "W.D. Gann's specific rules for each timeframe. Monthly rules govern long-term positions. Daily rules (49-52 day cycles) for swing trades. Shorter timeframes for scalping. Each has unique entry/exit criteria."
  },
  
  riskReward: {
    title: "Risk:Reward Ratio",
    content: "Gann emphasized proper risk management. Minimum 1:2 risk/reward ratios. Position size based on account percentage (never risk more than 10% on single trade). Stop losses at Gann levels for mathematical precision."
  },
  
  // Pattern Visualization
  patternVisualization: {
    title: "Gann Pattern Visualization",
    content: "Visual representation of current market structure. Shows which section the market is in, trend direction, and key turning points. Essential for understanding market position and planning trades."
  },
  
  // Multi-timeframe Analysis
  multiTimeframe: {
    title: "Multi-Timeframe Analysis",
    content: "Gann's method of analyzing multiple timeframes simultaneously. Alignment across timeframes provides highest probability setups. Conflicting signals suggest caution or range-bound markets."
  },
  
  // Advanced Concepts
  campaignType: {
    title: "Campaign Type",
    content: "Gann classified market movements as Bull or Bear campaigns. Each follows specific mathematical progressions. Understanding campaign type determines appropriate trading strategy and position sizing."
  },
  
  patternConfidence: {
    title: "Pattern Confidence",
    content: "Mathematical certainty of current Gann analysis. Based on multiple factors: section clarity, volume confirmation, time cycle alignment. Higher confidence (>80%) suggests reliable signals."
  },
  
  // Position Sizing
  positionSizing: {
    title: "Gann Position Sizing",
    content: "Gann's risk management rules. Never risk more than 10% of capital on single trade. Use 2% rule for conservative approach. Position size calculated from entry to stop loss distance and account size."
  }
};

// Educational Content for Different Sections
export const educationalContent = {
  campaignStructure: {
    title: "Understanding Gann Campaign Structure",
    description: "W.D. Gann discovered that all markets move in predictable 4-section patterns...",
    keyPoints: [
      "Bull markets: Section 1 (accumulation) → 2 (markup) → 3 (distribution) → 4 (decline)",
      "Bear markets: Section A → a → b → B → c → C with specific characteristics",
      "Each section has unique volume, time, and price characteristics",
      "Section identification crucial for timing entries and exits"
    ]
  },
  
  tradeSetups: {
    title: "Gann Trading Opportunities",
    description: "Multi-timeframe analysis provides the highest probability trading setups...",
    keyPoints: [
      "Higher timeframes control lower timeframes (hierarchy rule)",
      "Monthly bias determines overall direction for all trades",
      "Daily timeframe best for swing trading (49-52 day cycles)",
      "Shorter timeframes for scalping with tight risk management"
    ]
  },
  
  riskManagement: {
    title: "Gann Risk Management Principles",
    description: "W.D. Gann was as famous for risk management as for market timing...",
    keyPoints: [
      "Never risk more than 10% of capital on any single trade",
      "Use 2% rule for conservative, sustainable growth",
      "Stop losses placed at mathematical Gann levels",
      "Position size based on distance to stop loss"
    ]
  }
};

export default gannExplanations;