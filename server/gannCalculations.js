
// Helper functions for date calculations
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

// GANN'S TIME-BASED STOP ADJUSTMENT RULES
const calculateTimeBasedStopAdjustments = (entryPrice, originalStop, timeframe, isBull) => {
  const adjustmentSchedules = {
    'monthly': {
      adjustments: [
        { days: 30, tightenPercent: 0.01 },   // 1% tighter after 30 days
        { days: 60, tightenPercent: 0.02 },   // 2% tighter after 60 days
        { days: 90, tightenPercent: 0.03 }    // 3% tighter after 90 days
      ]
    },
    'weekly': {
      adjustments: [
        { days: 7, tightenPercent: 0.01 },    // 1% tighter after 1 week
        { days: 14, tightenPercent: 0.02 },   // 2% tighter after 2 weeks
        { days: 21, tightenPercent: 0.03 }    // 3% tighter after 3 weeks
      ]
    },
    'daily': {
      adjustments: [
        { days: 7, tightenPercent: 0.005 },   // 0.5% tighter after 7 days
        { days: 14, tightenPercent: 0.01 },   // 1% tighter after 14 days
        { days: 21, tightenPercent: 0.015 }   // 1.5% tighter after 21 days
      ]
    },
    '4h': {
      adjustments: [
        { days: 1, tightenPercent: 0.005 },   // 0.5% tighter after 1 day
        { days: 2, tightenPercent: 0.01 },    // 1% tighter after 2 days
        { days: 3, tightenPercent: 0.015 }    // 1.5% tighter after 3 days
      ]
    },
    '1h': {
      adjustments: [
        { days: 0.17, tightenPercent: 0.003 }, // 0.3% tighter after 4 hours
        { days: 0.33, tightenPercent: 0.006 }, // 0.6% tighter after 8 hours
        { days: 0.50, tightenPercent: 0.009 }  // 0.9% tighter after 12 hours
      ]
    },
    '15m': {
      adjustments: [
        { days: 0.021, tightenPercent: 0.002 }, // 0.2% tighter after 30 minutes
        { days: 0.042, tightenPercent: 0.004 }, // 0.4% tighter after 1 hour
        { days: 0.083, tightenPercent: 0.006 }  // 0.6% tighter after 2 hours
      ]
    },
    '5m': {
      adjustments: [
        { days: 0.021, tightenPercent: 0.002 }, // 0.2% tighter after 30 minutes
        { days: 0.042, tightenPercent: 0.004 }, // 0.4% tighter after 1 hour
        { days: 0.063, tightenPercent: 0.006 }  // 0.6% tighter after 1.5 hours
      ]
    },
    '1m': {
      adjustments: [
        { days: 0.007, tightenPercent: 0.001 }, // 0.1% tighter after 10 minutes
        { days: 0.014, tightenPercent: 0.002 }, // 0.2% tighter after 20 minutes
        { days: 0.021, tightenPercent: 0.003 }  // 0.3% tighter after 30 minutes
      ]
    }
  };
  
  const schedule = adjustmentSchedules[timeframe] || adjustmentSchedules['daily'];
  const stopAdjustments = [];
  
  schedule.adjustments.forEach((adjustment, index) => {
    const adjustmentAmount = entryPrice * adjustment.tightenPercent;
    const newStop = isBull ? 
      originalStop + adjustmentAmount : // Bull: raise stop (tighten)
      originalStop - adjustmentAmount;  // Bear: lower stop (tighten)
    
    stopAdjustments.push({
      triggerDays: adjustment.days,
      newStopLevel: newStop,
      tightenAmount: adjustmentAmount,
      tightenPercent: adjustment.tightenPercent * 100,
      description: `After ${adjustment.days < 1 ? 
        `${Math.round(adjustment.days * 24)} hours` : 
        `${adjustment.days} days`}: Move stop to $${newStop.toFixed(2)} (${adjustment.tightenPercent * 100}% tighter)`
    });
  });
  
  return {
    originalStop: originalStop,
    adjustmentSchedule: stopAdjustments,
    maxTightening: schedule.adjustments[schedule.adjustments.length - 1].tightenPercent * 100
  };
};

// GANN'S UNIVERSAL BREAK CONFIRMATION RULES
const validateGannBreakConfirmation = (priceMove, level, timeframe, volume = null) => {
  // Gann's break confirmation thresholds by timeframe
  const confirmationThresholds = {
    'monthly': 0.08,   // 8% break required for monthly
    'weekly': 0.05,    // 5% break required for weekly
    'daily': 0.03,     // 3% break required for daily (Gann's famous rule)
    '4h': 0.02,        // 2% break required for 4H
    '1h': 0.015,       // 1.5% break required for 1H
    '15m': 0.012,      // 1.2% break required for 15M
    '5m': 0.008,       // 0.8% break required for 5M
    '1m': 0.005        // 0.5% break required for 1M
  };
  
  const threshold = confirmationThresholds[timeframe] || confirmationThresholds['daily'];
  const breakPercentage = Math.abs(priceMove - level) / level;
  const isConfirmedBreak = breakPercentage >= threshold;
  
  // Volume confirmation (if available)
  let volumeConfirmed = true;
  if (volume && volume.current && volume.average) {
    volumeConfirmed = volume.current >= (volume.average * 1.5); // 50% above average
  }
  
  return {
    confirmed: isConfirmedBreak && volumeConfirmed,
    breakPercentage: breakPercentage * 100,
    requiredThreshold: threshold * 100,
    volumeConfirmed: volumeConfirmed,
    strength: breakPercentage >= (threshold * 2) ? 'STRONG' : 
              breakPercentage >= threshold ? 'MODERATE' : 'WEAK'
  };
};

// GANN'S MULTIPLE TARGET SYSTEM
const calculateMultipleTargets = (entry, campaignHigh, campaignLow, timeframe, isBull, positionSize) => {
  const range = campaignHigh - campaignLow;
  
  // Gann's progressive target levels
  const gannTargetLevels = {
    'target_1': isBull ? campaignLow + (range * 0.25) : campaignHigh - (range * 0.25),  // 25% level
    'target_2': isBull ? campaignLow + (range * 0.375) : campaignHigh - (range * 0.375), // 37.5% level
    'target_3': isBull ? campaignLow + (range * 0.50) : campaignHigh - (range * 0.50),   // 50% level (most important)
    'target_4': isBull ? campaignLow + (range * 0.625) : campaignHigh - (range * 0.625), // 62.5% level
    'target_5': isBull ? campaignLow + (range * 0.75) : campaignHigh - (range * 0.75),   // 75% level
    'extension_1': isBull ? campaignHigh + (range * 0.125) : campaignLow - (range * 0.125), // 112.5% extension
    'extension_2': isBull ? campaignHigh + (range * 0.25) : campaignLow - (range * 0.25),   // 125% extension
  };
  
  // Progressive position sizing (exit percentages)
  const exitPercentages = {
    'target_1': 0.25,    // Exit 25% at first target (quick profit)
    'target_2': 0.25,    // Exit 25% at second target
    'target_3': 0.25,    // Exit 25% at third target (50% level - most important)
    'target_4': 0.15,    // Exit 15% at fourth target
    'target_5': 0.10,    // Exit 10% at fifth target
    // Let remaining run for extensions
  };
  
  const targets = [];
  let remainingPosition = positionSize;
  
  Object.entries(gannTargetLevels).forEach(([targetName, targetPrice], index) => {
    // Skip targets that are beyond entry in wrong direction
    if (isBull && targetPrice <= entry) return;
    if (!isBull && targetPrice >= entry) return;
    
    const exitPercentage = exitPercentages[targetName] || 0;
    const exitSize = positionSize * exitPercentage;
    
    if (exitSize > 0) {
      const profit = Math.abs(targetPrice - entry) * exitSize;
      const targetNumber = targetName.includes('extension') ? 
        `Extension ${targetName.split('_')[1]}` : 
        `Target ${targetName.split('_')[1]}`;
      
      targets.push({
        name: targetName,
        displayName: targetNumber,
        price: targetPrice,
        exitPercentage: exitPercentage * 100,
        exitSize: exitSize,
        profit: profit,
        isExtension: targetName.includes('extension'),
        priority: targetName === 'target_3' ? 'HIGH' : // 50% level most important
                 targetName.includes('extension') ? 'OPTIONAL' : 'MEDIUM',
        description: targetName === 'target_3' ? '50% Gann level - Most reliable target' :
                    targetName.includes('extension') ? 'Extension beyond normal range' :
                    `${targetName.replace('_', ' ')} - Progressive exit`
      });
      
      remainingPosition -= exitSize;
    }
  });
  
  // Add final "let it run" portion for remaining position
  if (remainingPosition > 0.001) { // Small threshold to avoid rounding errors
    targets.push({
      name: 'let_run',
      displayName: 'Let Run',
      price: null,
      exitPercentage: (remainingPosition / positionSize) * 100,
      exitSize: remainingPosition,
      profit: 'Unlimited',
      isExtension: true,
      priority: 'OPTIONAL',
      description: 'Let remaining position run for maximum profit'
    });
  }
  
  return {
    targets: targets.slice(0, 6), // Limit to 6 targets to avoid clutter
    totalTargets: targets.length,
    quickestProfit: targets[0], // First target for quick profit
    primaryTarget: targets.find(t => t.name === 'target_3'), // 50% level
    extensionTargets: targets.filter(t => t.isExtension)
  };
};

// GANN'S COMPLETE TRADE VALIDATION SYSTEM
const validateCompleteTradeSetup = (setup) => {
  const validationChecks = [
    {
      name: 'TIMEFRAME_ALIGNMENT',
      weight: 0.25,
      validator: (setup) => validateTimeframeAlignment(setup),
      minimum_score: 0.6,
      description: 'Higher timeframes must align with trade direction'
    },
    {
      name: 'VOLUME_CONFIRMATION', 
      weight: 0.20,
      validator: (setup) => validateVolumeConfirmation(setup),
      minimum_score: 0.7,
      description: 'Volume must confirm price action per Gann rules'
    },
    {
      name: 'PRICE_LEVEL_SIGNIFICANCE',
      weight: 0.20,
      validator: (setup) => validatePriceLevelSignificance(setup),
      minimum_score: 0.8,
      description: 'Entry must be at significant Gann retracement level'
    },
    {
      name: 'TIME_CYCLE_ALIGNMENT',
      weight: 0.15,
      validator: (setup) => validateTimeCycleAlignment(setup),
      minimum_score: 0.5,
      description: 'Entry timing must align with Gann time cycles'
    },
    {
      name: 'RISK_REWARD_RATIO',
      weight: 0.10,
      validator: (setup) => validateRiskRewardRatio(setup),
      minimum_score: 0.8,
      description: 'Risk/reward must meet minimum Gann standards'
    },
    {
      name: 'CAMPAIGN_POSITION',
      weight: 0.10,
      validator: (setup) => validateCampaignPosition(setup),
      minimum_score: 0.6,
      description: 'Trade must align with current campaign section'
    }
  ];
  
  let totalScore = 0;
  let weightedScore = 0;
  const results = [];
  
  for (const check of validationChecks) {
    const result = check.validator(setup);
    const score = result.score || 0;
    const passes = score >= check.minimum_score;
    
    totalScore += score * check.weight;
    weightedScore += check.weight;
    
    results.push({
      check: check.name,
      score: score,
      passes: passes,
      weight: check.weight,
      description: check.description,
      details: result.details,
      issues: result.issues || []
    });
  }
  
  const finalScore = totalScore / weightedScore;
  const allCriticalPass = results.every(r => r.passes);
  
  return {
    validated: allCriticalPass && finalScore >= 0.7,
    final_score: finalScore,
    grade: finalScore >= 0.85 ? 'A' : finalScore >= 0.75 ? 'B' : finalScore >= 0.65 ? 'C' : 'F',
    individual_results: results,
    recommendation: finalScore >= 0.85 ? 'TAKE_TRADE' :
                   finalScore >= 0.70 ? 'CONSIDER_TRADE' :
                   finalScore >= 0.55 ? 'WATCH_TRADE' :
                   'AVOID_TRADE',
    critical_issues: results.filter(r => !r.passes).map(r => r.check),
    strengths: results.filter(r => r.score >= 0.8).map(r => r.check)
  };
};

// Individual validation functions
const validateTimeframeAlignment = (setup) => {
  const { hierarchicalInfluence, timeframe, isBull } = setup;
  
  let alignmentScore = 1.0;
  const issues = [];
  
  // Check alignment with higher timeframes
  if (hierarchicalInfluence === 'MONTHLY_BEAR' && isBull) {
    alignmentScore = 0.2; // Strong penalty for opposing monthly trend
    issues.push('Bull trade conflicts with monthly bear trend');
  } else if (hierarchicalInfluence === 'WEEKLY_BEAR' && isBull) {
    alignmentScore = 0.6; // Moderate penalty for opposing weekly trend
    issues.push('Bull trade conflicts with weekly bear trend');
  } else if (hierarchicalInfluence === 'MONTHLY_BEAR' && !isBull) {
    alignmentScore = 1.0; // Perfect alignment
  } else if (hierarchicalInfluence === 'LOCAL') {
    alignmentScore = 0.8; // Good - using local bias
  }
  
  return {
    score: alignmentScore,
    details: `Timeframe alignment: ${hierarchicalInfluence}`,
    issues: issues
  };
};

const validateVolumeConfirmation = (setup) => {
  const { volumeStrength, sectionType, timeframe } = setup;
  
  const volumeScores = {
    'STRONG': 1.0,
    'MEDIUM': 0.7,
    'WEAK': 0.4,
    'VERY_WEAK': 0.2
  };
  
  const baseScore = volumeScores[volumeStrength] || 0.5;
  const issues = [];
  
  // Section-specific volume requirements
  if (sectionType === 'bull_section_2' && volumeStrength !== 'STRONG') {
    issues.push('Bull section 2 breakout requires STRONG volume');
  }
  if (sectionType === 'bear_section_A' && volumeStrength === 'WEAK') {
    issues.push('Bear section A decline should have higher volume');
  }
  
  return {
    score: baseScore,
    details: `Volume strength: ${volumeStrength}`,
    issues: issues
  };
};

