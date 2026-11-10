import { describe, expect, it } from "vitest";
import { contactHasPhone, parseRecordingName, phonesMatch, toDialDigits } from "../../../supabase/functions/_shared/pbx/calls";

describe("toDialDigits", () => {
  it("dials Barbados numbers as 7 digits, the form the PBX's local routes match", () => {
    expect(toDialDigits("434-5678")).toBe("4345678");
    expect(toDialDigits("(246) 434 5678")).toBe("4345678");
    expect(toDialDigits("+1 246 434 5678")).toBe("4345678");
  });
  it("dials other North American numbers as 1 + 10 digits", () => {
    expect(toDialDigits("(305) 555 0100")).toBe("13055550100");
    expect(toDialDigits("+1 305 555 0100")).toBe("13055550100");
  });
  it("does not dial numbers the PBX has no outbound route for", () => {
    expect(toDialDigits("+44 20 7946 0958")).toBeNull();
  });
  it("rejects numbers that cannot be dialled", () => {
    expect(toDialDigits("12345")).toBeNull();
    expect(toDialDigits("")).toBeNull();
    expect(toDialDigits(null)).toBeNull();
  });
});

describe("phonesMatch / contactHasPhone", () => {
  it("matches a local number to its full form", () => {
    expect(phonesMatch("434-5678", "+1 (246) 434-5678")).toBe(true);
  });
  it("does not match different numbers with the same area code", () => {
    expect(phonesMatch("(246) 434-5678", "(246) 435-5678")).toBe(false);
  });
  it("does not match numbers shorter than seven digits", () => {
    expect(phonesMatch("5678", "5678")).toBe(false);
  });
  it("finds a number inside a multi-number phone field", () => {
    expect(contactHasPhone("246-111-2222; 246-434-5678", "12464345678")).toBe(true);
    expect(contactHasPhone("246-111-2222", "12464345678")).toBe(false);
  });
});

describe("parseRecordingName", () => {
  it("reads an outbound recording", () => {
    expect(parseRecordingName("out-12464345678-2001-20261024-101500-1761300900.12.wav")).toEqual({
      direction: "outbound", extension: "2001", remoteNumber: "12464345678",
    });
  });
  it("reads an inbound recording", () => {
    expect(parseRecordingName("/var/spool/asterisk/monitor/2026/10/24/in-2465551000-2464345678-20261024-101500-1761300900.13.wav")).toEqual({
      direction: "inbound", extension: null, remoteNumber: "2464345678",
    });
  });
  it("keeps unrecognised names as unknown instead of guessing", () => {
    expect(parseRecordingName("callrecording.wav")).toEqual({ direction: "unknown", extension: null, remoteNumber: null });
    expect(parseRecordingName("exten-2001-2002-20261024-101500-1761300900.14.wav").direction).toBe("unknown");
  });
});
