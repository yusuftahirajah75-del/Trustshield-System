const { query } = require("../config/database");

const createReport = async ({
  userId = null,
  url,
  category,
  description = "",
  evidence = [],
  status = "submitted",
  patternId = null
}) => {
  const sql = `
    INSERT INTO scam_reports (
      user_id,
      url,
      category,
      description,
      evidence,
      status,
      pattern_id
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
    RETURNING id, user_id, url, category, description, evidence, status, pattern_id, created_at, updated_at
  `;

  const result = await query(sql, [
    userId,
    url,
    category,
    description,
    JSON.stringify(evidence),
    status,
    patternId
  ]);

  return result.rows[0];
};

const listReports = async ({ limit = 20, offset = 0, userId = null } = {}) => {
  let sql = `
    SELECT
      r.id,
      r.user_id,
      r.url,
      r.category,
      r.description,
      r.evidence,
      r.status,
      r.pattern_id,
      r.created_at,
      r.updated_at,
      sp.pattern_name,
      sp.pattern_code
    FROM scam_reports r
    LEFT JOIN scam_patterns sp ON sp.id = r.pattern_id
  `;

  const values = [];
  if (userId) {
    values.push(userId);
    sql += ` WHERE r.user_id = $1 `;
  }

  values.push(limit);
  values.push(offset);
  sql += ` ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length} `;

  const result = await query(sql, values);
  return result.rows;
};

const findReportById = async (id) => {
  const sql = `
    SELECT
      r.id,
      r.user_id,
      r.url,
      r.category,
      r.description,
      r.evidence,
      r.status,
      r.pattern_id,
      r.created_at,
      r.updated_at,
      sp.pattern_name,
      sp.pattern_code
    FROM scam_reports r
    LEFT JOIN scam_patterns sp ON sp.id = r.pattern_id
    WHERE r.id = $1
    LIMIT 1
  `;

  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

module.exports = {
  createReport,
  listReports,
  findReportById
};