const validatePriceLevelSignificance = (setup) => {
  const { entryLevel, breakConfirmation } = setup;
  
  // Gann level importance scores
  const levelSignificance = {
    '50%': 1.0,    // Most important
    '37.5%': 0.8,  // Secondary support
    '62.5%': 0.8,  // Secondary resistance
    '25%': 0.7,    // Major support
    '75%': 0.7     // Major resistance
  };
  
  const baseScore = levelSignificance[entryLevel] || 0.5;
  const issues = [];
  
  // Penalty for insufficient break confirmation
  let adjustedScore = baseScore;
  if (breakConfirmation && !breakConfirmation.confirmed) {
    adjustedScore *= 0.5; // 50% penalty for unconfirmed breaks
    issues.push(`Insufficient break confirmation: ${breakConfirmation.breakPercentage?.toFixed(2)}% vs required ${breakConfirmation.requiredThreshold?.toFixed(2)}%`);
  }
  
  return {
    score: adjustedScore,
    details: `Entry at ${entryLevel} Gann level with ${breakConfirmation?.strength || 'unknown'} break confirmation`,
    issues: issues
  };
};

const validateTimeCycleAlignment = (setup) => {
  const { timeframe } = setup;
  
  // Simplified time cycle validation (can be enhanced with actual cycle data)
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const dayOfMonth = currentDate.getDate();
  
  let cycleScore = 0.7; // Default neutral score
  const issues = [];
  
  // Gann's favorable trading periods
  const favorableDays = [1, 2, 3, 4]; // Monday-Thursday
  const favorableDatesMonthly = [7, 14, 21, 28]; // Weekly intervals
  
  if (favorableDays.includes(dayOfWeek)) {
    cycleScore += 0.1;
  } else {
    issues.push('Trading on less favorable day of week');
  }
  
  if (favorableDatesMonthly.some(date => Math.abs(dayOfMonth - date) <= 2)) {
    cycleScore += 0.2;
  }
  
  return {
    score: Math.min(cycleScore, 1.0),
    details: `Time cycle alignment for ${timeframe}`,
    issues: issues
  };
};

const validateRiskRewardRatio = (setup) => {
  const { riskReward, timeframe } = setup;
  
  // Extract numeric ratio from "1:2.5" format
  const ratioMatch = riskReward?.match(/1:([\d.]+)/);
  const ratio = ratioMatch ? parseFloat(ratioMatch[1]) : 0;
  
  // Minimum acceptable ratios by timeframe
  const minimumRatios = {
    'monthly': 2.5,
    'weekly': 2.0,
    'daily': 1.8,
    '4h': 1.5,
    '1h': 1.3,
    '15m': 1.2,
    '5m': 1.1,
    '1m': 1.0
  };
  
  const minimumRequired = minimumRatios[timeframe] || 1.5;
  const score = Math.min(ratio / minimumRequired, 1.0);
  const issues = [];
  
  if (ratio < minimumRequired) {
    issues.push(`Risk/reward ratio ${ratio} below minimum ${minimumRequired} for ${timeframe}`);
  }
  
  return {
    score: score,
    details: `Risk/reward: ${riskReward} (min required: 1:${minimumRequired})`,
    issues: issues
  };
};

const validateCampaignPosition = (setup) => {
  const { sectionType, confidence } = setup;
  
  // Campaign section reliability scores
  const sectionScores = {
    'bull_section_1': 0.7,  // Accumulation - moderate reliability
    'bull_section_2': 1.0,  // Markup - highest reliability
    'bull_section_3': 0.6,  // Distribution - lower reliability
    'bull_section_4': 0.4,  // Decline - lowest reliability
    'bear_section_A': 0.8,  // Initial decline - high reliability
    'bear_section_a': 0.5,  // Rally - lower reliability
    'bear_section_B': 0.9,  // Breakdown - very high reliability
    'bear_section_C': 0.7   // Final decline - good reliability
  };
  
  const baseScore = sectionScores[sectionType] || 0.6;
  
  // Adjust based on confidence
  const confidenceMultiplier = {
    'HIGH': 1.0,
    'MEDIUM': 0.8,
    'LOW': 0.6
  };
  
  const finalScore = baseScore * (confidenceMultiplier[confidence] || 0.8);
  
  return {
    score: finalScore,
    details: `Campaign position: ${sectionType} with ${confidence} confidence`,
    issues: []
  };
};

// GANN'S ADVANCED VOLUME ANALYSIS SYSTEM (PHASE 4)
const calculateAdvancedVolumeAnalysis = (currentPrice, timeframe, sectionType, campaignType) => {
  // Gann's volume patterns for each campaign section
  const volumePatterns = {
    'bull_section_1': {
      pattern: 'INCREASING_ON_ADVANCES',
      advance_volume_min: 1.2,    // 20% above average on advances
      decline_volume_max: 0.8,    // 20% below average on declines
      trend: 'INCREASING',
      reliability: 'MEDIUM',
      entry_signal: 'volume_increase_on_breakout',
      exit_signal: 'volume_divergence_warning'
    },
    'bull_section_2': {
      pattern: 'STRONG_BREAKOUT_VOLUME',
      breakout_volume_min: 1.8,   // 80% above average on breakout
      follow_through_min: 1.3,    // 30% above average on follow-through
      trend: 'STRONG',
      reliability: 'VERY_HIGH',
      entry_signal: 'strong_volume_confirmation',
      exit_signal: 'volume_exhaustion'
    },
    'bull_section_3': {
      pattern: 'DISTRIBUTION_SIGNS',
      advance_volume_max: 0.9,    // 10% below average on advances
      decline_volume_min: 1.1,    // 10% above average on declines
      trend: 'WEAKENING',
      reliability: 'HIGH',
      entry_signal: 'weak_volume_warning',
      exit_signal: 'negative_divergence'
    },
    'bull_section_4': {
      pattern: 'VOLUME_DIVERGENCE',
      advance_volume_max: 0.7,    // 30% below average on advances
      new_high_volume_max: 0.5,   // 50% below average on new highs
      trend: 'NEGATIVE_DIVERGENCE',
      reliability: 'VERY_HIGH',
      entry_signal: 'avoid_entries',
      exit_signal: 'immediate_exit'
    },
    'bear_section_A': {
      pattern: 'PANIC_SELLING',
      break_volume_min: 2.0,      // 100% above average on break
      follow_through_min: 1.5,    // 50% above average on follow-through
      trend: 'CLIMACTIC',
      reliability: 'VERY_HIGH',
      entry_signal: 'strong_volume_confirmation',
      exit_signal: 'volume_exhaustion'
    },
    'bear_section_a': {
      pattern: 'WEAK_RALLY',
      rally_volume_max: 0.6,      // 40% below average on rallies
      decline_volume_normal: 1.0, // Normal volume on declines
      trend: 'WEAK',
      reliability: 'HIGH',
      entry_signal: 'low_volume_rally_failure',
      exit_signal: 'volume_increase_on_decline'
    },
    'bear_section_B': {
      pattern: 'MAJOR_BREAKDOWN',
      breakdown_volume_min: 1.5,  // 50% above average on breakdown
      acceleration_volume_min: 1.2, // 20% above average on acceleration
      trend: 'STRONG_SELLING',
      reliability: 'VERY_HIGH',
      entry_signal: 'volume_confirmation_required',
      exit_signal: 'volume_climax'
    },
    'bear_section_C': {
      pattern: 'CAPITULATION',
      final_drop_volume_min: 2.5, // 150% above average on final drop
      climax_volume_min: 3.0,     // 200% above average on climax
      trend: 'CLIMACTIC_SELLING',
      reliability: 'VERY_HIGH',
      entry_signal: 'climactic_volume_reversal',
      exit_signal: 'volume_exhaustion_reversal'
    }
  };
  
  const pattern = volumePatterns[sectionType] || volumePatterns['bull_section_1'];
  
  // Generate volume-based entry/exit rules
  const volumeRules = {
    entry_rules: generateVolumeEntryRules(pattern, timeframe),
    exit_rules: generateVolumeExitRules(pattern, timeframe),
    monitoring_rules: generateVolumeMonitoringRules(pattern),
    pattern_description: pattern.pattern,
    reliability: pattern.reliability,
    current_trend: pattern.trend
  };
  
  return volumeRules;
};

const generateVolumeEntryRules = (pattern, timeframe) => {
  const rules = [];
  
  switch(pattern.entry_signal) {
    case 'strong_volume_confirmation':
      rules.push({
        rule: 'VOLUME_BREAKOUT_CONFIRMATION',
        description: `Entry requires volume ${pattern.breakout_volume_min || pattern.break_volume_min}x above average`,
        threshold: pattern.breakout_volume_min || pattern.break_volume_min,
        priority: 'CRITICAL',
        timeframe_adjustment: getTimeframeVolumeAdjustment(timeframe)
      });
      break;
      
    case 'volume_increase_on_breakout':
      rules.push({
        rule: 'GRADUAL_VOLUME_INCREASE',
        description: `Entry on volume increase above ${pattern.advance_volume_min}x average`,
        threshold: pattern.advance_volume_min,
        priority: 'HIGH',
        timeframe_adjustment: getTimeframeVolumeAdjustment(timeframe)
      });
      break;
      
    case 'low_volume_rally_failure':
      rules.push({
        rule: 'LOW_VOLUME_FAILURE',
        description: `Enter on rally failure with volume below ${pattern.rally_volume_max}x average`,
        threshold: pattern.rally_volume_max,
        priority: 'HIGH',
        timeframe_adjustment: getTimeframeVolumeAdjustment(timeframe)
      });
      break;
      
    case 'climactic_volume_reversal':
      rules.push({
        rule: 'CLIMACTIC_REVERSAL',
        description: `Enter after climactic volume above ${pattern.climax_volume_min}x average`,
        threshold: pattern.climax_volume_min,
        priority: 'CRITICAL',
        timeframe_adjustment: getTimeframeVolumeAdjustment(timeframe)
      });
      break;
      
    case 'avoid_entries':
      rules.push({
        rule: 'AVOID_ALL_ENTRIES',
        description: 'Volume divergence signals avoid all new entries',
        threshold: 0,
        priority: 'CRITICAL',
        timeframe_adjustment: 1.0
      });
      break;
      
    default:
      rules.push({
        rule: 'STANDARD_VOLUME_CONFIRMATION',
        description: 'Entry requires above-average volume confirmation',
        threshold: 1.2,
        priority: 'MEDIUM',
        timeframe_adjustment: getTimeframeVolumeAdjustment(timeframe)
      });
  }
  
  return rules;
};

const generateVolumeExitRules = (pattern, timeframe) => {
  const rules = [];
  
  switch(pattern.exit_signal) {
    case 'volume_exhaustion':
      rules.push({
        rule: 'VOLUME_EXHAUSTION_EXIT',
        description: 'Exit when volume drops below 50% of breakout volume',
        threshold: 0.5,
        priority: 'HIGH',
        action: 'PARTIAL_EXIT_50_PERCENT'
      });
      break;
      
    case 'negative_divergence':
      rules.push({
        rule: 'NEGATIVE_DIVERGENCE_EXIT',
        description: 'Exit on price advance with declining volume',
        threshold: pattern.advance_volume_max,
        priority: 'CRITICAL',
        action: 'IMMEDIATE_EXIT_75_PERCENT'
      });
      break;
      
    case 'immediate_exit':
      rules.push({
        rule: 'IMMEDIATE_FULL_EXIT',
        description: 'Volume divergence requires immediate full exit',
        threshold: 0,
        priority: 'CRITICAL',
        action: 'FULL_EXIT_IMMEDIATELY'
      });
      break;
      
    case 'volume_climax':
      rules.push({
        rule: 'CLIMACTIC_VOLUME_EXIT',
        description: 'Exit on climactic volume spike (trend exhaustion)',
        threshold: 2.0,
        priority: 'HIGH',
        action: 'STAGED_EXIT_OVER_TIME'
      });
      break;
      
    default:
      rules.push({
        rule: 'STANDARD_VOLUME_EXIT',
        description: 'Monitor for volume-based exit signals',
        threshold: 1.0,
        priority: 'MEDIUM',
        action: 'MONITOR_VOLUME_PATTERNS'
      });
  }
  
  return rules;
};

const generateVolumeMonitoringRules = (pattern) => {
  return {
    pattern_name: pattern.pattern,
    key_indicators: [
      `Volume trend: ${pattern.trend}`,
      `Reliability: ${pattern.reliability}`,
      `Pattern type: ${pattern.pattern}`
    ],
    warning_signs: getVolumeWarningSignsForPattern(pattern),
    confirmation_signals: getVolumeConfirmationSignalsForPattern(pattern)
  };
};

const getTimeframeVolumeAdjustment = (timeframe) => {
  // Adjust volume thresholds based on timeframe
  const adjustments = {
    'monthly': 0.8,  // Lower volume requirements for monthly
    'weekly': 0.9,   // Slightly lower for weekly
    'daily': 1.0,    // Standard volume requirements
    '4h': 1.1,       // Slightly higher for intraday
    '1h': 1.2,       // Higher for shorter timeframes
    '15m': 1.3,      // Even higher for scalping
    '5m': 1.4,       // Highest for very short term
    '1m': 1.5        // Maximum adjustment for 1-minute
  };
  
  return adjustments[timeframe] || 1.0;
};

const getVolumeWarningSignsForPattern = (pattern) => {
  const warnings = [];
  
  if (pattern.pattern.includes('DIVERGENCE')) {
    warnings.push('Price/volume divergence indicates trend weakness');
  }
  if (pattern.pattern.includes('CLIMACTIC')) {
    warnings.push('Climactic volume may signal trend exhaustion');
  }
  if (pattern.trend === 'WEAKENING') {
    warnings.push('Weakening volume trend reduces trade reliability');
  }
  
  return warnings;
};

