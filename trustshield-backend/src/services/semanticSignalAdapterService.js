const {
  normalizeSemanticSignals
} = require("./semanticSignalSourceService");

const normalizeSemanticEvidence = (
  evidence
) => {
  if (!Array.isArray(evidence)) {
    throw new TypeError(
      "Semantic evidence adapter requires an evidence array."
    );
  }

  const candidates = evidence
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (
        item &&
        typeof item === "object"
      ) {
        if (
          typeof item.code === "string"
        ) {
          return item.code;
        }

        if (
          typeof item.signalCode === "string"
        ) {
          return item.signalCode;
        }
      }

      return null;
    })
    .filter(Boolean);

  return normalizeSemanticSignals(
    candidates
  );
};

module.exports = {
  normalizeSemanticEvidence
};