const riskStyles = {
  low: {
    icon: "🟢",
    label: "LOW RISK",
    className: "border-green-200 bg-green-50 text-green-800",
  },
  medium: {
    icon: "🟠",
    label: "MEDIUM RISK",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  high: {
    icon: "🔴",
    label: "HIGH RISK",
    className: "border-red-200 bg-red-50 text-red-800",
  },
  critical: {
    icon: "🚨",
    label: "CRITICAL",
    className: "border-red-300 bg-red-100 text-red-900",
  },
  unknown: {
    icon: "⚪",
    label: "INCONCLUSIVE",
    className: "border-slate-300 bg-slate-100 text-slate-800",
  },
};

const RiskBadge = ({ level = "unknown" }) => {
  const normalizedLevel = String(level).toLowerCase();

  const risk = riskStyles[normalizedLevel] ?? riskStyles.unknown;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold tracking-wide ${risk.className}`}
      aria-label={`Risk level: ${risk.label}`}
    >
      <span aria-hidden="true">{risk.icon}</span>
      <span>{risk.label}</span>
    </div>
  );
};

export default RiskBadge;