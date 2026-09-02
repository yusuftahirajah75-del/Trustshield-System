const { query } = require("../config/database");

const createApiKey = async ({
  userId,
  name,
  keyHash,
  keyPrefix,
  rateLimitPerMinute = 60
}) => {
  const sql = `
    INSERT INTO api_keys (
      user_id,
      name,
      key_hash,
      key_prefix,
      rate_limit_per_minute
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, name, key_prefix, rate_limit_per_minute, is_active, created_at
  `;

  const result = await query(sql, [
    userId,
    name,
    keyHash,
    keyPrefix,
    rateLimitPerMinute
  ]);

  return result.rows[0];
};

const findApiKeyByHash = async (keyHash) => {
  const sql = `
    SELECT id, user_id, name, key_hash, key_prefix, rate_limit_per_minute, is_active, last_used_at, created_at
    FROM api_keys
    WHERE key_hash = $1 AND is_active = TRUE
    LIMIT 1
  `;

  const result = await query(sql, [keyHash]);
  return result.rows[0] || null;
};

const findApiKeyById = async (id) => {
  const sql = `
    SELECT id, user_id, name, key_prefix, rate_limit_per_minute, is_active, last_used_at, created_at
    FROM api_keys
    WHERE id = $1
    LIMIT 1
  `;

  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

const listApiKeysByUser = async (userId) => {
  const sql = `
    SELECT id, user_id, name, key_prefix, rate_limit_per_minute, is_active, last_used_at, created_at
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await query(sql, [userId]);
  return result.rows;
};

const revokeApiKey = async (id, userId) => {
  const sql = `
    UPDATE api_keys
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, name, is_active
  `;

  const result = await query(sql, [id, userId]);
  return result.rows[0] || null;
};

const updateLastUsed = async (id) => {
  const sql = `
    UPDATE api_keys
    SET last_used_at = NOW()
    WHERE id = $1
  `;
  await query(sql, [id]);
};

const logApiUsage = async ({
  apiKeyId = null,
  userId = null,
  endpoint,
  method = "POST",
  statusCode,
  riskLevel = null,
  isThreat = false,
  ipAddress = null,
  responseTimeMs = null
}) => {
  const sql = `
    INSERT INTO api_usage_logs (
      api_key_id,
      user_id,
      endpoint,
      method,
      status_code,
      risk_level,
      is_threat,
      ip_address,
      response_time_ms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const result = await query(sql, [
    apiKeyId,
    userId,
    endpoint,
    method,
    statusCode,
    riskLevel,
    isThreat,
    ipAddress,
    responseTimeMs
  ]);

  return result.rows[0];
};

const getDeveloperStats = async (userId) => {
  // Aggregate from api_usage_logs
  const usageStatsSql = `
    SELECT
      COUNT(*)::INTEGER AS total_requests,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::INTEGER AS successful_requests,
      COUNT(*) FILTER (WHERE status_code >= 400)::INTEGER AS failed_requests,
      COUNT(*) FILTER (WHERE is_threat = TRUE OR LOWER(risk_level) IN ('high', 'critical'))::INTEGER AS threat_detections,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::INTEGER AS requests_last_24h,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'low')::INTEGER AS low_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'medium')::INTEGER AS medium_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'high')::INTEGER AS high_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'critical')::INTEGER AS critical_risk
    FROM api_usage_logs
    WHERE user_id = $1
  `;

  // Fallback / complement from analyses table for users without API logs yet
  const analysesStatsSql = `
    SELECT
      COUNT(*)::INTEGER AS total_analyses,
      COUNT(*) FILTER (WHERE LOWER(risk_level) IN ('high', 'critical'))::INTEGER AS total_threats,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::INTEGER AS analyses_last_24h,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'low')::INTEGER AS low_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'medium')::INTEGER AS medium_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'high')::INTEGER AS high_risk,
      COUNT(*) FILTER (WHERE LOWER(risk_level) = 'critical')::INTEGER AS critical_risk
    FROM analyses
    WHERE user_id = $1
  `;

  const [usageRes, analysesRes] = await Promise.all([
    query(usageStatsSql, [userId]),
    query(analysesStatsSql, [userId])
  ]);

  const u = usageRes.rows[0];
  const a = analysesRes.rows[0];

  const hasApiLogs = (u?.total_requests || 0) > 0;
  const totalRequests = hasApiLogs ? u.total_requests : (a?.total_analyses || 0);
  const successfulRequests = hasApiLogs ? u.successful_requests : (a?.total_analyses || 0);
  const failedRequests = hasApiLogs ? u.failed_requests : 0;
  const threatDetections = hasApiLogs ? u.threat_detections : (a?.total_threats || 0);
  const requestsToday = hasApiLogs ? u.requests_last_24h : (a?.analyses_last_24h || 0);

  const lowRisk = hasApiLogs ? u.low_risk : (a?.low_risk || 0);
  const mediumRisk = hasApiLogs ? u.medium_risk : (a?.medium_risk || 0);
  const highRisk = hasApiLogs ? u.high_risk : (a?.high_risk || 0);
  const criticalRisk = hasApiLogs ? u.critical_risk : (a?.critical_risk || 0);

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    threatDetections,
    requestsToday,
    riskDistribution: {
      low: lowRisk,
      medium: mediumRisk,
      high: highRisk,
      critical: criticalRisk
    },
    usage: {
      used: totalRequests,
      limit: 10000,
      percentage: Number(((totalRequests / 10000) * 100).toFixed(1))
    }
  };
};

const getRecentActivity = async (userId, limit = 10) => {
  const sql = `
    SELECT
      id,
      method,
      endpoint,
      status_code AS "statusCode",
      risk_level AS "riskLevel",
      is_threat AS "isThreat",
      ip_address AS "ipAddress",
      response_time_ms AS "responseTimeMs",
      created_at AS "createdAt"
    FROM api_usage_logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result = await query(sql, [userId, limit]);
  return result.rows;
};

const getRecentThreats = async (userId, limit = 5) => {
  const sql = `
    SELECT
      a.id,
      a.url,
      a.risk_score,
      a.risk_level,
      a.summary,
      a.created_at,
      sp.pattern_name,
      sp.pattern_code,
      m.confidence AS pattern_confidence
    FROM analyses a
    LEFT JOIN scam_pattern_matches m ON m.analysis_id = a.id
    LEFT JOIN scam_patterns sp ON sp.id = m.pattern_id
    WHERE (a.user_id = $1 OR $1 IS NULL)
      AND LOWER(a.risk_level) IN ('high', 'critical')
    ORDER BY a.created_at DESC
    LIMIT $2
  `;

  const result = await query(sql, [userId, limit]);
  return result.rows.map((r) => ({
    id: r.id,
    url: r.url,
    riskScore: r.risk_score,
    riskLevel: String(r.risk_level).toUpperCase(),
    summary: r.summary,
    scamPattern: r.pattern_name
      ? {
          name: r.pattern_name,
          code: r.pattern_code,
          confidence: Number(r.pattern_confidence)
        }
      : null,
    createdAt: r.created_at
  }));
};

const getRecentChecks = async (userId, limit = 10) => {
  const sql = `
    SELECT
      a.id,
      a.url,
      a.risk_score,
      a.risk_level,
      a.summary,
      a.created_at,
      sp.pattern_name,
      sp.pattern_code,
      m.confidence AS pattern_confidence
    FROM analyses a
    LEFT JOIN scam_pattern_matches m ON m.analysis_id = a.id
    LEFT JOIN scam_patterns sp ON sp.id = m.pattern_id
    WHERE (a.user_id = $1 OR $1 IS NULL)
    ORDER BY a.created_at DESC
    LIMIT $2
  `;

  const result = await query(sql, [userId, limit]);
  return result.rows.map((r) => ({
    id: r.id,
    url: r.url,
    riskScore: r.risk_score,
    riskLevel: String(r.risk_level).toUpperCase(),
    summary: r.summary,
    scamPattern: r.pattern_name
      ? {
          name: r.pattern_name,
          code: r.pattern_code,
          confidence: Number(r.pattern_confidence)
        }
      : null,
    createdAt: r.created_at
  }));
};

module.exports = {
  createApiKey,
  findApiKeyByHash,
  findApiKeyById,
  listApiKeysByUser,
  revokeApiKey,
  updateLastUsed,
  logApiUsage,
  getDeveloperStats,
  getRecentActivity,
  getRecentThreats,
  getRecentChecks
};