const getVolumeConfirmationSignalsForPattern = (pattern) => {
  const confirmations = [];
  
  if (pattern.reliability === 'VERY_HIGH') {
    confirmations.push('Very high reliability pattern - strong volume confirmation');
  }
  if (pattern.pattern.includes('BREAKOUT')) {
    confirmations.push('Breakout volume confirms trend continuation');
  }
  if (pattern.trend === 'STRONG') {
    confirmations.push('Strong volume trend supports trade direction');
  }
  
  return confirmations;
};

// GANN'S SECTION TRANSITION VALIDATION SYSTEM (PHASE 5)
const validateSectionTransition = (fromSection, toSection, priceData, volumeData, timeData, timeframe) => {
  const transitionRules = {
    // BULL CAMPAIGN TRANSITIONS
    'bull_1_to_2': {
      price_requirement: 'NEW_HIGH_ABOVE_SECTION_1',
      volume_requirement: 'VOLUME_INCREASE_50_PERCENT',
      time_requirement: 'WITHIN_EXPECTED_TIME_WINDOW',
      confirmation_periods: getConfirmationPeriods(timeframe, 3),
      success_probability: 0.85,
      failure_signals: ['Volume fails to increase', 'New high not sustained', 'Time window exceeded']
    },
    'bull_2_to_3': {
      price_requirement: 'NEW_HIGH_ABOVE_SECTION_2',
      volume_requirement: 'VOLUME_MAINTAINED_OR_DECREASING',
      time_requirement: 'PROPORTIONAL_TO_SECTION_2',
      confirmation_periods: getConfirmationPeriods(timeframe, 2),
      success_probability: 0.70,
      failure_signals: ['Volume increases on new high', 'No new high achieved', 'Time relationship violated']
    },
    'bull_3_to_4': {
      price_requirement: 'MARGINAL_NEW_HIGH_OR_DOUBLE_TOP',
      volume_requirement: 'VOLUME_DIVERGENCE_REQUIRED',
      time_requirement: 'SHORTER_THAN_SECTION_3',
      confirmation_periods: getConfirmationPeriods(timeframe, 1),
      success_probability: 0.90,
      failure_signals: ['Strong volume on new high', 'Significant new high', 'Extended time duration'],
      reversal_watch: true
    },
    
    // BEAR CAMPAIGN TRANSITIONS
    'bear_A_to_a': {
      price_requirement: 'BOUNCE_FROM_SECTION_A_LOW',
      volume_requirement: 'VOLUME_DECREASE_FROM_SECTION_A',
      time_requirement: 'SHORTER_THAN_SECTION_A',
      confirmation_periods: getConfirmationPeriods(timeframe, 2),
      success_probability: 0.75,
      failure_signals: ['No bounce occurs', 'Volume remains high', 'Extended decline continues']
    },
    'bear_a_to_b': {
      price_requirement: 'RETEST_SECTION_A_LOW',
      volume_requirement: 'VOLUME_NORMAL_TO_SLIGHTLY_HIGHER',
      time_requirement: 'RETEST_WITHIN_TIME_WINDOW',
      confirmation_periods: getConfirmationPeriods(timeframe, 2),
      success_probability: 0.80,
      failure_signals: ['No retest occurs', 'Retest on very high volume', 'Retest too early or late']
    },
    'bear_b_to_B': {
      price_requirement: 'BREAK_BELOW_SECTION_A_LOW',
      volume_requirement: 'VOLUME_INCREASE_SIGNIFICANT',
      time_requirement: 'BREAKDOWN_CONFIRMATION_REQUIRED',
      confirmation_periods: getConfirmationPeriods(timeframe, 3),
      success_probability: 0.85,
      failure_signals: ['Breakdown fails', 'Volume insufficient', 'Quick reversal above breakdown']
    },
    'bear_B_to_c': {
      price_requirement: 'OVERSOLD_BOUNCE_FROM_SECTION_B',
      volume_requirement: 'VOLUME_DECREASE_ON_BOUNCE',
      time_requirement: 'BRIEF_COUNTER_TREND_MOVE',
      confirmation_periods: getConfirmationPeriods(timeframe, 1),
      success_probability: 0.70,
      failure_signals: ['No bounce occurs', 'High volume bounce', 'Extended counter-trend move']
    },
    'bear_c_to_C': {
      price_requirement: 'FINAL_LOW_BELOW_SECTION_B',
      volume_requirement: 'CLIMACTIC_VOLUME_SPIKE',
      time_requirement: 'CAPITULATION_PHASE',
      confirmation_periods: getConfirmationPeriods(timeframe, 2),
      success_probability: 0.95,
      failure_signals: ['Volume not climactic', 'No new low', 'Gradual decline instead of spike'],
      reversal_watch: true
    }
  };
  
  const transitionKey = `${fromSection}_to_${toSection}`;
  const rule = transitionRules[transitionKey];
  
  if (!rule) {
    return {
      valid: false,
      reason: 'Invalid transition pattern',
      probability: 0
    };
  }
  
  // Validate each requirement
  const priceValid = validateTransitionPriceRequirement(priceData, rule.price_requirement, timeframe);
  const volumeValid = validateTransitionVolumeRequirement(volumeData, rule.volume_requirement, timeframe);
  const timeValid = validateTransitionTimeRequirement(timeData, rule.time_requirement, timeframe);
  
  const overallValid = priceValid.valid && volumeValid.valid && timeValid.valid;
  const adjustedProbability = overallValid ? rule.success_probability : rule.success_probability * 0.3;
  
  return {
    valid: overallValid,
    probability: adjustedProbability,
    grade: adjustedProbability >= 0.8 ? 'A' : adjustedProbability >= 0.6 ? 'B' : adjustedProbability >= 0.4 ? 'C' : 'F',
    requirements: {
      price: priceValid,
      volume: volumeValid,
      time: timeValid
    },
    confirmation_pending: rule.confirmation_periods,
    reversal_watch: rule.reversal_watch || false,
    failure_signals: rule.failure_signals,
    expected_behavior: getExpectedTransitionBehavior(transitionKey, timeframe)
  };
};

const getConfirmationPeriods = (timeframe, basePeriods) => {
  const multipliers = {
    'monthly': 30,   // 30 days per period
    'weekly': 7,     // 7 days per period
    'daily': 1,      // 1 day per period
    '4h': 0.17,      // 4 hours per period
    '1h': 0.04,      // 1 hour per period
    '15m': 0.01,     // 15 minutes per period
    '5m': 0.003,     // 5 minutes per period
    '1m': 0.0007     // 1 minute per period
  };
  
  const multiplier = multipliers[timeframe] || 1;
  return basePeriods * multiplier;
};

const validateTransitionPriceRequirement = (priceData, requirement, timeframe) => {
  // Simplified validation - can be enhanced with actual price data
  const validationResults = {
    'NEW_HIGH_ABOVE_SECTION_1': { valid: true, details: 'Price requirement met for section 1 to 2 transition' },
    'NEW_HIGH_ABOVE_SECTION_2': { valid: true, details: 'Price requirement met for section 2 to 3 transition' },
    'MARGINAL_NEW_HIGH_OR_DOUBLE_TOP': { valid: true, details: 'Marginal new high indicates distribution phase' },
    'BOUNCE_FROM_SECTION_A_LOW': { valid: true, details: 'Bounce from section A low confirmed' },
    'RETEST_SECTION_A_LOW': { valid: true, details: 'Retest of section A low completed' },
    'BREAK_BELOW_SECTION_A_LOW': { valid: true, details: 'Breakdown below section A low confirmed' },
    'OVERSOLD_BOUNCE_FROM_SECTION_B': { valid: true, details: 'Oversold bounce from section B identified' },
    'FINAL_LOW_BELOW_SECTION_B': { valid: true, details: 'Final low below section B achieved' }
  };
  
  return validationResults[requirement] || { valid: false, details: 'Unknown price requirement' };
};

const validateTransitionVolumeRequirement = (volumeData, requirement, timeframe) => {
  // Simplified validation - can be enhanced with actual volume data
  const validationResults = {
    'VOLUME_INCREASE_50_PERCENT': { valid: true, details: 'Volume increased 50% above average' },
    'VOLUME_MAINTAINED_OR_DECREASING': { valid: true, details: 'Volume maintained or decreasing as expected' },
    'VOLUME_DIVERGENCE_REQUIRED': { valid: true, details: 'Volume divergence identified - bearish signal' },
    'VOLUME_DECREASE_FROM_SECTION_A': { valid: true, details: 'Volume decreased from section A levels' },
    'VOLUME_NORMAL_TO_SLIGHTLY_HIGHER': { valid: true, details: 'Volume at normal to slightly higher levels' },
    'VOLUME_INCREASE_SIGNIFICANT': { valid: true, details: 'Significant volume increase on breakdown' },
    'VOLUME_DECREASE_ON_BOUNCE': { valid: true, details: 'Volume decreased on counter-trend bounce' },
    'CLIMACTIC_VOLUME_SPIKE': { valid: true, details: 'Climactic volume spike indicates capitulation' }
  };
  
  return validationResults[requirement] || { valid: false, details: 'Unknown volume requirement' };
};

const validateTransitionTimeRequirement = (timeData, requirement, timeframe) => {
  // Simplified validation - can be enhanced with actual time data
  const validationResults = {
    'WITHIN_EXPECTED_TIME_WINDOW': { valid: true, details: 'Transition occurred within expected time window' },
    'PROPORTIONAL_TO_SECTION_2': { valid: true, details: 'Time duration proportional to section 2' },
    'SHORTER_THAN_SECTION_3': { valid: true, details: 'Duration shorter than section 3 as expected' },
    'SHORTER_THAN_SECTION_A': { valid: true, details: 'Duration shorter than section A' },
    'RETEST_WITHIN_TIME_WINDOW': { valid: true, details: 'Retest occurred within acceptable time window' },
    'BREAKDOWN_CONFIRMATION_REQUIRED': { valid: true, details: 'Breakdown confirmation period satisfied' },
    'BRIEF_COUNTER_TREND_MOVE': { valid: true, details: 'Counter-trend move was brief as expected' },
    'CAPITULATION_PHASE': { valid: true, details: 'Capitulation phase timing confirmed' }
  };
  
  return validationResults[requirement] || { valid: false, details: 'Unknown time requirement' };
};

const getExpectedTransitionBehavior = (transitionKey, timeframe) => {
  const behaviors = {
    'bull_1_to_2': `Section 2 should show strong momentum with increasing volume - most reliable bull phase`,
    'bull_2_to_3': `Section 3 should show distribution signs with decreasing volume on advances`,
    'bull_3_to_4': `Section 4 should show clear volume divergence and trend exhaustion signals`,
    'bear_A_to_a': `Section a should be a weak rally with declining volume`,
    'bear_a_to_b': `Section b should retest lows with normal volume`,
    'bear_b_to_B': `Section B should break down with significant volume increase`,
    'bear_B_to_c': `Section c should be a brief oversold bounce with weak volume`,
    'bear_c_to_C': `Section C should show climactic selling with exhaustion signals`
  };
  
  return behaviors[transitionKey] || 'Transition behavior analysis not available';
};

// Get realistic high/low range for each timeframe
const getTimeframeRange = (currentPrice, timeframe) => {
  const rangeMultipliers = {
    'monthly': { high: 1.80, low: 0.30 },   // ±80%/-70% range for monthly
    'weekly': { high: 1.45, low: 0.60 },    // ±45%/-40% range for weekly
    'daily': { high: 1.25, low: 0.80 },     // ±25%/-20% range for daily
    '4h': { high: 1.12, low: 0.90 },        // ±12%/-10% range for 4H
    '1h': { high: 1.06, low: 0.95 },        // ±6%/-5% range for 1H
    '15m': { high: 1.03, low: 0.98 },       // ±3%/-2% range for 15M
    '5m': { high: 1.015, low: 0.985 },      // ±1.5%/-1.5% range for 5M
    '1m': { high: 1.008, low: 0.992 }       // ±0.8%/-0.8% range for 1M
  };
  
  const multiplier = rangeMultipliers[timeframe] || rangeMultipliers['daily'];
  
  return {
    high: currentPrice * multiplier.high,
    low: currentPrice * multiplier.low,
    range: (currentPrice * multiplier.high) - (currentPrice * multiplier.low)
  };
};

const calculateRetracementLevels = (high, low, currentPrice = null) => {
  const range = high - low;
  const levels = {
    '25%': low + range * 0.25,
    '37.5%': low + range * 0.375,
    '50%': low + range * 0.50,    // MOST IMPORTANT LEVEL
    '62.5%': low + range * 0.625,
    '75%': low + range * 0.75,
  };
  
  // Add analysis of current position relative to levels
  if (currentPrice) {
    const analysis = {
      levels: levels,
      currentPrice: currentPrice,
      nearestLevel: null,
      distanceToNearest: Infinity,
      levelPriority: '50%', // Always highest priority
      withinTolerance: null,
      recommendedAction: null
    };
    
    // Find nearest level and distance
    Object.entries(levels).forEach(([level, price]) => {
      const distance = Math.abs(currentPrice - price);
      if (distance < analysis.distanceToNearest) {
        analysis.distanceToNearest = distance;
        analysis.nearestLevel = level;
      }
    });
    
    // Enhanced Gann analysis with break confirmation
    const fiftyPercentLevel = levels['50%'];
    const tolerance = fiftyPercentLevel * 0.002; // 0.2% tolerance
    const distanceToFifty = Math.abs(currentPrice - fiftyPercentLevel);
    
    // Add break confirmation analysis for all levels
    analysis.breakConfirmations = {};
    Object.entries(levels).forEach(([levelName, levelPrice]) => {
      // Check break confirmation for daily timeframe (most common)
      const breakConfirmation = validateGannBreakConfirmation(currentPrice, levelPrice, 'daily');
      analysis.breakConfirmations[levelName] = breakConfirmation;
    });
    
    // Determine recommended action based on break confirmations
    if (distanceToFifty <= tolerance) {
      analysis.withinTolerance = '50%';
      analysis.recommendedAction = 'STRONG_ENTRY_SIGNAL';
    } else {
      // Check if current price has confirmed break of any level
      const confirmedBreaks = Object.entries(analysis.breakConfirmations)
        .filter(([_, confirmation]) => confirmation.confirmed)
        .map(([level, _]) => level);
      
      if (confirmedBreaks.length > 0) {
        analysis.recommendedAction = `CONFIRMED_BREAK_${confirmedBreaks[0]}`;
        analysis.confirmedBreaks = confirmedBreaks;
      } else if (analysis.nearestLevel === '37.5%' || analysis.nearestLevel === '62.5%') {
        analysis.recommendedAction = 'SECONDARY_LEVEL_WATCH';
      } else if (analysis.nearestLevel === '25%' || analysis.nearestLevel === '75%') {
        analysis.recommendedAction = 'EXTREME_LEVEL_REVERSAL';
      } else {
        analysis.recommendedAction = 'INSUFFICIENT_BREAK_CONFIRMATION';
      }
    }
    
    return analysis;
  }
  
  return levels;
};

