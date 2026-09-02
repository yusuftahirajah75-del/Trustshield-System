const SUPPORTED_SEMANTIC_SIGNALS = new Set([
  "BANKING_CLAIM",
  "BVN_REQUEST",
  "CARD_REQUEST",
  "CREDENTIAL_REQUEST",
  "DELIVERY_CLAIM",
  "FINANCIAL_LURE",
  "FINTECH_CLAIM",
  "GOVERNMENT_CLAIM",
  "INVESTMENT_CLAIM",
  "JOB_CLAIM",
  "NIN_REQUEST",
  "OTP_REQUEST",
  "PAYMENT_REQUEST",
  "PIN_REQUEST",
  "URGENCY",
  "AT_SYMBOL_IN_URL",
  "IP_ADDRESS_HOST",
  "LOGIN_RELATED_PATH",
  "REDIRECT_PARAMETER",
  "SUSPICIOUS_TLD",
  "URL_SHORTENER"
]);

const normalizeSemanticSignals = (signals) => {
  if (!Array.isArray(signals)) {
    throw new TypeError(
      "Semantic signal source requires a signals array."
    );
  }

  const seen = new Set();

  return signals
    .map((signal) => {
      if (typeof signal === "string") {
        return signal;
      }

      if (
        signal &&
        typeof signal === "object" &&
        typeof signal.code === "string"
      ) {
        return signal.code;
      }

      return null;
    })
    .map((code) =>
      typeof code === "string"
        ? code.trim().toUpperCase()
        : null
    )
    .filter((code) => {
      if (!code) return false;
      if (!SUPPORTED_SEMANTIC_SIGNALS.has(code)) {
        return false;
      }
      if (seen.has(code)) {
        return false;
      }

      seen.add(code);
      return true;
    })
    .map((code) => ({
      code
    }));
};

module.exports = {
  SUPPORTED_SEMANTIC_SIGNALS,
  normalizeSemanticSignals
};