const isDev = import.meta.env.DEV;

/**
 * Logs an error without exposing raw error objects (database messages, table
 * names, stack traces) to the browser console in production.
 *
 * In development the full error is forwarded so debugging stays easy.
 */
export const safeError = (context: string, error: unknown): void => {
  if (isDev) {
    console.error(context, error);
  } else {
    console.error(context);
  }
};

export const safeWarn = (context: string, error: unknown): void => {
  if (isDev) {
    console.warn(context, error);
  } else {
    console.warn(context);
  }
};
