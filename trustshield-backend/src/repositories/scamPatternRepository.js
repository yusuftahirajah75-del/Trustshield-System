const { query } = require("../config/database");

const findEnabledPatternsWithSignals = async () => {
  const sql = `
    SELECT
      sp.id,
      sp.pattern_code,
      sp.pattern_name,
      sp.country_code,
      sp.category,
      sp.description,
      sp.severity,
      sp.recommendation,
      sp.enabled,

      s.id AS signal_id,
      s.signal_code,
      s.required,
      s.weight

    FROM scam_patterns sp

    LEFT JOIN scam_pattern_signals s
      ON s.pattern_id = sp.id

    WHERE sp.enabled = TRUE

    ORDER BY
      sp.pattern_code ASC,
      s.signal_code ASC
  `;

  const result = await query(sql);

  const patterns = new Map();

  for (const row of result.rows) {
    if (!patterns.has(row.id)) {
      patterns.set(row.id, {
        id: row.id,
        patternCode: row.pattern_code,
        patternName: row.pattern_name,
        countryCode: row.country_code,
        category: row.category,
        description: row.description,
        severity: row.severity,
        recommendation: row.recommendation,
        enabled: row.enabled,
        signals: []
      });
    }

    if (row.signal_id) {
      patterns.get(row.id).signals.push({
        id: row.signal_id,
        signalCode: row.signal_code,
        required: row.required,
        weight: Number(row.weight)
      });
    }
  }

  return Array.from(patterns.values());
};

const findPatternById = async (id) => {
  const sql = `
    SELECT
      sp.id,
      sp.pattern_code,
      sp.pattern_name,
      sp.country_code,
      sp.category,
      sp.description,
      sp.severity,
      sp.recommendation,
      sp.enabled,
      sp.created_at,
      sp.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'signalCode', s.signal_code,
            'required', s.required,
            'weight', s.weight
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS signals
    FROM scam_patterns sp
    LEFT JOIN scam_pattern_signals s ON s.pattern_id = sp.id
    WHERE sp.id = $1
    GROUP BY sp.id
  `;

  const result = await query(sql, [id]);
  if (!result.rows[0]) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    patternCode: row.pattern_code,
    patternName: row.pattern_name,
    countryCode: row.country_code,
    category: row.category,
    description: row.description,
    severity: row.severity,
    recommendation: row.recommendation,
    enabled: row.enabled,
    signals: row.signals || []
  };
};

const findPatternByCode = async (patternCode) => {
  const sql = `
    SELECT id, pattern_code, pattern_name, country_code, category, description, severity, recommendation, enabled
    FROM scam_patterns
    WHERE pattern_code = $1
    LIMIT 1
  `;
  const result = await query(sql, [patternCode]);
  if (!result.rows[0]) return null;
  return result.rows[0];
};

const createPattern = async ({
  patternCode,
  patternName,
  countryCode = "NG",
  category,
  description,
  severity = "high",
  recommendation = "AVOID",
  signals = []
}) => {
  const insertPatternSql = `
    INSERT INTO scam_patterns (
      pattern_code,
      pattern_name,
      country_code,
      category,
      description,
      severity,
      recommendation
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, pattern_code, pattern_name, country_code, category, description, severity, recommendation, enabled, created_at
  `;

  const patternRes = await query(insertPatternSql, [
    patternCode,
    patternName,
    countryCode,
    category,
    description,
    severity,
    recommendation
  ]);

  const pattern = patternRes.rows[0];

  if (Array.isArray(signals) && signals.length > 0) {
    for (const sig of signals) {
      const insertSignalSql = `
        INSERT INTO scam_pattern_signals (
          pattern_id,
          signal_code,
          required,
          weight
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pattern_id, signal_code) DO NOTHING
      `;
      await query(insertSignalSql, [
        pattern.id,
        sig.signalCode,
        sig.required || false,
        sig.weight || 1.0
      ]);
    }
  }

  return findPatternById(pattern.id);
};

const savePatternMatch = async ({
  analysisId,
  patternId,
  confidence,
  matchedSignals = []
}) => {
  const sql = `
    INSERT INTO scam_pattern_matches (
      analysis_id,
      pattern_id,
      confidence,
      matched_signals
    )
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (analysis_id, pattern_id)
    DO UPDATE SET
      confidence = EXCLUDED.confidence,
      matched_signals = EXCLUDED.matched_signals
    RETURNING id, analysis_id, pattern_id, confidence, matched_signals, created_at
  `;

  const result = await query(sql, [
    analysisId,
    patternId,
    confidence,
    JSON.stringify(matchedSignals)
  ]);

  return result.rows[0];
};

const getPatternMatchesByAnalysisId = async (analysisId) => {
  const sql = `
    SELECT
      m.id,
      m.analysis_id,
      m.pattern_id,
      m.confidence,
      m.matched_signals,
      m.created_at,
      sp.pattern_code,
      sp.pattern_name,
      sp.category,
      sp.severity,
      sp.recommendation
    FROM scam_pattern_matches m
    JOIN scam_patterns sp ON sp.id = m.pattern_id
    WHERE m.analysis_id = $1
    ORDER BY m.confidence DESC
  `;

  const result = await query(sql, [analysisId]);
  return result.rows.map((row) => ({
    id: row.id,
    analysisId: row.analysis_id,
    patternId: row.pattern_id,
    confidence: Number(row.confidence),
    matchedSignals: row.matched_signals,
    patternCode: row.pattern_code,
    patternName: row.pattern_name,
    category: row.category,
    severity: row.severity,
    recommendation: row.recommendation,
    createdAt: row.created_at
  }));
};

const getCampaignStats = async (patternId) => {
  const sql = `
    SELECT
      COUNT(m.id)::INTEGER AS match_count,
      MIN(m.created_at) AS first_seen,
      MAX(m.created_at) AS last_seen
    FROM scam_pattern_matches m
    WHERE m.pattern_id = $1
  `;
  const res = await query(sql, [patternId]);
  return {
    matchCount: res.rows[0]?.match_count || 0,
    firstSeen: res.rows[0]?.first_seen || null,
    lastSeen: res.rows[0]?.last_seen || null
  };
};

const listRecurringCampaigns = async (limit = 10) => {
  const sql = `
    SELECT
      sp.id AS pattern_id,
      sp.pattern_code,
      sp.pattern_name,
      sp.category,
      sp.severity,
      COUNT(m.id)::INTEGER AS total_matches,
      MAX(m.created_at) AS last_detected
    FROM scam_patterns sp
    JOIN scam_pattern_matches m ON m.pattern_id = sp.id
    GROUP BY sp.id
    HAVING COUNT(m.id) >= 1
    ORDER BY total_matches DESC, last_detected DESC
    LIMIT $1
  `;
  const result = await query(sql, [limit]);
  return result.rows.map((r) => ({
    patternId: r.pattern_id,
    patternCode: r.pattern_code,
    patternName: r.pattern_name,
    category: r.category,
    severity: r.severity,
    totalMatches: r.total_matches,
    lastDetected: r.last_detected
  }));
};

module.exports = {
  findEnabledPatternsWithSignals,
  findPatternById,
  findPatternByCode,
  createPattern,
  savePatternMatch,
  getPatternMatchesByAnalysisId,
  getCampaignStats,
  listRecurringCampaigns
};