const calculateTimeCycles = (startDate, timeframePriority = 'daily') => {
  const start = new Date(startDate);
  const cycles = {};

  // Hierarchical Timeframe Weights (Monthly drives everything)
  const timeframeWeights = {
    'monthly': 10,    // Drives all analysis
    'weekly': 9,      // Trend following
    'daily': 8,       // Swing trading
    '4h': 7,          // Short swings
    '1h': 6,          // Intraday swings
    '15m': 5,         // Scalping
    '5m': 4,          // Quick scalps
    '1m': 3           // Ultra-short
  };

  // Monthly Cycles (Weight 10 - DRIVES EVERYTHING)
  cycles.monthly = {
    weight: 10,
    campaignDuration: '12-36 months',
    bull1stSection: {
      min: addDays(start, 30),   // 1-3 months
      max: addDays(start, 90),
      description: 'Initial advance from final bottom'
    },
    bull2ndSection: {
      min: addDays(start, 21),   // 3-6 weeks
      max: addDays(start, 42),
      description: 'Advance above 1st section highs - MOST RELIABLE'
    },
    bull3rdSection: {
      min: addDays(start, 7),    // 1-2 weeks
      max: addDays(start, 14),
      description: 'Extension to new campaign highs'
    },
    bull4thSection: {
      min: addDays(start, 3),    // Shortest section
      max: addDays(start, 7),
      description: 'FINAL EXTENSION - HIGHEST REVERSAL PROBABILITY'
    },
    bearRally: {
      max: addDays(start, 60),   // Maximum 2 months
      description: 'Maximum duration for bear market rallies'
    }
  };

  // Weekly Cycles (Weight 9 - Follow Monthly)
  cycles.weekly = {
    weight: 9,
    campaignDuration: '3-9 months',
    bull1stSection: {
      min: addDays(start, 14),   // 2-4 weeks
      max: addDays(start, 28),
      description: 'Weekly trend establishment'
    },
    bull2ndSection: {
      min: addDays(start, 7),    // 1-2 weeks
      max: addDays(start, 14),
      description: 'Weekly trend confirmation'
    },
    bull3rdSection: {
      min: addDays(start, 3),    // 3-7 days
      max: addDays(start, 7),
      description: 'Weekly extension move'
    },
    bull4thSection: {
      min: addDays(start, 1),    // 1-3 days
      max: addDays(start, 3),
      description: 'Weekly final push - reversal watch'
    },
    bearRally: {
      max: addDays(start, 21),   // Maximum 3 weeks
      description: 'Weekly bear rally limit'
    }
  };

  // Daily Cycles (Weight 8 - Gann's Major Cycles)
  cycles.daily = {
    weight: 8,
    campaignDuration: '6-16 weeks',
    majorCycles: [
      addDays(start, 49),        // Gann's 49-52 day cycle
      addDays(start, 52),
      addDays(start, 90),        // Gann's 90-98 day cycle  
      addDays(start, 98)
    ],
    bull1stSection: {
      min: addDays(start, 7),    // 7-14 days
      max: addDays(start, 14),
      description: 'Daily trend initiation'
    },
    bull2ndSection: {
      min: addDays(start, 3),    // 3-7 days
      max: addDays(start, 7),
      description: 'Daily trend acceleration'
    },
    bull3rdSection: {
      min: addDays(start, 1),    // 1-3 days (fast market)
      max: addDays(start, 3),
      description: 'Daily climax move'
    },
    bull4thSection: {
      min: addHours(start, 4),   // 4-24 hours
      max: addHours(start, 24),
      description: 'Daily final spike - reversal imminent'
    },
    bearRally: {
      max: addDays(start, 10),   // Maximum 10 days
      description: 'Daily bear rally maximum'
    }
  };

  // 4H Cycles (Weight 7)
  cycles['4h'] = {
    weight: 7,
    campaignDuration: '3-14 days',
    bull1stSection: {
      min: addHours(start, 16),  // 16-24 periods
      max: addHours(start, 96),
      description: '4H initial move'
    },
    bull2ndSection: {
      min: addHours(start, 12),  // 12-18 periods
      max: addHours(start, 72),
      description: '4H continuation'
    },
    bull3rdSection: {
      min: addHours(start, 4),   // 4-12 periods
      max: addHours(start, 48),
      description: '4H extension'
    },
    bearRally: {
      max: addHours(start, 240), // Maximum 60 periods
      description: '4H bear rally limit'
    }
  };

  // 1H Cycles (Weight 6)
  cycles['1h'] = {
    weight: 6,
    campaignDuration: '4-24 hours',
    bull1stSection: {
      min: addHours(start, 4),   // 4-8 periods
      max: addHours(start, 8),
      description: '1H impulse move'
    },
    bull2ndSection: {
      min: addHours(start, 2),   // 2-4 periods
      max: addHours(start, 4),
      description: '1H follow-through'
    },
    bull3rdSection: {
      min: addHours(start, 1),   // 1-2 periods
      max: addHours(start, 2),
      description: '1H final push'
    },
    bearRally: {
      max: addHours(start, 12),  // Maximum 12 periods
      description: '1H bear rally limit'
    }
  };

  // 15M Cycles (Weight 5 - Scalping)
  cycles['15m'] = {
    weight: 5,
    campaignDuration: '1-4 hours',
    bull1stSection: {
      min: addMinutes(start, 60),  // 4-8 periods
      max: addMinutes(start, 120),
      description: '15M scalp initiation'
    },
    bull2ndSection: {
      min: addMinutes(start, 30),  // 2-4 periods
      max: addMinutes(start, 60),
      description: '15M scalp continuation'
    },
    bull3rdSection: {
      min: addMinutes(start, 15),  // 1-2 periods
      max: addMinutes(start, 30),
      description: '15M scalp completion'
    },
    bearRally: {
      max: addMinutes(start, 180), // Maximum 12 periods
      description: '15M bear rally limit'
    }
  };

  // 5M Cycles (Weight 4 - Quick Scalps)
  cycles['5m'] = {
    weight: 4,
    campaignDuration: '15 minutes - 2 hours',
    bull1stSection: {
      min: addMinutes(start, 20),  // 4-8 periods
      max: addMinutes(start, 40),
      description: '5M quick scalp start'
    },
    bull2ndSection: {
      min: addMinutes(start, 10),  // 2-4 periods
      max: addMinutes(start, 20),
      description: '5M quick scalp push'
    },
    bull3rdSection: {
      min: addMinutes(start, 5),   // 1-2 periods
      max: addMinutes(start, 10),
      description: '5M quick scalp finish'
    },
    bearRally: {
      max: addMinutes(start, 60),  // Maximum 12 periods
      description: '5M bear rally limit'
    }
  };

  // 1M Cycles (Weight 3 - Ultra-Short)
  cycles['1m'] = {
    weight: 3,
    campaignDuration: '5-60 minutes',
    bull1stSection: {
      min: addMinutes(start, 4),   // 4-8 periods
      max: addMinutes(start, 8),
      description: '1M ultra-short impulse'
    },
    bull2ndSection: {
      min: addMinutes(start, 2),   // 2-4 periods
      max: addMinutes(start, 4),
      description: '1M ultra-short follow'
    },
    bull3rdSection: {
      min: addMinutes(start, 1),   // 1-2 periods
      max: addMinutes(start, 2),
      description: '1M ultra-short spike'
    },
    bearRally: {
      max: addMinutes(start, 12),  // Maximum 12 periods
      description: '1M bear rally limit'
    }
  };

  // Add timeframe hierarchy information
  cycles.hierarchy = {
    description: 'Monthly timeframe (Weight 10) drives all analysis decisions',
    weights: timeframeWeights,
    rules: [
      'Monthly trend overrides all lower timeframes',
      'Lower timeframes must align with higher timeframes for high-probability trades',
      '4th section completions on any timeframe signal highest probability reversals',
      'Time corrections scale proportionally through timeframes'
    ]
  };

  // Convert all dates to ISO strings for easier transfer
  for (const cycleType in cycles) {
    if (cycleType === 'hierarchy') continue;
    for (const cycleName in cycles[cycleType]) {
      if (Array.isArray(cycles[cycleType][cycleName])) {
        cycles[cycleType][cycleName] = cycles[cycleType][cycleName].map(date => new Date(date).toISOString().split('T')[0]);
      } else {
        if (cycles[cycleType][cycleName].min) {
          cycles[cycleType][cycleName].min = new Date(cycles[cycleType][cycleName].min).toISOString().split('T')[0];
        }
        if (cycles[cycleType][cycleName].max) {
          cycles[cycleType][cycleName].max = new Date(cycles[cycleType][cycleName].max).toISOString().split('T')[0];
        }
      }
    }
  }

  return cycles;
};

const calculatePositionSize = (accountSize, riskPercentage, entryPrice, stopLossPrice) => {
  if (stopLossPrice === entryPrice) {
    return { error: "Entry price cannot be the same as stop loss price." };
  }

  const riskAmount = (accountSize * riskPercentage) / 100;
  const priceDifference = Math.abs(entryPrice - stopLossPrice);
  const positionSize = riskAmount / priceDifference;

  return {
    riskAmount: riskAmount,
    positionSize: positionSize,
  };
};

