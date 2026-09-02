const { query } = require("../config/database");

const saveAnalysisContext = async ({
  analysisId,
  contextText = "",
  extractedSignals = {},
  language = "en"
}) => {
  const sql = `
    INSERT INTO analysis_context (
      analysis_id,
      context_text,
      extracted_signals,
      language
    )
    VALUES ($1, $2, $3::jsonb, $4)
    ON CONFLICT (analysis_id)
    DO UPDATE SET
      context_text = EXCLUDED.context_text,
      extracted_signals = EXCLUDED.extracted_signals,
      language = EXCLUDED.language,
      updated_at = NOW()
    RETURNING id, analysis_id, context_text, extracted_signals, language, created_at, updated_at
  `;

  const result = await query(sql, [
    analysisId,
    contextText,
    JSON.stringify(extractedSignals),
    language
  ]);

  return result.rows[0];
};

const findContextByAnalysisId = async (analysisId) => {
  const sql = `
    SELECT id, analysis_id, context_text, extracted_signals, language, created_at, updated_at
    FROM analysis_context
    WHERE analysis_id = $1
    LIMIT 1
  `;

  const result = await query(sql, [analysisId]);
  return result.rows[0] || null;
};

module.exports = {
  saveAnalysisContext,
  findContextByAnalysisId
};
