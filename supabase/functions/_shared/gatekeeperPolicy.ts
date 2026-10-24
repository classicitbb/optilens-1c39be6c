import type { OrderKind } from "./orders/hashref.ts";

export type GatekeeperPreSendFailureKind = "configuration" | "authentication" | "connectivity";

export const shouldFallbackGatekeeperRx = ({
  orderKind,
  postStarted,
  failureKind,
  fallbackEnabled,
}: {
  orderKind: OrderKind;
  postStarted: boolean;
  failureKind: GatekeeperPreSendFailureKind | null;
  fallbackEnabled: boolean;
}) => orderKind === "rx" && !postStarted && failureKind !== null && fallbackEnabled;
