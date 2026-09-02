/**
 * Deterministic Scam DNA Pattern Matcher
 * Evaluates extracted indicator signals against enabled scam patterns and signal weights.
 */

const matchScamPatterns = ({ indicators, patterns }) => {
  if (!Array.isArray(indicators)) {
    throw new TypeError("Scam DNA matcher requires an indicators array.");
  }

  if (!Array.isArray(patterns)) {
    throw new TypeError("Scam DNA matcher requires a patterns array.");
  }

  const availableSignals = new Set(
    indicators.map((indicator) =>
      typeof indicator === "string" ? indicator : indicator.code
    )
  );

  return patterns
    .map((pattern) => {
      const patternSignals = pattern.signals || [];

      const matchedSignals = patternSignals.filter((signal) =>
        availableSignals.has(signal.signalCode)
      );

      const missingRequiredSignals = patternSignals
        .filter(
          (signal) => signal.required && !availableSignals.has(signal.signalCode)
        )
        .map((signal) => signal.signalCode);

      const totalPatternWeight = patternSignals.reduce(
        (total, signal) => total + Number(signal.weight || 1),
        0
      );

      const matchedWeight = matchedSignals.reduce(
        (total, signal) => total + Number(signal.weight || 1),
        0
      );

      const requiredSignalsCount = patternSignals.filter(
        (signal) => signal.required
      ).length;

      const matchedRequiredSignals = matchedSignals.filter(
        (signal) => signal.required
      ).length;

      const requiredSignalsSatisfied = missingRequiredSignals.length === 0;

      // Deterministic confidence score calculation
      let confidence = 0;
      if (totalPatternWeight > 0 && requiredSignalsSatisfied) {
        confidence = Math.min(
          1,
          Number((matchedWeight / totalPatternWeight).toFixed(4))
        );
      }

      return {
        patternId: pattern.id,
        patternCode: pattern.patternCode,
        patternName: pattern.patternName,
        countryCode: pattern.countryCode,
        category: pattern.category,
        description: pattern.description,
        severity: pattern.severity,
        recommendation: pattern.recommendation,

        matchedSignals: matchedSignals.map((signal) => ({
          signalCode: signal.signalCode,
          required: signal.required,
          weight: Number(signal.weight)
        })),

        missingRequiredSignals,
        matchedWeight,
        totalPatternWeight,
        confidence,

        requiredSignals: {
          total: requiredSignalsCount,
          matched: matchedRequiredSignals,
          satisfied: requiredSignalsSatisfied
        }
      };
    })
    .filter(
      (match) =>
        match.requiredSignals.satisfied &&
        match.matchedSignals.length > 0 &&
        match.confidence >= 0.35 // Explicit matching rule avoiding false certainty
    )
    .sort((a, b) => b.confidence - a.confidence || b.matchedWeight - a.matchedWeight);
};

/**
 * Resolves the primary scam pattern formatted strictly to specification:
 * {
 *   matched: boolean,
 *   patternId: string | null,
 *   name: string | null,
 *   confidence: number,
 *   signals: string[]
 * }
 */
const resolvePrimaryScamPattern = ({ indicators, patterns }) => {
  const matches = matchScamPatterns({ indicators, patterns });

  if (matches.length === 0) {
    return {
      scamPattern: {
        matched: false,
        patternId: null,
        name: null,
        confidence: 0,
        signals: []
      },
      matches: []
    };
  }

  const best = matches[0];

  return {
    scamPattern: {
      matched: true,
      patternId: best.patternId,
      name: best.patternName,
      confidence: best.confidence,
      signals: best.matchedSignals.map((s) => s.signalCode)
    },
    matches
  };
};

module.exports = {
  matchScamPatterns,
  resolvePrimaryScamPattern
};