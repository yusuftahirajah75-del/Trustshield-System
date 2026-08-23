const alertStyles = {
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-900",
    role: "status",
  },
  success: {
    container: "border-green-200 bg-green-50 text-green-900",
    role: "status",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    role: "alert",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-900",
    role: "alert",
  },
};

const Alert = ({ type = "info", title, children }) => {
  const selected = alertStyles[type] ?? alertStyles.info;

  return (
    <div
      role={selected.role}
      className={`rounded-xl border p-4 ${selected.container}`}
    >
      {title && <h3 className="font-semibold">{title}</h3>}

      <div className={title ? "mt-1 text-sm" : "text-sm"}>{children}</div>
    </div>
  );
};

export default Alert;