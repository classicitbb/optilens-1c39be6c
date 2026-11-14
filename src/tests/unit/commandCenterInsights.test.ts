import { describe, expect, it } from "vitest";
import { buildActivity, buildNextActions, greetingForHour, orderStageIndex } from "@/features/portal/commandCenterInsights";
import type { CommandCenterOrder } from "@/features/portal/customerCommandCenter";

const order = (id: string, status: string, createdAt = "2026-11-01T10:00:00Z"): CommandCenterOrder => ({ id, status, totalAmount: 10, createdAt, updatedAt: null, checkoutMethod: null });
const base = { accessApproved: true, orders: [], liveOrderCount: 0, openTicketCount: 0, draftCount: 0, balance: 0, canViewStatements: true };

describe("commandCenterInsights", () => {
  it("maps statuses to lifecycle stages", () => {
    expect(orderStageIndex("pending_payment")).toBe(0);
    expect(orderStageIndex("processing")).toBe(2);
    expect(orderStageIndex("shipped")).toBe(3);
    expect(orderStageIndex("cancelled")).toBe(-1);
  });

  it("greets by hour", () => {
    expect([greetingForHour(8), greetingForHour(13), greetingForHour(20)]).toEqual(["Good morning", "Good afternoon", "Good evening"]);
  });

  it("returns nothing when the account is clear", () => {
    expect(buildNextActions(base)).toEqual([]);
  });

  it("orders urgent actions first and counts live lab orders", () => {
    const actions = buildNextActions({
      ...base,
      accessApproved: false,
      orders: [order("a", "pending_payment"), order("b", "confirmed")],
      liveOrderCount: 2,
      balance: 120,
      openTicketCount: 1,
      draftCount: 3,
    });
    expect(actions.map((a) => a.id)).toEqual(["access", "payment", "balance", "tickets", "drafts", "orders"]);
    expect(actions.find((a) => a.id === "orders")?.label).toBe("3 orders in progress");
  });

  it("hides the balance when statements are not available", () => {
    expect(buildNextActions({ ...base, balance: 50, canViewStatements: false })).toEqual([]);
  });

  it("builds a newest-first feed and skips invalid dates", () => {
    const feed = buildActivity({
      orders: [order("11111111-aaaa", "shipped", "2026-11-02T10:00:00Z"), order("bad", "pending", "not-a-date")],
      drafts: [{ id: "d1", kind: "rx", name: "Smith Rx", status: "draft", updatedAt: "2026-11-05T10:00:00Z" }],
      tickets: [{ id: "t1", ticketNumber: "T-1", title: "Help", closedAt: null, createdAt: "2026-11-03T10:00:00Z" }],
    });
    expect(feed.map((i) => i.id)).toEqual(["draft-rx-d1", "ticket-t1", "order-11111111-aaaa"]);
    expect(feed[0].to).toBe("/profile/rx-drafts/d1");
  });
});
