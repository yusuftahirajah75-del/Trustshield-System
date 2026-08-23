const { query } = require("../config/database");

const mapAnalysisRow = (row) => {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    summary: row.summary,
    indicators: row.indicators,
    createdAt: row.created_at
  };
};

const createAnalysis = async ({
  userId,
  url,
  riskScore,
  riskLevel,
  summary,
  indicators
}) => {
  const sql = `
    INSERT INTO analyses (
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING
      id,
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators,
      created_at
  `;

  const values = [
    userId,
    url,
    riskScore,
    riskLevel,
    summary,
    JSON.stringify(indicators)
  ];

  const result =
    await query(sql, values);

  return mapAnalysisRow(
    result.rows[0]
  );
};

const findAnalysisById = async (
  analysisId
) => {
  const sql = `
    SELECT
      id,
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators,
      created_at
    FROM analyses
    WHERE id = $1
    LIMIT 1
  `;

  const result =
    await query(sql, [analysisId]);

  if (!result.rows[0]) {
    return null;
  }

  return mapAnalysisRow(
    result.rows[0]
  );
};

const findAnalysisByIdForUser = async (
  analysisId,
  userId
) => {
  const sql = `
    SELECT
      id,
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators,
      created_at
    FROM analyses
    WHERE id = $1
      AND user_id = $2
    LIMIT 1
  `;

  const result =
    await query(sql, [
      analysisId,
      userId
    ]);

  if (!result.rows[0]) {
    return null;
  }

  return mapAnalysisRow(
    result.rows[0]
  );
};

const listAnalysesByUser = async ({
  userId,
  limit,
  offset
}) => {
  const sql = `
    SELECT
      id,
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators,
      created_at
    FROM analyses
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
  `;

  const result =
    await query(sql, [
      userId,
      limit,
      offset
    ]);

  return result.rows.map(
    mapAnalysisRow
  );
};

const countAnalysesByUser = async (
  userId
) => {
  const sql = `
    SELECT COUNT(*)::INTEGER AS total
    FROM analyses
    WHERE user_id = $1
  `;

  const result =
    await query(sql, [userId]);

  return result.rows[0].total;
};

const deleteAnalysisByIdForUser = async (
  analysisId,
  userId
) => {
  const sql = `
    DELETE FROM analyses
    WHERE id = $1
      AND user_id = $2
    RETURNING id
  `;

  const result =
    await query(sql, [
      analysisId,
      userId
    ]);

  return result.rows[0] || null;
};

const deleteAnalysisById = async (
  analysisId
) => {
  const sql = `
    DELETE FROM analyses
    WHERE id = $1
    RETURNING id
  `;

  const result =
    await query(sql, [analysisId]);

  return result.rows[0] || null;
};

const getRiskSummaryByUser = async (
  userId
) => {
  const sql = `
    SELECT
      COUNT(*)::INTEGER AS total_analyses,

      COUNT(*) FILTER (
        WHERE risk_level = 'low'
      )::INTEGER AS low_risk,

      COUNT(*) FILTER (
        WHERE risk_level = 'medium'
      )::INTEGER AS medium_risk,

      COUNT(*) FILTER (
        WHERE risk_level = 'high'
      )::INTEGER AS high_risk,

      COUNT(*) FILTER (
        WHERE risk_level = 'critical'
      )::INTEGER AS critical_risk

    FROM analyses
    WHERE user_id = $1
  `;

  const result =
    await query(sql, [userId]);

  return {
    totalAnalyses:
      result.rows[0].total_analyses,

    lowRisk:
      result.rows[0].low_risk,

    mediumRisk:
      result.rows[0].medium_risk,

    highRisk:
      result.rows[0].high_risk,

    criticalRisk:
      result.rows[0].critical_risk
  };
};

const getRecentAnalysesByUser = async (
  userId,
  limit = 5
) => {
  const sql = `
    SELECT
      id,
      user_id,
      url,
      risk_score,
      risk_level,
      summary,
      indicators,
      created_at
    FROM analyses
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result =
    await query(sql, [
      userId,
      limit
    ]);

  return result.rows.map(
    mapAnalysisRow
  );
};

module.exports = {
  createAnalysis,
  findAnalysisById,
  findAnalysisByIdForUser,
  listAnalysesByUser,
  countAnalysesByUser,
  deleteAnalysisByIdForUser,
  deleteAnalysisById,
  getRiskSummaryByUser,
  getRecentAnalysesByUser
};