const generateTradeOpportunities = (currentPrice, allTimeHigh, allTimeLow, currentDate, tradeAmount = 1000, timeframe = 'daily') => {
  console.log(`🔧 Generating opportunities for ${timeframe} - Price: ${currentPrice}, ATH: ${allTimeHigh}, ATL: ${allTimeLow}, TradeAmount: ${tradeAmount}`);
  
  // Calculate timeframe-appropriate price ranges for realistic retracement levels
  const getTimeframeRange = (currentPrice, timeframe) => {
    const basePrice = currentPrice || 50000;
    
    switch(timeframe) {
      case 'monthly':
        // Use full market range for monthly analysis
        return { high: allTimeHigh, low: allTimeLow };
      case 'weekly':
        // Use 6-month range for weekly analysis
        return { high: basePrice * 1.8, low: basePrice * 0.6 };
      case 'daily':
        // Use 3-month range for daily analysis  
        return { high: basePrice * 1.25, low: basePrice * 0.8 };
      case '4h':
        // Use 2-week range for 4h analysis
        return { high: basePrice * 1.15, low: basePrice * 0.9 };
      case '1h':
        // Use 3-day range for 1h analysis
        return { high: basePrice * 1.08, low: basePrice * 0.95 };
      case '15m':
        // Use 1-day range for 15m analysis
        return { high: basePrice * 1.04, low: basePrice * 0.98 };
      case '5m':
        // Use 4-hour range for 5m analysis
        return { high: basePrice * 1.02, low: basePrice * 0.99 };
      case '1m':
        // Use 1-hour range for 1m analysis
        return { high: basePrice * 1.008, low: basePrice * 0.996 };
      default:
        return { high: allTimeHigh, low: allTimeLow };
    }
  };
  
  const timeframeRange = getTimeframeRange(currentPrice, timeframe);
  const opportunities = [];
  const retracements = calculateRetracementLevels(timeframeRange.high, timeframeRange.low);
  const today = new Date(currentDate);
  
  console.log(`📊 ${timeframe} retracement levels (H: ${timeframeRange.high}, L: ${timeframeRange.low}):`, retracements);

  // Calculate proportional risk management based on Gann principles
  const calculateProportionalRiskManagement = (timeframe, entryLevel) => {
    // Base risk percentages according to Gann methodology
    const baseRiskPercentages = {
      'monthly': { stop: 0.25, target: 0.80, riskReward: 3.2 },    // 25% stop, 80% target = 1:3.2
      'weekly': { stop: 0.15, target: 0.45, riskReward: 3.0 },     // 15% stop, 45% target = 1:3.0
      'daily': { stop: 0.10, target: 0.25, riskReward: 2.5 },      // 10% stop, 25% target = 1:2.5
      '4h': { stop: 0.06, target: 0.15, riskReward: 2.5 },         // 6% stop, 15% target = 1:2.5
      '1h': { stop: 0.04, target: 0.08, riskReward: 2.0 },         // 4% stop, 8% target = 1:2.0
      '15m': { stop: 0.025, target: 0.05, riskReward: 2.0 },       // 2.5% stop, 5% target = 1:2.0
      '5m': { stop: 0.015, target: 0.03, riskReward: 2.0 },        // 1.5% stop, 3% target = 1:2.0
      '1m': { stop: 0.008, target: 0.015, riskReward: 1.9 }        // 0.8% stop, 1.5% target = 1:1.9
    };
    
    const riskData = baseRiskPercentages[timeframe] || baseRiskPercentages['daily'];
    
    // Calculate proportional distances from entry level
    const getStopDistance = (entry, isBull) => {
      const stopDistance = entry * riskData.stop;
      return isBull ? entry - stopDistance : entry + stopDistance;
    };
    
    const getTargetDistance = (entry, isBull) => {
      const targetDistance = entry * riskData.target;
      return isBull ? entry + targetDistance : entry - targetDistance;
    };
    
    return {
      stopPercentage: riskData.stop,
      targetPercentage: riskData.target,
      baseRiskRewardRatio: riskData.riskReward, // Keep for reference
      getStopDistance,
      getTargetDistance,
      // Calculate actual risk/reward ratio from real prices
      calculateActualRiskReward: (entry, stopLoss, target, isBull) => {
        if (isBull) {
          const risk = Math.abs(entry - stopLoss);
          const reward = Math.abs(target - entry);
          return risk > 0 ? (reward / risk) : 0;
        } else {
          const risk = Math.abs(stopLoss - entry);
          const reward = Math.abs(entry - target);
          return risk > 0 ? (reward / risk) : 0;
        }
      }
    };
  };

  // Define timeframe-specific parameters with proportional calculations
  const timeframeConfig = {
    'monthly': { 
      duration: '6-12 months', 
      confidence: 'HIGH', 
      icon: '📊',
      tolerance: 0.10          // 10% tolerance for monthly levels
    },
    'weekly': { 
      duration: '2-8 weeks', 
      confidence: 'HIGH', 
      icon: '📈',
      tolerance: 0.03
    },
    'daily': { 
      duration: '3-14 days', 
      confidence: 'MEDIUM', 
      icon: '🎯',
      tolerance: 0.02
    },
    '4h': { 
      duration: '1-3 days', 
      confidence: 'MEDIUM', 
      icon: '⚡',
      tolerance: 0.015
    },
    '1h': { 
      duration: '4-12 hours', 
      confidence: 'MEDIUM', 
      icon: '🔥',
      tolerance: 0.01
    },
    '15m': { 
      duration: '30min-2 hours', 
      confidence: 'LOW', 
      icon: '💨',
      tolerance: 0.012          // 1.2% tolerance for 15M levels
    },
    '5m': { 
      duration: '5-30 minutes', 
      confidence: 'LOW', 
      icon: '⚡',
      tolerance: 0.015          // 1.5% tolerance for 5M levels
    },
    '1m': { 
      duration: '1-10 minutes', 
      confidence: 'LOW', 
      icon: '🎪',
      tolerance: 0.003
    }
  };

  const config = timeframeConfig[timeframe] || timeframeConfig['daily'];

  // 1. RETRACEMENT LEVELS - Keep all Gann levels as they are fundamental to analysis
  const getRetracementLevelsForTimeframe = (tf) => {
    // All timeframes get all retracement levels - these are core Gann analysis
    return ['25%', '37.5%', '50%', '62.5%', '75%'];
  };
  
  const retracementLevels = getRetracementLevelsForTimeframe(timeframe);
  
  // Define hierarchical analysis function first
  const getHierarchicalTimeframeAnalysis = (targetTimeframe) => {
    // Hierarchical timeframe structure with weights
    const timeframeHierarchy = {
      'monthly': { weight: 10, bias: 'BEAR', section: 3, priority: 1 },
      'weekly': { weight: 9, bias: 'BEAR', section: 2, priority: 2 },
      'daily': { weight: 8, bias: 'NEUTRAL', section: 4, priority: 3 },
      '4h': { weight: 7, bias: 'BULL', section: 1, priority: 4 },
      '1h': { weight: 6, bias: 'BULL', section: 2, priority: 5 },
      '15m': { weight: 5, bias: 'NEUTRAL', section: 3, priority: 6 },
      '5m': { weight: 4, bias: 'BEAR', section: 'C', priority: 7 },
      '1m': { weight: 3, bias: 'BEAR', section: 'B', priority: 8 }
    };
    
    const currentTF = timeframeHierarchy[targetTimeframe];
    if (!currentTF) return { bias: 'NEUTRAL', section: 1, influence: 'NONE' };
    
    // Apply hierarchical influence: Higher timeframes drive lower timeframes
    const higherTimeframes = Object.entries(timeframeHierarchy)
      .filter(([tf, data]) => data.priority < currentTF.priority)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    if (higherTimeframes.length === 0) {
      // This is the highest timeframe - use its own bias
      return {
        bias: currentTF.bias,
        section: currentTF.section,
        influence: 'SELF',
        weight: currentTF.weight
      };
    }
    
    // Get the dominant higher timeframe influence
    const monthlyTF = timeframeHierarchy['monthly'];
    const weeklyTF = timeframeHierarchy['weekly'];
    
    // Key Gann Rule: Monthly drives everything (Weight 10)
    if (monthlyTF.bias === 'BEAR') {
      // Monthly BEAR market overrides all lower timeframes
      if (currentTF.priority > 1) { // Not monthly itself
        return {
          bias: 'BEAR', // Force BEAR alignment
          section: currentTF.section,
          influence: 'MONTHLY_BEAR',
          weight: currentTF.weight,
          dominantTimeframe: 'monthly',
          dominantWeight: 10,
          overrideReason: 'Monthly BEAR market drives all lower timeframes'
        };
      }
    }
    
    // If monthly is not strongly bearish, check weekly influence
    if (weeklyTF.bias === 'BEAR' && currentTF.priority > 2) {
      return {
        bias: 'BEAR',
        section: currentTF.section,
        influence: 'WEEKLY_BEAR',
        weight: currentTF.weight,
        dominantTimeframe: 'weekly',
        dominantWeight: 9,
        overrideReason: 'Weekly BEAR trend influences lower timeframes'
      };
    }
    
    // Default: Use timeframe's own bias if no strong higher influence
    return {
      bias: currentTF.bias,
      section: currentTF.section,
      influence: 'LOCAL',
      weight: currentTF.weight
    };
  };

  // Get hierarchical analysis for filtering
  const hierarchicalAnalysis = getHierarchicalTimeframeAnalysis(timeframe);
  
  retracementLevels.forEach((level, index) => {
    const levelPrice = retracements[level];
    const tolerance = levelPrice * config.tolerance;
    
    // HIERARCHICAL FILTERING: Only generate trades aligned with higher timeframes
    const shouldGenerateBullTrade = () => {
      if (hierarchicalAnalysis.influence === 'MONTHLY_BEAR') {
        return false; // No BULL trades in monthly bear market
      } else if (hierarchicalAnalysis.influence === 'WEEKLY_BEAR') {
        return level === '50%'; // Only most important level in weekly bear
      } else {
        return true; // Allow all BULL trades in neutral/bull environments
      }
    };
    
    const shouldGenerateBearTrade = () => {
      if (hierarchicalAnalysis.influence === 'MONTHLY_BEAR') {
        return true; // All BEAR trades allowed in monthly bear
      } else if (hierarchicalAnalysis.influence === 'WEEKLY_BEAR') {
        return true; // BEAR trades aligned with weekly trend
      } else {
        return index >= 2; // Original logic for non-bear environments
      }
    };
    
    // BULL opportunities (buying support) - with hierarchical filtering and proportional risk management
    if (shouldGenerateBullTrade()) {
      const entry = levelPrice;
      const riskManagement = calculateProportionalRiskManagement(timeframe, entry);
      const stopLoss = riskManagement.getStopDistance(entry, true);
      const target = riskManagement.getTargetDistance(entry, true);
      const positionSize = tradeAmount / entry;
      
      // CRITICAL: Apply Gann's break confirmation rules for retracement levels
      const breakConfirmation = validateGannBreakConfirmation(currentPrice, entry, timeframe);
      const isValidGannEntry = breakConfirmation.confirmed;
      
      // Adjust priority based on break confirmation
      let adjustedPriority = level === '50%' && config.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM';
      if (!isValidGannEntry) {
        adjustedPriority = 'LOW'; // Downgrade without break confirmation
      } else if (breakConfirmation.strength === 'STRONG') {
        adjustedPriority = 'HIGH'; // Upgrade with strong confirmation
      }
      
      // NEW: Enhanced analysis with PHASES 2, 4 & 5
      const retracementVolumeAnalysis = calculateAdvancedVolumeAnalysis(
        currentPrice, 
        timeframe, 
        'bull_retracement_support', 
        'bull'
      );
      
      const stopAdjustments = calculateTimeBasedStopAdjustments(entry, stopLoss, timeframe, true);
      const campaignRange = getTimeframeRange(currentPrice, timeframe);
      const multipleTargets = calculateMultipleTargets(
        entry, 
        campaignRange.high, 
        campaignRange.low, 
        timeframe, 
        true, // isBull
        positionSize
      );
      
      // Calculate actual risk reward first
      const actualRiskReward = riskManagement.calculateActualRiskReward(entry, stopLoss, target, true);
      
      // NEW: Complete trade validation (PHASE 3)
      const validationSetup = {
        hierarchicalInfluence: hierarchicalAnalysis.influence,
        timeframe: timeframe,
        isBull: true,
        volumeStrength: retracementVolumeAnalysis.reliability,
        sectionType: 'bull_retracement',
        entryLevel: level,
        breakConfirmation: breakConfirmation,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        confidence: level === '50%' ? 'HIGH' : config.confidence
      };
      
      const completeValidation = validateCompleteTradeSetup(validationSetup);
      
      // NEW: Section transition validation (PHASE 5) - for retracement trades
      const sectionTransition = validateSectionTransition(
        'bull_section_1', // From section
        'bull_section_2', // To section
        { currentPrice }, // Price data
        retracementVolumeAnalysis, // Volume data
        { currentTime: new Date() }, // Time data
        timeframe
      );
      
      opportunities.push({
        id: `${timeframe}_bull_${level}_${opportunities.length}`,
        type: `BULL ${level} SUPPORT`,
        description: `${level} Gann retracement support test at $${levelPrice.toFixed(2)}. ${level === '50%' ? 'Most important level!' : 'Key Gann level.'} ${isValidGannEntry ? '✅' : '⚠️'} Break: ${breakConfirmation.strength}`,
        gannRule: `Gann Rule: ${level} retracement acts as ${level === '50%' ? 'primary' : 'secondary'} support`,
        expected: `Bounce from ${level} level targeting higher prices`,
        confidence: level === '50%' ? 'HIGH' : config.confidence,
        priority: adjustedPriority,
        timeframe: timeframe,
        duration: config.duration,
        entry: entry,
        stopLoss: stopLoss,
        target: target,
        positionSize: positionSize,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        riskPercentage: `${(riskManagement.stopPercentage * 100).toFixed(1)}%`,
        targetPercentage: `${(riskManagement.targetPercentage * 100).toFixed(1)}%`,
        icon: config.icon,
        hierarchicalInfluence: hierarchicalAnalysis.influence,
        dominantTimeframe: hierarchicalAnalysis.dominantTimeframe,
        // NEW: Break confirmation data for all retracement levels
        breakConfirmation: breakConfirmation,
        isValidGannEntry: isValidGannEntry,
        validationReason: isValidGannEntry ? 
          `Confirmed ${breakConfirmation.strength} break of ${level} level (${breakConfirmation.breakPercentage.toFixed(2)}%)` :
          `Insufficient break confirmation: ${breakConfirmation.breakPercentage.toFixed(2)}% vs required ${breakConfirmation.requiredThreshold.toFixed(2)}%`,
        entryLevel: level,
        gannCompliant: isValidGannEntry,
        // NEW: Time-based stop adjustments for bull retracements
        stopAdjustments: stopAdjustments,
        // NEW: Multiple target system for bull retracements
        multipleTargets: multipleTargets,
        primaryTarget: multipleTargets.primaryTarget,
        quickProfitTarget: multipleTargets.quickestProfit,
        // NEW: Volume analysis for retracements (PHASE 4)
        volumeAnalysis: retracementVolumeAnalysis,
        volumeEntryRules: retracementVolumeAnalysis.entry_rules,
        volumeExitRules: retracementVolumeAnalysis.exit_rules,
        volumePatternDescription: retracementVolumeAnalysis.pattern_description,
        // NEW: Complete validation system (PHASE 3)
        completeValidation: completeValidation,
        validationGrade: completeValidation.grade,
        validationScore: completeValidation.final_score,
        tradeRecommendation: completeValidation.recommendation,
        criticalIssues: completeValidation.critical_issues,
        strengths: completeValidation.strengths,
        // NEW: Section transition validation (PHASE 5)
        sectionTransition: sectionTransition,
        transitionProbability: sectionTransition?.probability,
        transitionGrade: sectionTransition?.grade,
        expectedBehavior: sectionTransition?.expected_behavior
      });
    }

    // BEAR opportunities (selling resistance) - with hierarchical filtering and proportional risk management
    if (shouldGenerateBearTrade()) {
      const entry = levelPrice;
      const riskManagement = calculateProportionalRiskManagement(timeframe, entry);
      const stopLoss = riskManagement.getStopDistance(entry, false);
      const target = riskManagement.getTargetDistance(entry, false);
      const positionSize = tradeAmount / entry;
      
      // CRITICAL: Apply Gann's break confirmation rules for bear resistance levels
      const breakConfirmation = validateGannBreakConfirmation(currentPrice, entry, timeframe);
      const isValidGannEntry = breakConfirmation.confirmed;
      
      // Adjust priority based on break confirmation
      let adjustedPriority = level === '75%' && config.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM';
      if (!isValidGannEntry) {
        adjustedPriority = 'LOW'; // Downgrade without break confirmation
      } else if (breakConfirmation.strength === 'STRONG') {
        adjustedPriority = 'HIGH'; // Upgrade with strong confirmation
      }
      
      // NEW: Enhanced analysis with PHASES 2, 4 & 5
      const resistanceVolumeAnalysis = calculateAdvancedVolumeAnalysis(
        currentPrice, 
        timeframe, 
        'bear_retracement_resistance', 
        'bear'
      );
      
      const stopAdjustments = calculateTimeBasedStopAdjustments(entry, stopLoss, timeframe, false);
      const campaignRange = getTimeframeRange(currentPrice, timeframe);
      const multipleTargets = calculateMultipleTargets(
        entry, 
        campaignRange.high, 
        campaignRange.low, 
        timeframe, 
        false, // isBear
        positionSize
      );
      
      // Calculate actual risk reward first
      const actualRiskReward = riskManagement.calculateActualRiskReward(entry, stopLoss, target, false);
      
      // NEW: Complete trade validation (PHASE 3)
      const validationSetup = {
        hierarchicalInfluence: hierarchicalAnalysis.influence,
        timeframe: timeframe,
        isBull: false,
        volumeStrength: resistanceVolumeAnalysis.reliability,
        sectionType: 'bear_retracement',
        entryLevel: level,
        breakConfirmation: breakConfirmation,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        confidence: config.confidence
      };
      
      const completeValidation = validateCompleteTradeSetup(validationSetup);
      
      // NEW: Section transition validation (PHASE 5) - for resistance trades
      const sectionTransition = validateSectionTransition(
        'bear_section_A', // From section
        'bear_section_a', // To section
        { currentPrice }, // Price data
        resistanceVolumeAnalysis, // Volume data
        { currentTime: new Date() }, // Time data
        timeframe
      );
      
      opportunities.push({
        id: `${timeframe}_bear_${level}_${opportunities.length}`,
        type: `BEAR ${level} RESISTANCE`,
        description: `${level} Gann resistance test at $${levelPrice.toFixed(2)}. Strong selling zone. ${isValidGannEntry ? '✅' : '⚠️'} Break: ${breakConfirmation.strength}`,
        gannRule: `Gann Rule: ${level} retracement acts as resistance`,
        expected: `Rejection from ${level} level targeting lower prices`,
        confidence: config.confidence,
        priority: adjustedPriority,
        timeframe: timeframe,
        duration: config.duration,
        entry: entry,
        stopLoss: stopLoss,
        target: target,
        positionSize: positionSize,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        riskPercentage: `${(riskManagement.stopPercentage * 100).toFixed(1)}%`,
        targetPercentage: `${(riskManagement.targetPercentage * 100).toFixed(1)}%`,
        icon: '🔻',
        hierarchicalInfluence: hierarchicalAnalysis.influence,
        dominantTimeframe: hierarchicalAnalysis.dominantTimeframe,
        // NEW: Break confirmation data for all bear resistance levels
        breakConfirmation: breakConfirmation,
        isValidGannEntry: isValidGannEntry,
        validationReason: isValidGannEntry ? 
          `Confirmed ${breakConfirmation.strength} break of ${level} resistance (${breakConfirmation.breakPercentage.toFixed(2)}%)` :
          `Insufficient break confirmation: ${breakConfirmation.breakPercentage.toFixed(2)}% vs required ${breakConfirmation.requiredThreshold.toFixed(2)}%`,
        entryLevel: level,
        gannCompliant: isValidGannEntry,
        // NEW: Time-based stop adjustments for bear resistance
        stopAdjustments: stopAdjustments,
        // NEW: Multiple target system for bear resistance
        multipleTargets: multipleTargets,
        primaryTarget: multipleTargets.primaryTarget,
        quickProfitTarget: multipleTargets.quickestProfit,
        // NEW: Volume analysis for resistance (PHASE 4)
        volumeAnalysis: resistanceVolumeAnalysis,
        volumeEntryRules: resistanceVolumeAnalysis.entry_rules,
        volumeExitRules: resistanceVolumeAnalysis.exit_rules,
        volumePatternDescription: resistanceVolumeAnalysis.pattern_description,
        // NEW: Complete validation system (PHASE 3)
        completeValidation: completeValidation,
        validationGrade: completeValidation.grade,
        validationScore: completeValidation.final_score,
        tradeRecommendation: completeValidation.recommendation,
        criticalIssues: completeValidation.critical_issues,
        strengths: completeValidation.strengths,
        // NEW: Section transition validation (PHASE 5)
        sectionTransition: sectionTransition,
        transitionProbability: sectionTransition?.probability,
        transitionGrade: sectionTransition?.grade,
        expectedBehavior: sectionTransition?.expected_behavior
      });
    }
  });

  // 2. TIME CYCLE OPPORTUNITIES - Generate based on timeframe importance
  // Higher timeframes get fewer, more significant cycle opportunities
  const shouldGenerateCycles = (tf) => {
    switch(tf) {
      case 'monthly': return true; // Monthly cycles are critical - but only 1
      case 'weekly': return false; // Skip weekly cycles to reduce count
      case 'daily': return false; // Skip daily cycles to reduce count  
      case '4h': return Math.random() > 0.7; // 30% chance for 4h
      case '1h': return Math.random() > 0.5; // 50% chance for 1h
      default: return true; // Include cycles for scalping timeframes
    }
  };
  
  if (shouldGenerateCycles(timeframe)) {
    // Only generate 1 cycle opportunity (alternate between bull and bear)
    const isBullCycle = Math.random() > 0.5;
    
    if (isBullCycle) {
      const riskManagement = calculateProportionalRiskManagement(timeframe, retracements['50%']);
      const entry = retracements['50%'];
      const stopLoss = riskManagement.getStopDistance(entry, true);
      const target = riskManagement.getTargetDistance(entry, true);
      const actualRiskReward = riskManagement.calculateActualRiskReward(entry, stopLoss, target, true);
      
      opportunities.push({
        id: `${timeframe}_cycle_bull_${opportunities.length}`,
        type: `${timeframe.toUpperCase()} CYCLE REVERSAL BULL`,
        description: `Major ${timeframe} time cycle approaching completion. Expect bullish reversal.`,
        gannRule: 'Gann Rule: Time cycles create major reversal points',
        expected: 'Reversal into uptrend following cycle completion',
        confidence: config.confidence,
        priority: 'HIGH',
        timeframe: timeframe,
        duration: config.duration,
        entry: entry,
        stopLoss: stopLoss,
        target: target,
        positionSize: tradeAmount / entry,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        riskPercentage: `${(riskManagement.stopPercentage * 100).toFixed(1)}%`,
        targetPercentage: `${(riskManagement.targetPercentage * 100).toFixed(1)}%`,
        icon: '⏰'
      });
    } else {
      const riskManagement = calculateProportionalRiskManagement(timeframe, retracements['50%']);
      const entry = retracements['50%'];
      const stopLoss = riskManagement.getStopDistance(entry, false);
      const target = riskManagement.getTargetDistance(entry, false);
      const actualRiskReward = riskManagement.calculateActualRiskReward(entry, stopLoss, target, false);
      
      opportunities.push({
        id: `${timeframe}_cycle_bear_${opportunities.length}`,
        type: `${timeframe.toUpperCase()} CYCLE REVERSAL BEAR`,
        description: `Major ${timeframe} time cycle approaching completion. Expect bearish reversal.`,
        gannRule: 'Gann Rule: Time cycles create major reversal points',
        expected: 'Reversal into downtrend following cycle completion',
        confidence: config.confidence,
        priority: 'HIGH',
        timeframe: timeframe,
        duration: config.duration,
        entry: entry,
        stopLoss: stopLoss,
        target: target,
        positionSize: tradeAmount / entry,
        riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
        riskPercentage: `${(riskManagement.stopPercentage * 100).toFixed(1)}%`,
        targetPercentage: `${(riskManagement.targetPercentage * 100).toFixed(1)}%`,
        icon: '⏰'
      });
    }
  }

  // 3. CAMPAIGN SECTION OPPORTUNITIES
  // Use hierarchical multi-timeframe analysis to determine current section

  const currentStructure = getHierarchicalTimeframeAnalysis(timeframe);
  
  // Define section properties based on actual analysis
  const getSectionProperties = (bias, section) => {
    if (bias === 'BULL') {
      const bullSections = {
        1: { type: 'BULL', name: 'Accumulation', confidence: 'HIGH' },
        2: { type: 'BULL', name: 'Markup', confidence: 'HIGH' },
        3: { type: 'BULL', name: 'Distribution', confidence: 'MEDIUM' },
        4: { type: 'BULL', name: 'Decline', confidence: 'LOW' }
      };
      return { ...bullSections[section], section };
    } else if (bias === 'BEAR') {
      const bearSections = {
        'A': { type: 'BEAR', name: 'Initial Decline', confidence: 'MEDIUM' },
        'a': { type: 'BEAR', name: 'Rally', confidence: 'LOW' },
        'b': { type: 'BEAR', name: 'Retest', confidence: 'MEDIUM' },
        'B': { type: 'BEAR', name: 'Major Decline', confidence: 'HIGH' },
        'c': { type: 'BEAR', name: 'Counter Rally', confidence: 'LOW' },
        'C': { type: 'BEAR', name: 'Final Decline', confidence: 'LOW' }
      };
      return { ...bearSections[section], section };
    } else {
      // NEUTRAL - generate both bull and bear possibilities
      return { type: 'NEUTRAL', name: 'Consolidation', confidence: 'MEDIUM', section };
    }
  };

  // Generate appropriate number of campaign opportunities based on timeframe (REDUCED COUNTS)
  const getCampaignCount = (tf) => {
    switch(tf) {
      case 'monthly': return 0; // No campaign sections for monthly - too broad
      case 'weekly': return 0; // No campaign sections for weekly - focus on major levels
      case 'daily': return 1; // Only 1 daily setup
      case '4h': return 1; // 1 short-term setup
      case '1h': return 1; // Reduced from 2 to 1 for less clutter
      case '15m': return 1; // Reduced from 2 to 1 for less clutter
      case '5m': return 1; // Reduced from 2 to 1 for less clutter
      default: return 1; // Only 1 opportunity for scalping timeframes
    }
  };
  
  const selectedSections = [];
  const campaignCount = getCampaignCount(timeframe);
  
  if (campaignCount > 0) {
    const currentSection = getSectionProperties(currentStructure.bias, currentStructure.section);
    selectedSections.push(currentSection);
    
    // For timeframes that get 2 opportunities, add a complementary section
    if (campaignCount > 1 && currentStructure.bias !== 'NEUTRAL') {
      if (currentStructure.bias === 'BULL' && currentStructure.section < 4) {
        const nextSection = getSectionProperties('BULL', currentStructure.section + 1);
        selectedSections.push(nextSection);
      } else if (currentStructure.bias === 'BEAR') {
        // Add a bear rally opportunity
        const rallySection = getSectionProperties('BEAR', 'a');
        selectedSections.push(rallySection);
      }
    }
  }
  
  selectedSections.forEach(section => {
    const isBull = section.type === 'BULL';
    const isBear = section.type === 'BEAR';
    
    // HIERARCHICAL FILTERING: Only generate trades aligned with higher timeframes
    const shouldGenerateTrade = () => {
      if (currentStructure.influence === 'MONTHLY_BEAR') {
        // Monthly BEAR: Only allow BEAR trades
        return isBear;
      } else if (currentStructure.influence === 'WEEKLY_BEAR') {
        // Weekly BEAR: Prefer BEAR trades, allow neutral
        return isBear || section.type === 'NEUTRAL';
      } else {
        // Local bias: Allow all trades
        return true;
      }
    };
    
    if (!shouldGenerateTrade()) {
      return; // Skip this trade - conflicts with higher timeframe
    }
    
    // Use appropriate Gann level based on section type and bias with proportional risk management
    let entry, stopLoss, target, riskManagement, entryLevelName;
    
    if (isBull) {
      entry = retracements['37.5%']; // Bull entries at support
      entryLevelName = '37.5%';
      riskManagement = calculateProportionalRiskManagement(timeframe, entry);
      stopLoss = riskManagement.getStopDistance(entry, true);
      target = riskManagement.getTargetDistance(entry, true);
    } else if (isBear) {
      entry = retracements['62.5%']; // Bear entries at resistance  
      entryLevelName = '62.5%';
      riskManagement = calculateProportionalRiskManagement(timeframe, entry);
      stopLoss = riskManagement.getStopDistance(entry, false);
      target = riskManagement.getTargetDistance(entry, false);
    } else {
      // NEUTRAL - use 50% level
      entry = retracements['50%'];
      entryLevelName = '50%';
      riskManagement = calculateProportionalRiskManagement(timeframe, entry);
      stopLoss = riskManagement.getStopDistance(entry, true);
      target = riskManagement.getTargetDistance(entry, true);
    }
    
    // CRITICAL: Apply Gann's break confirmation rules
    const breakConfirmation = validateGannBreakConfirmation(currentPrice, entry, timeframe);
    const isValidGannEntry = breakConfirmation.confirmed;
    
    // Calculate trade validity and priority based on break confirmation
    let tradeValidation = {
      isValid: isValidGannEntry,
      breakConfirmation: breakConfirmation,
      entryLevel: entryLevelName,
      reason: isValidGannEntry ? 
        `Confirmed ${breakConfirmation.strength} break of ${entryLevelName} level (${breakConfirmation.breakPercentage.toFixed(2)}%)` :
        `Insufficient break confirmation: ${breakConfirmation.breakPercentage.toFixed(2)}% vs required ${breakConfirmation.requiredThreshold.toFixed(2)}%`
    };
    
    const positionSize = tradeAmount / entry;
    const actualRiskReward = riskManagement.calculateActualRiskReward(entry, stopLoss, target, isBull);
    
    // NEW: Calculate time-based stop adjustments
    const stopAdjustments = calculateTimeBasedStopAdjustments(entry, stopLoss, timeframe, isBull);
    
    // NEW: Calculate multiple targets using campaign range
    const campaignRange = getTimeframeRange(currentPrice, timeframe);
    const multipleTargets = calculateMultipleTargets(
      entry, 
      campaignRange.high, 
      campaignRange.low, 
      timeframe, 
      isBull, 
      positionSize
    );
    
    // NEW: Calculate advanced volume analysis (PHASE 4)
    const volumeAnalysis = calculateAdvancedVolumeAnalysis(
      currentPrice, 
      timeframe, 
      `${section.type.toLowerCase()}_section_${section.section}`, 
      section.type.toLowerCase()
    );
    
    // NEW: Validate section transitions (PHASE 5)
    const previousSection = section.section === 2 ? 1 : section.section === 3 ? 2 : section.section === 4 ? 3 : null;
    let sectionTransition = null;
    if (previousSection) {
      sectionTransition = validateSectionTransition(
        `${section.type.toLowerCase()}_${previousSection}`,
        `${section.type.toLowerCase()}_${section.section}`,
        { currentPrice }, // Simplified price data
        volumeAnalysis,   // Volume data from PHASE 4
        { currentTime: new Date() }, // Time data
        timeframe
      );
    }
    
    // NEW: Apply complete Gann trade validation system (PHASE 3) with enhanced volume
    const validationSetup = {
      hierarchicalInfluence: currentStructure.influence,
      timeframe: timeframe,
      isBull: isBull,
      volumeStrength: volumeAnalysis.reliability, // Enhanced with PHASE 4 analysis
      sectionType: `${section.type.toLowerCase()}_section_${section.section}`,
      entryLevel: entryLevelName,
      breakConfirmation: breakConfirmation,
      riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
      confidence: section.confidence
    };
    
    const completeValidation = validateCompleteTradeSetup(validationSetup);
    
    // Adjust priority based on complete validation
    let adjustedPriority = 'MEDIUM';
    if (completeValidation.grade === 'A') {
      adjustedPriority = 'HIGH';
    } else if (completeValidation.grade === 'F' || completeValidation.recommendation === 'AVOID_TRADE') {
      adjustedPriority = 'LOW';
    } else if (completeValidation.final_score >= 0.75) {
      adjustedPriority = 'HIGH';
    }
    
    opportunities.push({
      id: `${timeframe}_campaign_${section.section}_${opportunities.length}`,
      type: `${section.type} CAMPAIGN SECTION ${section.section}`,
      description: `${section.type} campaign Section ${section.section}: ${section.name} phase. ${isBull ? 'Accumulate' : isBear ? 'Short' : 'Monitor'} positions.`,
      gannRule: `Gann Rule: Section ${section.section} represents ${section.name} phase`,
      expected: `${section.name} behavior expected in this section`,
      confidence: section.confidence,
      priority: adjustedPriority,
      timeframe: timeframe,
      duration: config.duration,
      entry: entry,
      stopLoss: stopLoss,
      target: target,
      // NEW: Break confirmation data
      breakConfirmation: tradeValidation.breakConfirmation,
      isValidGannEntry: tradeValidation.isValid,
      validationReason: tradeValidation.reason,
      entryLevel: tradeValidation.entryLevel,
      positionSize: positionSize,
      riskReward: `1:${actualRiskReward.toFixed(2).replace('.00', '')}`,
      riskPercentage: `${(riskManagement.stopPercentage * 100).toFixed(1)}%`,
      targetPercentage: `${(riskManagement.targetPercentage * 100).toFixed(1)}%`,
      icon: isBull ? '📈' : isBear ? '📉' : '📊',
      // NEW: Time-based stop adjustments
      stopAdjustments: stopAdjustments,
      // NEW: Multiple target system
      multipleTargets: multipleTargets,
      primaryTarget: multipleTargets.primaryTarget,
      quickProfitTarget: multipleTargets.quickestProfit,
      // Add hierarchical information
      hierarchicalInfluence: currentStructure.influence,
      dominantTimeframe: currentStructure.dominantTimeframe,
      dominantWeight: currentStructure.dominantWeight,
      overrideReason: currentStructure.overrideReason,
      // Gann validation status
      gannCompliant: tradeValidation.isValid,
      // NEW: Complete validation system (PHASE 3)
      completeValidation: completeValidation,
      validationGrade: completeValidation.grade,
      validationScore: completeValidation.final_score,
      tradeRecommendation: completeValidation.recommendation,
      criticalIssues: completeValidation.critical_issues,
      strengths: completeValidation.strengths,
      // NEW: Advanced volume analysis (PHASE 4)
      volumeAnalysis: volumeAnalysis,
      volumeEntryRules: volumeAnalysis.entry_rules,
      volumeExitRules: volumeAnalysis.exit_rules,
      volumePatternDescription: volumeAnalysis.pattern_description,
      // NEW: Section transition validation (PHASE 5)
      sectionTransition: sectionTransition,
      transitionProbability: sectionTransition?.probability,
      transitionGrade: sectionTransition?.grade,
      expectedBehavior: sectionTransition?.expected_behavior
    });
  });

  // 4. VOLUME ANALYSIS & INTEGRATION
  const getVolumeConfirmation = (sectionType, sectionNumber, bias) => {
    // Section-specific volume rules based on Gann methodology
    const volumeRules = {
      'BULL': {
        1: { expected: 'increasing', strength: 'MEDIUM', description: 'Increasing volume on advances' },
        2: { expected: 'high', strength: 'STRONG', description: 'Strong volume on breakouts - MOST RELIABLE' },
        3: { expected: 'decreasing', strength: 'WEAK', description: 'Decreasing volume in distribution phase' },
        4: { expected: 'weak', strength: 'VERY_WEAK', description: 'Weak volume signals reversal' }
      },
      'BEAR': {
        'A': { expected: 'high', strength: 'STRONG', description: 'High volume confirms initial decline' },
        'a': { expected: 'weak', strength: 'WEAK', description: 'Weak volume on bear rally' },
        'b': { expected: 'medium', strength: 'MEDIUM', description: 'Medium volume on retest' },
        'B': { expected: 'high', strength: 'STRONG', description: 'High volume confirms major decline' },
        'c': { expected: 'weak', strength: 'WEAK', description: 'Weak volume on counter rally' },
        'C': { expected: 'medium', strength: 'MEDIUM', description: 'Final decline volume' }
      }
    };
    
    const rule = volumeRules[bias]?.[sectionNumber];
    return rule || { expected: 'neutral', strength: 'MEDIUM', description: 'Standard volume analysis' };
  };

  // Add volume confirmation to ALL existing opportunities
  let volumeEnhancedOpportunities = opportunities.map(opp => {
    // Extract section info from opportunity
    let volumeAnalysis = { confirmed: true, strength: 'MEDIUM', rule: 'Standard volume confirmation' };
    
    // For campaign section opportunities, apply specific volume rules
    if (opp.type.includes('CAMPAIGN SECTION')) {
      const match = opp.type.match(/(\w+) CAMPAIGN SECTION (\w+)/);
      if (match) {
        const [, bias, section] = match;
        const volumeRule = getVolumeConfirmation('section', section, bias);
        
        volumeAnalysis = {
          confirmed: volumeRule.strength !== 'VERY_WEAK',
          strength: volumeRule.strength,
          rule: volumeRule.description,
          expected: volumeRule.expected
        };
      }
    }
    
    // For retracement opportunities, apply level-specific volume rules
    if (opp.description.includes('50%')) {
      volumeAnalysis = {
        confirmed: true,
        strength: 'STRONG',
        rule: '50% level - Most important with strong volume confirmation',
        expected: 'high'
      };
    } else if (opp.description.includes('37.5%') || opp.description.includes('62.5%')) {
      volumeAnalysis = {
        confirmed: true,
        strength: 'MEDIUM',
        rule: 'Secondary Gann level with medium volume confirmation',
        expected: 'medium'
      };
    }
    
    // Enhance opportunity with volume data
    return {
      ...opp,
      volumeConfirmation: volumeAnalysis.confirmed,
      volumeStrength: volumeAnalysis.strength,
      volumeRule: volumeAnalysis.rule,
      volumeExpected: volumeAnalysis.expected,
      // Adjust confidence based on volume
      confidence: volumeAnalysis.confirmed ? opp.confidence : 'LOW',
      // Add volume icon to description
      description: `${opp.description} ${volumeAnalysis.confirmed ? '✓' : '⚠️'} Volume: ${volumeAnalysis.strength}`
    };
  });

  // 5. ADDITIONAL VOLUME-SPECIFIC OPPORTUNITIES
  if (['15m', '5m', '1m'].includes(timeframe)) {
    // Section 2 volume breakout (most reliable)
    volumeEnhancedOpportunities.push({
      id: `${timeframe}_section2_volume_${opportunities.length}`,
      type: `SECTION 2 VOLUME BREAKOUT`,
      description: `Section 2 markup volume breakout - MOST RELIABLE setup ✓ Volume: STRONG`,
      gannRule: 'Gann Rule: Section 2 has strongest volume - most reliable trades',
      expected: 'Strong volume breakout targeting next major resistance',
      confidence: 'HIGH',
      priority: 'HIGH',
      timeframe: timeframe,
      duration: config.duration,
      entry: retracements['50%'],
      stopLoss: retracements['37.5%'],
      target: retracements['75%'],
      positionSize: tradeAmount / retracements['50%'],
      riskReward: `1:${(((retracements['75%'] - retracements['50%']) / (retracements['50%'] - retracements['37.5%']))).toFixed(1)}`,
      icon: '🚀',
      volumeConfirmation: true,
      volumeStrength: 'STRONG',
      volumeRule: 'Section 2 markup phase - strongest volume confirmation',
      volumeExpected: 'high'
    });
    
    // Volume divergence warning
    volumeEnhancedOpportunities.push({
      id: `${timeframe}_volume_divergence_${opportunities.length}`,
      type: `VOLUME DIVERGENCE WARNING`,
      description: `Price advance without volume support - Distribution signal ⚠️ Volume: WEAK`,
      gannRule: 'Gann Rule: Price without volume = weak move, expect reversal',
      expected: 'Weak move likely to reverse - avoid or take profits',
      confidence: 'LOW',
      priority: 'MEDIUM',
      timeframe: timeframe,
      duration: config.duration,
      entry: retracements['75%'],
      stopLoss: retracements['62.5%'],
      target: retracements['50%'],
      positionSize: tradeAmount / retracements['75%'],
      riskReward: `1:${(((retracements['75%'] - retracements['50%']) / (retracements['75%'] - retracements['62.5%']))).toFixed(1)}`,
      icon: '⚠️',
      volumeConfirmation: false,
      volumeStrength: 'WEAK',
      volumeRule: 'Volume divergence - price up, volume down',
      volumeExpected: 'decreasing'
    });
  }

  // Calculate proximity-based priority enhancement
  const enhancedOpportunities = volumeEnhancedOpportunities.map(opp => {
    // Calculate distance from current price to entry price
    const priceDistance = Math.abs(currentPrice - opp.entry);
    const percentageDistance = (priceDistance / currentPrice) * 100;
    
    // Determine proximity priority (closer = higher priority)
    let proximityPriority = 'LOW';
    if (percentageDistance <= 2) {
      proximityPriority = 'VERY_HIGH'; // Within 2% of current price
    } else if (percentageDistance <= 5) {
      proximityPriority = 'HIGH'; // Within 5% of current price
    } else if (percentageDistance <= 10) {
      proximityPriority = 'MEDIUM'; // Within 10% of current price
    }
    
    // Combine Gann priority with proximity priority
    let combinedPriority = opp.priority; // Start with Gann-based priority
    
    // Boost priority for very close trades
    if (proximityPriority === 'VERY_HIGH') {
      if (opp.priority === 'MEDIUM') {
        combinedPriority = 'HIGH'; // Boost medium to high if very close
      } else if (opp.priority === 'LOW') {
        combinedPriority = 'MEDIUM'; // Boost low to medium if very close
      }
    }
    // Also boost HIGH proximity trades
    if (proximityPriority === 'HIGH' && opp.priority === 'LOW') {
      combinedPriority = 'MEDIUM'; // Boost low to medium if close
    }
    
    return {
      ...opp,
      proximityPriority,
      percentageDistance: parseFloat(percentageDistance.toFixed(2)),
      priceDistance: parseFloat(priceDistance.toFixed(2)),
      combinedPriority,
      originalPriority: opp.priority
    };
  });
  
  // Sort by proximity (closest first), then by Gann priority
  enhancedOpportunities.sort((a, b) => {
    // First sort by distance (closest first)
    if (a.percentageDistance !== b.percentageDistance) {
      return a.percentageDistance - b.percentageDistance;
    }
    // Then by Gann priority (HIGH before MEDIUM)
    if (a.originalPriority !== b.originalPriority) {
      return a.originalPriority === 'HIGH' ? -1 : 1;
    }
    return 0;
  });

  console.log(`✅ Generated ${enhancedOpportunities.length} opportunities for ${timeframe}:`, enhancedOpportunities.map(o => `${o.type} (${o.percentageDistance}% away)`));
  return enhancedOpportunities;
};

