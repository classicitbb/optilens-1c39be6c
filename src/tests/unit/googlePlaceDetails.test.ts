import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPlaceDetails, findPlaceForContact } from "../../../supabase/functions/_shared/enrichment/googlePlaceDetails";
import { researchProvider } from "../../../supabase/functions/_shared/enrichment/combinedResearch";

afterEach(() => vi.restoreAllMocks());
describe("Places API (New) contact lookups", () => {
  it("uses POST, header credentials and a narrow field mask; scores business name separately from location", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ places: [
      { id: "specs-id", displayName: { text: "Specs Optical" }, formattedAddress: "Cheapside, Bridgetown, Barbados" },
    ] })));
    expect(await findPlaceForContact("test-key", "Specs Optical Inc Bridgetown Barbados", "Specs Optical Inc")).toMatchObject({ kind: "match", placeId: "specs-id", similarity: 1 });
    expect(request.mock.calls[0][0]).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { "X-Goog-Api-Key": "test-key", "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress" } });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ textQuery: "Specs Optical Inc Bridgetown Barbados", pageSize: 5 });
  });
  it("preserves no-match and ambiguity instead of selecting a convenient match", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ places: [
        { id: "one", displayName: { text: "Specs Optical" } }, { id: "two", displayName: { text: "Specs Optical Inc" } },
      ] })));
    expect(await findPlaceForContact("key", "Specs Optical")).toMatchObject({ kind: "no_match" });
    expect(await findPlaceForContact("key", "Specs Optical")).toMatchObject({ kind: "ambiguous" });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("reports permission failures without exposing provider bodies or credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private response", { status: 403 }));
    await expect(findPlaceForContact("key", "Specs")).rejects.toThrow("HTTP_403");
    await expect(fetchPlaceDetails("key", "id")).rejects.toThrow("Places API (New)");
  });
  it("maps New API details to the established contact field policy", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: "id", displayName: { text: "Specs Optical" }, internationalPhoneNumber: "+1 246 426 7030",
      websiteUri: "https://example.com", formattedAddress: "Cheapside, Bridgetown", googleMapsUri: "https://maps.google.com/?cid=1",
      addressComponents: [{ longText: "Cheapside", types: ["route"] }, { longText: "Bridgetown", types: ["locality"] },
        { longText: "Saint Michael", types: ["administrative_area_level_1"] }, { longText: "Barbados", shortText: "BB", types: ["country"] }],
      rating: 4, userRatingCount: 12,
    })));
    expect(await fetchPlaceDetails("key", "id")).toMatchObject({ name: "Specs Optical", phone: "+1 246 426 7030", street: "Cheapside", city: "Bridgetown", state: "Saint Michael", countryCode: "BB", reviewsCount: 12, website: "https://example.com" });
    expect(request.mock.calls[0][0]).toBe("https://places.googleapis.com/v1/places/id");
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("returns Places evidence in the combined research source contract without writes", async () => {
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ places: [{ id: "id", displayName: { text: "Specs Optical" } }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "id", displayName: { text: "Specs Optical" }, formattedAddress: "Cheapside" })));
    expect(await researchProvider("google_places", "key", "Specs Optical Barbados", "Specs Optical", "unused"))
      .toEqual([{ title: "Google Places: Specs Optical", url: "https://www.google.com/maps/place/?q=place_id:id", snippet: "Cheapside", emails: [] }]);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
