/**
 * Structured logger emitting JSON to stdout.
 *
 * Cloud Run parses JSON on stdout automatically and maps:
 *  - severity  → log level badge in Cloud Logging
 *  - message   → displayed text
 *  - other fields → jsonPayload.* (searchable/filterable)
 */

type Severity = "DEBUG" | "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";

interface LogFields {
  [key: string]: unknown;
}

function emit(severity: Severity, message: string, fields: LogFields = {}): void {
  const payload = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  // stderr for WARNING+, stdout otherwise (Cloud Run convention)
  const stream =
    severity === "WARNING" ||
    severity === "ERROR" ||
    severity === "CRITICAL"
      ? process.stderr
      : process.stdout;

  stream.write(JSON.stringify(payload) + "\n");
}

function serializeError(err: unknown): LogFields {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    };
  }
  return { error: String(err) };
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    emit("DEBUG", message, fields);
  },
  info(message: string, fields?: LogFields) {
    emit("INFO", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    emit("WARNING", message, fields);
  },
  error(message: string, err?: unknown, fields?: LogFields) {
    emit("ERROR", message, { ...serializeError(err), ...fields });
  },
  critical(message: string, err?: unknown, fields?: LogFields) {
    emit("CRITICAL", message, { ...serializeError(err), ...fields });
  },
};
