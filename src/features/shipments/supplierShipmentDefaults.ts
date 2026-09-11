export type ShipmentSupplierFields = {
  supplier_id: string;
  type: string;
  commodity: string;
};

export const mergeSupplierShipmentDefaults = <T extends ShipmentSupplierFields>(
  current: T,
  requestedSupplierId: string,
  previous: Partial<Pick<ShipmentSupplierFields, "type" | "commodity">> | null | undefined,
): T => {
  if (current.supplier_id !== requestedSupplierId) return current;
  const previousType = String(previous?.type ?? "").trim();
  const previousCommodity = String(previous?.commodity ?? "").trim();
  return {
    ...current,
    type: current.type.trim() || !previousType ? current.type : previousType,
    commodity: current.commodity.trim() || !previousCommodity ? current.commodity : previousCommodity,
  };
};
