export type GatekeeperStatusOutcome = {
  pulled?: boolean;
  reason?: string;
  updated?: number;
  nextAttemptAt?: string | null;
};

export const gatekeeperStatusToast = (data: GatekeeperStatusOutcome) => {
  if (data.pulled) return { title: "Lab statuses refreshed", description: `${data.updated ?? 0} order(s) updated.` };
  if (data.reason === "throttled") return { title: "Already up to date", description: "Lab statuses refresh at most every 5 minutes." };
  if (data.reason === "disabled") return { title: "Status polling is paused", description: "Reconnect Gatekeeper to production and enable polling in Integrations." };
  if (data.reason === "production_connection_required") return { title: "Production connection required", description: "Stored staging credentials are not used for live status polling." };
  if (data.reason === "backoff" || data.reason === "temporarily_unavailable") {
    return {
      title: "Lab status service temporarily unavailable",
      description: data.nextAttemptAt
        ? `Existing statuses were retained. The next attempt is after ${new Date(data.nextAttemptAt).toLocaleString()}.`
        : "Existing statuses were retained and refresh will retry automatically.",
    };
  }
  return { title: "No statuses available", description: "The lab's status feed did not return any jobs." };
};
