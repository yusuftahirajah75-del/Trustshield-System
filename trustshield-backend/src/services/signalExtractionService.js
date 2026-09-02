const { analyzeUrl } = require("./urlAnalysisService");
const { normalizeSemanticEvidence } = require("./semanticSignalAdapterService");

// Deterministic catalog of high-target brands and their legitimate root domains
const BRAND_TARGETS = [
  {
    code: "GOVERNMENT_CLAIM",
    brand: "Central Bank of Nigeria (CBN)",
    patterns: [/\bcbn\b/i, /centralbank/i],
    legitimateDomains: ["cbn.gov.ng"]
  },
  {
    code: "GOVERNMENT_CLAIM",
    brand: "Federal Government / Public Portal",
    patterns: [/npower/i, /inec/i, /firs\.gov/i, /fedgov/i, /palliative/i, /youthfund/i],
    legitimateDomains: ["gov.ng", "inecnigeria.org"]
  },
  {
    code: "BANKING_CLAIM",
    brand: "GTBank / Guaranty Trust",
    patterns: [/gtbank/i, /\bgtb\b/i, /guarantytrust/i],
    legitimateDomains: ["gtbank.com", "gtcoplc.com"]
  },
  {
    code: "BANKING_CLAIM",
    brand: "Zenith Bank",
    patterns: [/zenithbank/i, /\bzenith\b/i],
    legitimateDomains: ["zenithbank.com"]
  },
  {
    code: "BANKING_CLAIM",
    brand: "Access Bank",
    patterns: [/accessbank/i, /accessmore/i],
    legitimateDomains: ["accessbankplc.com"]
  },
  {
    code: "BANKING_CLAIM",
    brand: "First Bank of Nigeria",
    patterns: [/firstbank/i, /firstmonie/i],
    legitimateDomains: ["firstbanknigeria.com"]
  },
  {
    code: "BANKING_CLAIM",
    brand: "United Bank for Africa (UBA)",
    patterns: [/\buba\b/i, /ubagroup/i],
    legitimateDomains: ["ubagroup.com"]
  },
  {
    code: "FINTECH_CLAIM",
    brand: "OPay",
    patterns: [/opay/i],
    legitimateDomains: ["opayweb.com"]
  },
  {
    code: "FINTECH_CLAIM",
    brand: "PalmPay",
    patterns: [/palmpay/i],
    legitimateDomains: ["palmpay.com", "palmpay.co"]
  },
  {
    code: "FINTECH_CLAIM",
    brand: "Kuda Bank",
    patterns: [/\bkuda\b/i, /kudabank/i],
    legitimateDomains: ["kuda.com"]
  },
  {
    code: "FINTECH_CLAIM",
    brand: "Moniepoint",
    patterns: [/moniepoint/i],
    legitimateDomains: ["moniepoint.com"]
  },
  {
    code: "DELIVERY_CLAIM",
    brand: "DHL Express",
    patterns: [/\bdhl\b/i],
    legitimateDomains: ["dhl.com"]
  },
  {
    code: "DELIVERY_CLAIM",
    brand: "FedEx",
    patterns: [/fedex/i],
    legitimateDomains: ["fedex.com"]
  },
  {
    code: "DELIVERY_CLAIM",
    brand: "NIPOST / Nigerian Postal Service",
    patterns: [/nipost/i],
    legitimateDomains: ["nipost.gov.ng"]
  }
];