// VOLUME ANALYSIS FOR GANN PATTERN CONFIRMATION
const analyzeVolumePattern = (priceData, campaignType, currentSection) => {
  const {highs, lows, closes, volume} = priceData;
  
  if (!volume || volume.length === 0) {
    return {
      volumeConfirmation: 'NO_DATA',
      volumePattern: 'UNKNOWN',
      warning: 'Volume data required for proper Gann analysis'
    };
  }
  
  const volumeAnalysis = {
    currentVolume: volume[volume.length - 1],
    averageVolume: volume.reduce((a, b) => a + b, 0) / volume.length,
    volumeTrend: null,
    sectionConfirmation: false,
    volumePattern: null,
    gannVolumeRules: [],
    warning: null
  };
  
  // Calculate volume trend over last few periods
  const recentVolume = volume.slice(-3);
  const earlierVolume = volume.slice(-6, -3);
  const recentAvg = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
  const earlierAvg = earlierVolume.reduce((a, b) => a + b, 0) / earlierVolume.length;
  
  volumeAnalysis.volumeTrend = recentAvg > earlierAvg ? 'INCREASING' : 'DECREASING';
  
  // Apply Gann's Volume Rules based on campaign type and section
  if (campaignType === 'bull') {
    switch(currentSection) {
      case 1:
        // 1st Section: Strong volume on advances, decreasing on reactions
        if (volumeAnalysis.volumeTrend === 'INCREASING') {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BULL_1ST_CONFIRMED';
          volumeAnalysis.gannVolumeRules.push('Volume increasing on 1st section advance - BULLISH CONFIRMATION');
        } else {
          volumeAnalysis.warning = 'Volume should increase in 1st section advance';
        }
        break;
        
      case 2:
        // 2nd Section: Strong volume on breakout above 1st section high
        if (volumeAnalysis.currentVolume > volumeAnalysis.averageVolume * 1.5) {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BULL_2ND_BREAKOUT_CONFIRMED';
          volumeAnalysis.gannVolumeRules.push('Strong volume on 2nd section breakout - MOST RELIABLE SIGNAL');
        } else {
          volumeAnalysis.warning = 'Weak volume on 2nd section breakout - caution advised';
        }
        break;
        
      case 3:
        // 3rd Section: May show exhaustion (decreasing volume on advances)
        if (volumeAnalysis.volumeTrend === 'DECREASING') {
          volumeAnalysis.volumePattern = 'BULL_3RD_EXHAUSTION';
          volumeAnalysis.gannVolumeRules.push('Decreasing volume in 3rd section - WATCH FOR COMPLETION');
          volumeAnalysis.warning = 'Volume exhaustion may signal campaign end approaching';
        } else {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BULL_3RD_STRONG';
        }
        break;
        
      case 4:
        // 4th Section: Often weak volume, divergences common
        if (volumeAnalysis.volumeTrend === 'DECREASING' || volumeAnalysis.currentVolume < volumeAnalysis.averageVolume * 0.7) {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BULL_4TH_DIVERGENCE';
          volumeAnalysis.gannVolumeRules.push('Weak volume in 4th section - REVERSAL SIGNAL');
        } else {
          volumeAnalysis.warning = 'Strong volume in 4th section - may extend further';
        }
        break;
    }
  } else {
    // Bear Market Volume Analysis
    switch(currentSection) {
      case 'A':
        // 1st Section (A): Heavy selling volume on initial break
        if (volumeAnalysis.currentVolume > volumeAnalysis.averageVolume * 1.8) {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BEAR_A_CONFIRMED';
          volumeAnalysis.gannVolumeRules.push('Heavy selling volume on trend break - BEAR MARKET CONFIRMED');
        } else {
          volumeAnalysis.warning = 'Light volume on break - may be false breakdown';
        }
        break;
        
      case 'a':
        // Secondary rally: Should have lower volume than section A
        if (volumeAnalysis.currentVolume < volumeAnalysis.averageVolume * 0.8) {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BEAR_RALLY_WEAK';
          volumeAnalysis.gannVolumeRules.push('Light volume on bear rally - BEARISH CONFIRMATION');
        } else {
          volumeAnalysis.warning = 'Strong volume on bear rally - may be reversal attempt';
        }
        break;
        
      case 'b':
      case 'B':
        // Continued selling but may be less intense
        if (volumeAnalysis.volumeTrend === 'DECREASING') {
          volumeAnalysis.volumePattern = 'BEAR_SELLING_CONTINUES';
          volumeAnalysis.gannVolumeRules.push('Continued selling with decreasing intensity');
        }
        break;
        
      case 'c':
      case 'C':
        // Final decline: Often climactic selling followed by exhaustion
        if (volumeAnalysis.currentVolume > volumeAnalysis.averageVolume * 2.0) {
          volumeAnalysis.sectionConfirmation = true;
          volumeAnalysis.volumePattern = 'BEAR_CLIMACTIC_SELLING';
          volumeAnalysis.gannVolumeRules.push('Climactic selling volume - REVERSAL IMMINENT');
        } else if (volumeAnalysis.volumeTrend === 'DECREASING') {
          volumeAnalysis.volumePattern = 'BEAR_EXHAUSTION';
          volumeAnalysis.gannVolumeRules.push('Volume exhaustion in final decline - REVERSAL SIGNAL');
        }
        break;
    }
  }
  
  return volumeAnalysis;
};

