const net = require("node:net");

const analyzeUrl = (rawUrl) => {
  const parsedUrl = new URL(rawUrl);

  const indicators = [];

  const addIndicator = ({
    code,
    title,
    description,
    severity,
    score
  }) => {
    indicators.push({
      code,
      title,
      description,
      severity,
      score
    });
  };

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname =
  parsedUrl.pathname.toLowerCase();

const searchParams =
  parsedUrl.searchParams;

  /*
   * 1. HTTP instead of HTTPS
   */
  if (parsedUrl.protocol === "http:") {
    addIndicator({
      code: "HTTP_NOT_HTTPS",
      title: "Connection is not using HTTPS",
      description:
        "The submitted URL uses HTTP rather than HTTPS. Information exchanged with the destination may not receive transport encryption.",
      severity: "medium",
      score: 10
    });
  }

  /*
   * 2. IP address as hostname
   */
  if (net.isIP(hostname)) {
    addIndicator({
      code: "IP_ADDRESS_HOST",
      title: "IP address used as host",
      description:
        "The URL uses an IP address instead of a conventional domain name.",
      severity: "high",
      score: 25
    });
  }

  /*
   * 3. Punycode
   */
  if (hostname.includes("xn--")) {
    addIndicator({
      code: "PUNYCODE_DOMAIN",
      title: "Punycode hostname detected",
      description:
        "The hostname contains Punycode encoding. Internationalized domains can be legitimate, but this characteristic may warrant additional verification.",
      severity: "medium",
      score: 20
    });
  }

  /*
   * 4. Excessive subdomains
   */
  const hostnameParts = hostname
    .split(".")
    .filter(Boolean);

  const subdomainCount =
    Math.max(hostnameParts.length - 2, 0);

  if (subdomainCount >= 4) {
    addIndicator({
      code: "EXCESSIVE_SUBDOMAINS",
      title: "Excessive subdomains detected",
      description:
        "The hostname contains an unusually large number of subdomain levels.",
      severity: "low",
      score: 10
    });
  }

  /*
   * 5. Long URL
   */
  if (rawUrl.length > 200) {
    addIndicator({
      code: "LONG_URL",
      title: "Unusually long URL",
      description:
        "The submitted URL is unusually long and may warrant additional caution.",
      severity: "low",
      score: 10
    });
  }

  /*
   * 6. Suspicious characters
   */
  const suspiciousCharacterPattern =
    /[%{}[\]^`<>\\"]/;

  if (suspiciousCharacterPattern.test(rawUrl)) {
    addIndicator({
      code: "SUSPICIOUS_CHARACTERS",
      title: "Potentially suspicious URL characters",
      description:
        "The URL contains characters that can make URL structure harder to interpret and may warrant additional inspection.",
      severity: "medium",
      score: 10
    });
  }

  /*
   * 7. @ symbol
   */
  if (parsedUrl.username || parsedUrl.password || rawUrl.includes("@")) {
    addIndicator({
      code: "AT_SYMBOL_IN_URL",
      title: "At-symbol present in URL",
      description:
        "The URL contains an at-symbol or user-information component. This structure can sometimes be used to make a destination appear misleading.",
      severity: "high",
      score: 20
    });
  }

  /*
   * 8. Credentials embedded in URL
   */
  if (parsedUrl.username || parsedUrl.password) {
    addIndicator({
      code: "CREDENTIALS_IN_URL",
      title: "Credentials embedded in URL",
      description:
        "The URL contains a username or password component. Credentials should generally not be embedded directly in links.",
      severity: "high",
      score: 25
    });
  }

  /*
   * 9. Excessive hyphens
   */
  const hyphenCount =
    (hostname.match(/-/g) || []).length;

  if (hyphenCount >= 4) {
    addIndicator({
      code: "MANY_HYPHENS",
      title: "Many hyphens in hostname",
      description:
        "The hostname contains an unusually high number of hyphens.",
      severity: "low",
      score: 5
    });
  }

  /*
   * 10. Suspicious TLD catalog
   *
   * This is intentionally a caution list,
   * not a malicious-domain list.
   */
  const suspiciousTlds = new Set([
    "zip",
    "mov",
    "click",
    "top",
    "xyz",
    "work",
    "buzz",
    "gq",
    "tk",
    "ml",
    "cf"
  ]);

  const tldParts = hostname.split(".");
  const tld =
    tldParts.length > 1
      ? tldParts[tldParts.length - 1]
      : "";

  if (suspiciousTlds.has(tld)) {
    addIndicator({
      code: "SUSPICIOUS_TLD",
      title: "Potentially higher-risk domain extension",
      description:
        "The domain uses an extension that TrustShield flags for additional caution. A TLD alone does not prove that a website is malicious.",
      severity: "medium",
      score: 15
    });
  }

  /*
   * 11. URL shorteners
   */
  const shortenerDomains = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "ow.ly",
    "buff.ly",
    "rebrand.ly"
  ]);

  if (shortenerDomains.has(hostname)) {
    addIndicator({
      code: "URL_SHORTENER",
      title: "URL shortening service detected",
      description:
        "The submitted URL uses a URL-shortening service, which can hide the final destination from the reader.",
      severity: "medium",
      score: 10
    });
  }

  /*
   * 12. Numeric-heavy hostname
   */
  const digits =
    (hostname.match(/[0-9]/g) || []).length;

  const letters =
    (hostname.match(/[a-z]/g) || []).length;

  if (
    hostname.length >= 8 &&
    digits >= 5 &&
    digits > letters
  ) {
    addIndicator({
      code: "NUMERIC_HEAVY_HOST",
      title: "Numeric-heavy hostname",
      description:
        "The hostname contains an unusually high proportion of numeric characters.",
      severity: "medium",
      score: 10
    });
  }

  /*
   * 13. Non-standard port
   */
  const port = parsedUrl.port;

  if (
    port &&
    !(
      (parsedUrl.protocol === "http:" &&
        port === "80") ||
      (parsedUrl.protocol === "https:" &&
        port === "443")
    )
  ) {
    addIndicator({
      code: "NON_STANDARD_PORT",
      title: "Non-standard web port",
      description:
        "The URL specifies a port that is not the conventional port for its protocol.",
      severity: "medium",
      score: 10
    });
  }

  /*
   * 14. Fragment information
   *
   * Informational only.
   */
  if (parsedUrl.hash) {
    addIndicator({
      code: "FRAGMENT_PRESENT",
      title: "URL fragment detected",
      description:
        "The URL contains a fragment identifier. This is not inherently suspicious but is recorded as part of the URL structure.",
      severity: "low",
      score: 0
    });
  }
  //
  /*
 * 15. Login-related paths
 */

const loginPaths = [
  "login",
  "signin",
  "verify",
  "account",
  "password",
  "reset",
  "security",
  "auth",
  "confirm"
];

const hasLoginPath =
  loginPaths.some((keyword) =>
    pathname.includes(keyword)
  );

if (hasLoginPath) {
  addIndicator({
    code: "LOGIN_RELATED_PATH",
    title: "Sensitive account-related path",
    description:
      "The URL contains terms associated with authentication, account access, or verification.",
    severity: "low",
    score: 5
  });
}
//
/*
 * 16. Redirect parameters
 */

const redirectParams = [
  "redirect",
  "url",
  "next",
  "return",
  "continue",
  "target"
];

const hasRedirectParam =
  redirectParams.some((param) =>
    searchParams.has(param)
  );

if (hasRedirectParam) {
  addIndicator({
    code: "REDIRECT_PARAMETER",
    title: "Redirect parameter detected",
    description:
      "The URL contains a parameter commonly used for redirect destinations.",
    severity: "medium",
    score: 10
  });
}

  return {
    normalizedUrl: parsedUrl.toString(),
    indicators
  };
};

module.exports = {
  analyzeUrl
};