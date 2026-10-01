import type { RxFormApi } from "../useRxOrderForm";
import type { RxCatalog } from "../types";

/** What every card receives. */
export interface CardProps {
  api: RxFormApi;
  catalog: RxCatalog;
  /** Folding state, owned by the container. */
  step: { folded: boolean; edit: () => void };
  /** Show a short message (toast). */
  notify: (message: string) => void;
}