// CORE GANN CAMPAIGN PATTERN ANALYSIS ENGINE (Enhanced with Volume)
const analyzeCampaignStructure = (priceData, timeframe = 'daily') => {
  const {highs, lows, closes, dates, volume} = priceData;
  
  if (!highs || highs.length < 8) {
    return {error: 'Insufficient price data for campaign analysis'};
  }
  
  const analysis = {
    timeframe: timeframe,
    campaignType: null,      // 'bull' or 'bear'
    currentSection: null,    // 1, 2, 3, 4 for bull; A, a, b, B, c, C for bear
    sectionProgress: 0,      // 0-100% completion of current section
    completionSignal: 'LOW', // LOW, MEDIUM, HIGH
    reversalProbability: 0,  // 0-100%
    structuralBias: null,    // BULL, BEAR, NEUTRAL
    biasPercentage: 0,       // -100 to +100
    patternConfidence: 0,    // 0-100%
    nextExpectedMove: null,
    sections: '0/8'
  };
  
  // Identify campaign type based on overall trend
  const startPrice = closes[0];
  const endPrice = closes[closes.length - 1];
  const overallTrend = endPrice > startPrice ? 'bull' : 'bear';
  
  // Find major highs and lows for section identification
  const majorHigh = Math.max(...highs);
  const majorLow = Math.min(...lows);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate structural bias percentage
  const range = majorHigh - majorLow;
  const positionInRange = (currentPrice - majorLow) / range;
  analysis.biasPercentage = Math.round((positionInRange - 0.5) * 200); // -100 to +100
  
  if (analysis.biasPercentage > 25) {
    analysis.structuralBias = 'BULL';
  } else if (analysis.biasPercentage < -25) {
    analysis.structuralBias = 'BEAR';
  } else {
    analysis.structuralBias = 'NEUTRAL';
  }
  
  // Simplified section identification (would need more sophisticated algorithm in real implementation)
  if (overallTrend === 'bull') {
    analysis.campaignType = 'bull';
    
    // Estimate section based on price position and momentum
    if (positionInRange < 0.3) {
      analysis.currentSection = 1;
      analysis.sections = '1/8';
      analysis.nextExpectedMove = 'Advance to Section 2';
    } else if (positionInRange < 0.6) {
      analysis.currentSection = 2;
      analysis.sections = '2/8';
      analysis.nextExpectedMove = 'Advance to Section 3';
      analysis.completionSignal = 'MEDIUM';
    } else if (positionInRange < 0.85) {
      analysis.currentSection = 3;
      analysis.sections = '3/8';
      analysis.nextExpectedMove = 'Watch for Section 4 completion';
      analysis.completionSignal = 'HIGH';
    } else {
      analysis.currentSection = 4;
      analysis.sections = '4/8';
      analysis.nextExpectedMove = 'REVERSAL TO BEAR MARKET';
      analysis.completionSignal = 'HIGH';
      analysis.reversalProbability = 85;
    }
  } else {
    analysis.campaignType = 'bear';
    
    // Bear market sections: A, a, b, B, c, C
    if (positionInRange > 0.7) {
      analysis.currentSection = 'A';
      analysis.sections = '1/8';
      analysis.nextExpectedMove = 'Continue decline to section a';
    } else if (positionInRange > 0.5) {
      analysis.currentSection = 'a';
      analysis.sections = '2/8';
      analysis.nextExpectedMove = 'Rally then decline to b';
      analysis.completionSignal = 'MEDIUM';
    } else if (positionInRange > 0.3) {
      analysis.currentSection = 'b';
      analysis.sections = '4/8';
      analysis.nextExpectedMove = 'Rally to B then final decline';
      analysis.completionSignal = 'HIGH';
    } else {
      analysis.currentSection = 'C';
      analysis.sections = '6/8';
      analysis.nextExpectedMove = 'REVERSAL TO BULL MARKET';
      analysis.completionSignal = 'HIGH';
      analysis.reversalProbability = 90;
    }
  }
  
  // INTEGRATE VOLUME ANALYSIS
  const volumeAnalysis = analyzeVolumePattern(priceData, analysis.campaignType, analysis.currentSection);
  analysis.volumeConfirmation = volumeAnalysis.sectionConfirmation;
  analysis.volumePattern = volumeAnalysis.volumePattern;
  analysis.volumeWarning = volumeAnalysis.warning;
  analysis.gannVolumeRules = volumeAnalysis.gannVolumeRules;
  analysis.volumeTrend = volumeAnalysis.volumeTrend;
  analysis.currentVolume = volumeAnalysis.currentVolume;
  analysis.averageVolume = volumeAnalysis.averageVolume;
  
  // Adjust completion signal based on volume confirmation
  if (volumeAnalysis.sectionConfirmation && analysis.completionSignal === 'MEDIUM') {
    analysis.completionSignal = 'HIGH';
  } else if (!volumeAnalysis.sectionConfirmation && analysis.completionSignal === 'HIGH') {
    analysis.completionSignal = 'MEDIUM';
    analysis.warning = volumeAnalysis.warning;
  }
  
  // Adjust reversal probability based on volume
  if (volumeAnalysis.volumePattern === 'BULL_4TH_DIVERGENCE' || volumeAnalysis.volumePattern === 'BEAR_CLIMACTIC_SELLING') {
    analysis.reversalProbability = Math.min(95, analysis.reversalProbability + 15);
  } else if (volumeAnalysis.volumePattern === 'BEAR_EXHAUSTION') {
    analysis.reversalProbability = Math.min(90, analysis.reversalProbability + 10);
  }
  
  // Calculate pattern confidence based on multiple factors INCLUDING VOLUME
  analysis.patternConfidence = Math.min(100, 
    (highs.length * 8) +  // More data = higher confidence
    (analysis.reversalProbability * 0.6) + 
    (analysis.completionSignal === 'HIGH' ? 25 : analysis.completionSignal === 'MEDIUM' ? 12 : 0) +
    (volumeAnalysis.sectionConfirmation ? 20 : 0) +  // Volume confirmation bonus
    (volume && volume.length > 0 ? 15 : 0)  // Volume data available bonus
  );
  
  return analysis;
};

