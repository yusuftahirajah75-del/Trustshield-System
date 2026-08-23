const Input = ({
  id,
  label,
  error,
  helperText,
  className = "",
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;

  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-lg border bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-600 focus:ring-blue-200"
        } ${className}`}
        {...props}
      />

      {helperText && !error && (
        <p id={helperId} className="mt-2 text-sm text-slate-500">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;