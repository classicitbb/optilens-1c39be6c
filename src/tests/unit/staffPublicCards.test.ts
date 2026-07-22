import { describe, expect, it } from "vitest";
import {
  buildPublicCardVCard,
  isStaffRole,
  slugifyPublicCard,
  whatsappUrl,
  type StaffPublicCard,
} from "@/features/staff-cards/staffPublicCards";

const card: StaffPublicCard = {
  user_id: "8ea55656-2023-4a2d-8ec4-08a5fc78a755",
  slug: "russell-hunte",
  display_name: "Russell Hunte",
  title: "Sales, Partnerships",
  organization_name: "Classic Visions",
  bio: "Optical partnerships; Caribbean support.",
  skills: ["Optical dispensing"],
  email: "russell@example.com",
  phone: "+1 246 555 0100",
  whatsapp_phone: "+1 (246) 555-0100",
  linkedin_url: "https://linkedin.example/russell",
  website_url: null,
  avatar_url: null,
  is_published: true,
};

describe("staff public cards", () => {
  it("creates a stable URL slug", () => {
    expect(slugifyPublicCard("  Rússel Hunte!  ")).toBe("russel-hunte");
  });

  it("only treats internal roles as staff", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("operator")).toBe(true);
    expect(isStaffRole("viewer")).toBe(true);
    expect(isStaffRole("customer")).toBe(false);
  });

  it("generates a contact-safe vCard", () => {
    const value = buildPublicCardVCard(card, "https://www.classicvisions.net/connect/russell-hunte");
    expect(value).toContain("BEGIN:VCARD");
    expect(value).toContain("FN:Russell Hunte");
    expect(value).toContain("TITLE:Sales\\, Partnerships");
    expect(value).toContain("END:VCARD");
  });

  it("normalizes a WhatsApp number for wa.me", () => {
    expect(whatsappUrl("+1 (246) 555-0100")).toBe("https://wa.me/12465550100");
  });
});