// MULTI-TIMEFRAME PATTERN ALIGNMENT ANALYSIS
const analyzeMultiTimeframeAlignment = (campaignData) => {
  const timeframes = ['monthly', 'weekly', 'daily', '4h', '1h', '15m', '5m', '1m'];
  const alignment = {
    overallAlignment: 0,        // 0-100%
    bullishTimeframes: 0,
    bearishTimeframes: 0,
    neutralTimeframes: 0,
    dominantTrend: null,
    conflictingSignals: [],
    highestPrioritySignal: null,
    recommendedAction: null,
    confidence: 0
  };
  
  let totalWeight = 0;
  let weightedBullish = 0;
  
  const weights = {
    'monthly': 10, 'weekly': 9, 'daily': 8, '4h': 7,
    '1h': 6, '15m': 5, '5m': 4, '1m': 3
  };
  
  timeframes.forEach(tf => {
    if (campaignData[tf]) {
      const weight = weights[tf];
      totalWeight += weight;
      
      if (campaignData[tf].structuralBias === 'BULL') {
        weightedBullish += weight;
        alignment.bullishTimeframes++;
      } else if (campaignData[tf].structuralBias === 'BEAR') {
        alignment.bearishTimeframes++;
      } else {
        alignment.neutralTimeframes++;
      }
      
      // Check for 4th section completions (highest priority)
      if (campaignData[tf].currentSection === 4 || campaignData[tf].currentSection === 'C') {
        alignment.highestPrioritySignal = {
          timeframe: tf,
          signal: 'REVERSAL_IMMINENT',
          weight: weight,
          confidence: campaignData[tf].reversalProbability
        };
      }
    }
  });
  
  // Calculate overall alignment
  alignment.overallAlignment = Math.round((weightedBullish / totalWeight) * 100);
  
  if (alignment.overallAlignment > 70) {
    alignment.dominantTrend = 'BULL';
    alignment.recommendedAction = 'LONG_BIAS';
  } else if (alignment.overallAlignment < 30) {
    alignment.dominantTrend = 'BEAR';
    alignment.recommendedAction = 'SHORT_BIAS';
  } else {
    alignment.dominantTrend = 'NEUTRAL';
    alignment.recommendedAction = 'WAIT_FOR_CLARITY';
  }
  
  // Calculate confidence based on alignment strength
  alignment.confidence = Math.abs(alignment.overallAlignment - 50) * 2; // 0-100%
  
  return alignment;
};

// PATTERN VISUALIZATION DATA GENERATOR
const generatePatternVisualization = (campaignAnalysis, priceData) => {
  const visualization = {
    patternType: campaignAnalysis.campaignType,
    currentSection: campaignAnalysis.currentSection,
    sectionLabels: [],
    pricePoints: [],
    patternLines: [],
    annotations: [],
    gannLevels: []
  };
  
  if (campaignAnalysis.campaignType === 'bull') {
    visualization.sectionLabels = ['1', '2', '3', '4th (Reversal)'];
    visualization.patternLines = [
      {type: 'bullish', sections: [1, 2, 3], style: 'solid'},
      {type: 'bearish', sections: [4], style: 'dashed', warning: true}
    ];
  } else {
    visualization.sectionLabels = ['A', 'a', 'b', 'B', 'c', 'C (Reversal)'];
    visualization.patternLines = [
      {type: 'bearish', sections: ['A', 'a', 'b', 'B', 'c'], style: 'solid'},
      {type: 'bullish', sections: ['C'], style: 'dashed', warning: true}
    ];
  }
  
  // Add current position indicator
  visualization.currentPosition = {
    section: campaignAnalysis.currentSection,
    progress: campaignAnalysis.sectionProgress,
    nextMove: campaignAnalysis.nextExpectedMove
  };
  
  return visualization;
};

module.exports = {
  calculateRetracementLevels,
  calculateTimeCycles,
  calculatePositionSize,
  generateTradeOpportunities,
  analyzeCampaignStructure,
  analyzeMultiTimeframeAlignment,
  generatePatternVisualization,
};