// Deterministic linguistic rule patterns
const LINGUISTIC_RULES = [
  {
    code: "BVN_REQUEST",
    regex: /\b(bvn|bank\s*verification\s*number)\b/i,
    evidence: "Context contains request for Bank Verification Number (BVN)"
  },
  {
    code: "NIN_REQUEST",
    regex: /\b(nin|national\s*identification\s*number|link\s*nin)\b/i,
    evidence: "Context contains request for National Identification Number (NIN)"
  },
  {
    code: "OTP_REQUEST",
    regex: /\b(otp|one[-\s]*time\s*password|verification\s*code|sms\s*code|token\s*code)\b/i,
    evidence: "Context prompts for one-time verification passcode (OTP)"
  },
  {
    code: "PIN_REQUEST",
    regex: /\b(atm\s*pin|transaction\s*pin|card\s*pin|4[-\s]*digit\s*pin)\b/i,
    evidence: "Context requests confidential payment or ATM PIN"
  },
  {
    code: "CARD_REQUEST",
    regex: /\b(cvv|card\s*number|expiration\s*date|expiry\s*date|atm\s*card\s*details)\b/i,
    evidence: "Context requests full debit/credit card details"
  },
  {
    code: "CREDENTIAL_REQUEST",
    regex: /\b(login\s*here|enter\s*your\s*password|confirm\s*password|reset\s*your\s*password|verify\s*account|security\s*question)\b/i,
    evidence: "Context solicits account login or authentication credentials"
  },
  {
    code: "FINANCIAL_LURE",
    regex: /\b(claim\s*(grant|palliative|funds?|bonus|reward|cash|\$\d+|₦\d+)|disbursement|congratulations\s*you\s*(have\s*)?won|approved\s*(palliative|grant|loan)|free\s*(airtime|money|cash))\b/i,
    evidence: "Lure promising monetary grants, subsidies, or rewards detected"
  },
  {
    code: "GOVERNMENT_CLAIM",
    regex: /\b(federal\s*government|presidential\s*grant|cbn\s*grant|empowerment\s*fund|palliative\s*fund|national\s*grant|public\s*benefit)\b/i,
    evidence: "Deceptive claim of official government authority or relief program"
  },
  {
    code: "BANKING_CLAIM",
    regex: /\b(bank\s*alert|account\s*(suspended|deactivated|upgraded)|bank\s*support|customer\s*care\s*line|bank\s*portal)\b/i,
    evidence: "Banking institution verification or warning context"
  },
  {
    code: "FINTECH_CLAIM",
    regex: /\b(wallet\s*(suspended|limit|upgrade)|cashback\s*reward|pos\s*terminal\s*grant)\b/i,
    evidence: "Digital wallet or fintech service context"
  },
  {
    code: "JOB_CLAIM",
    regex: /\b(recruitment\s*form|job\s*application|shortlisted\s*candidates|employment\s*offer|interview\s*invitation|apply\s*for\s*job)\b/i,
    evidence: "Recruitment or employment opportunity context"
  },
  {
    code: "INVESTMENT_CLAIM",
    regex: /\b(double\s*your\s*(money|capital|investment)|daily\s*roi|guaranteed\s*returns?|crypto\s*mining\s*pool|investment\s*packages?|earn\s*hourly)\b/i,
    evidence: "High-yield investment program (HYIP) or financial return scheme"
  },
  {
    code: "DELIVERY_CLAIM",
    regex: /\b(parcel\s*pending|package\s*awaiting|shipping\s*fee|customs\s*clearance|track\s*your\s*shipment|delivery\s*failed)\b/i,
    evidence: "Courier or postal delivery notification context"
  },
  {
    code: "PAYMENT_REQUEST",
    regex: /\b(pay(\s+\w+)?\s*(fee|now|charges?|clearance|processing)|deposit\s*to\s*claim|activation\s*fee|transfer\s*fee|advance\s*payment|clearance\s*charge)\b/i,
    evidence: "Request for advance fee, registration fee, or payment transfer"
  },
  {
    code: "URGENCY",
    regex: /\b(urgent(ly)?|within\s*24\s*hours?|expires\s*(today|soon)|immediate(ly)?|act\s*now|last\s*chance|before\s*it('s|\s*is)\s*blocked|limited\s*time)\b/i,
    evidence: "Urgency tactics intended to compel immediate user compliance"
  }
];

/**
 * Deterministically extracts signals and evidence from URL analysis, text context,
 * and provided semantic evidence.
 */
const extractSignals = ({
  url,
  contextText = "",
  semanticEvidence = [],
  urlIndicators = []
}) => {
  const extractedSignals = new Set();
  const evidenceList = [];

  // 1. Incorporate URL indicators
  for (const ind of urlIndicators) {
    if (ind.code) {
      extractedSignals.add(ind.code);
      evidenceList.push({
        source: "url_structure",
        code: ind.code,
        title: ind.title || ind.code,
        detail: ind.description || ""
      });
    }
  }

  // 2. Incorporate explicitly provided semantic evidence
  const normalizedProvided = normalizeSemanticEvidence(semanticEvidence);
  for (const item of normalizedProvided) {
    extractedSignals.add(item.code);
    evidenceList.push({
      source: "caller_evidence",
      code: item.code,
      title: item.code,
      detail: "Signal provided directly in analysis request"
    });
  }

  // 3. Inspect URL domain for Brand Impersonation
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrlText = `${url} ${parsed.pathname} ${parsed.search}`.toLowerCase();

    for (const target of BRAND_TARGETS) {
      const brandMatched = target.patterns.some((p) => p.test(hostname));
      if (brandMatched) {
        const isLegit = target.legitimateDomains.some(
          (legit) => hostname === legit || hostname.endsWith(`.${legit}`)
        );

        if (!isLegit) {
          extractedSignals.add(target.code);
          extractedSignals.add("BRAND_IMPERSONATION");
          evidenceList.push({
            source: "brand_impersonation",
            code: target.code,
            title: `Impersonation of ${target.brand}`,
            detail: `Domain "${hostname}" closely resembles ${target.brand} but does not resolve to the legitimate domain (${target.legitimateDomains.join(", ")})`
          });
        }
      }
    }

    // Inspect URL path and query for linguistic triggers
    for (const rule of LINGUISTIC_RULES) {
      if (rule.regex.test(fullUrlText)) {
        extractedSignals.add(rule.code);
        evidenceList.push({
          source: "url_text",
          code: rule.code,
          title: rule.code,
          detail: rule.evidence
        });
      }
    }
  } catch {
    // Malformed URL handled elsewhere
  }

  // 4. Linguistic Keyword Analysis on contextText (SMS, email body, page content)
  if (contextText && typeof contextText === "string") {
    for (const rule of LINGUISTIC_RULES) {
      if (rule.regex.test(contextText)) {
        extractedSignals.add(rule.code);
        evidenceList.push({
          source: "context_text",
          code: rule.code,
          title: rule.code,
          detail: rule.evidence
        });
      }
    }
  }

  return {
    signals: Array.from(extractedSignals).map((code) => ({ code })),
    signalCodes: Array.from(extractedSignals),
    evidence: evidenceList
  };
};

module.exports = {
  extractSignals,
  BRAND_TARGETS,
  LINGUISTIC_RULES
};
