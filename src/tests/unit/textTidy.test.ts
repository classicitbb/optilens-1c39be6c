import { describe, expect, it } from "vitest";
import { tidyText } from "@/lib/textTidy";

const tidy = (text: string) => tidyText(text, "sentence").text;
const tidyTitle = (text: string) => tidyText(text, "title").text;

describe("tidyText (sentence)", () => {
  it("capitalises sentence starts, fixes spacing and adds a closing full stop", () => {
    expect(tidy("hi john ,thanks for your order.We will ship it today")).toBe(
      "Hi john, thanks for your order. We will ship it today.",
    );
  });

  it("fixes lowercase I, missing apostrophes and doubled words", () => {
    expect(tidy("i dont think the the lens is ready and i'll check")).toBe(
      "I don't think the lens is ready and I'll check.",
    );
  });

  it("capitalises each line and list item without touching markers", () => {
    expect(tidy("thanks for waiting\n- first item\n- second item\n1. numbered point")).toBe(
      "Thanks for waiting\n- First item\n- Second item\n1. Numbered point",
    );
  });

  it("leaves Rx powers, SKUs, ticket numbers, prices and links exactly as typed", () => {
    const text = "order sku ab-1234 is -2.25 -0.50 x 180 for $45.50, see https://acme.com/x.pdf and ana@acme.com ref #TK-0042";
    expect(tidy(text)).toBe("Order sku ab-1234 is -2.25 -0.50 x 180 for $45.50, see https://acme.com/x.pdf and ana@acme.com ref #TK-0042");
  });

  it("does not capitalise after abbreviations, initials, ellipses or decimals", () => {
    expect(tidy("use hoya e.g. varilux or approx. 5 days. j. smith will call... then we wait")).toBe(
      "Use hoya e.g. varilux or approx. 5 days. J. smith will call... then we wait.",
    );
  });

  it("leaves mixed-case words, ALL CAPS and backticked text alone", () => {
    expect(tidy("iPhone and ERP and `some code` here")).toBe("IPhone and ERP and `some code` here.".replace("IPhone", "iPhone"));
  });

  it("does not add a full stop to short sign-offs, punctuated text, list items or links", () => {
    expect(tidy("Thanks")).toBe("Thanks");
    expect(tidy("Is it ready yet?")).toBe("Is it ready yet?");
    expect(tidy("- an item with several words")).toBe("- An item with several words");
    expect(tidy("The details are at https://acme.com/status")).toBe("The details are at https://acme.com/status");
    expect(tidy("Please use the following\nOD -2.25 -0.50 x 180")).toBe("Please use the following\nOD -2.25 -0.50 x 180");
  });

  it("does not guess at lowercase text glued after a full stop (file.pdf, acme.com)", () => {
    expect(tidy("attached is report.pdf from acme.com")).toBe("Attached is report.pdf from acme.com.");
  });

  it("allows words that are legitimately doubled", () => {
    expect(tidy("He said that that was fine.")).toBe("He said that that was fine.");
  });

  it("is idempotent and reports nothing for clean text", () => {
    const messy = "hi john ,thanks.i dont know if the the order shipped";
    const once = tidyText(messy);
    expect(once.total).toBeGreaterThan(0);
    const twice = tidyText(once.text);
    expect(twice.total).toBe(0);
    expect(twice.text).toBe(once.text);

    const clean = tidyText("Hello Ana, your order has shipped.");
    expect(clean).toEqual({ text: "Hello Ana, your order has shipped.", fixes: [], total: 0 });
  });

  it("names what it fixed", () => {
    const { fixes } = tidyText("hi ,i dont know");
    expect(fixes.map((fix) => fix.label)).toEqual(
      expect.arrayContaining(["Space before punctuation", "Apostrophes", "Lowercase I", "Capitalisation"]),
    );
  });
});

describe("tidyText (title)", () => {
  it("capitalises the first letter, trims, fixes I/apostrophes and drops a trailing full stop", () => {
    expect(tidyTitle("  cant  login to portal.")).toBe("Can't login to portal");
  });

  it("does not add a full stop or rewrite casing elsewhere", () => {
    expect(tidyTitle("Rx order 12345 missing coating")).toBe("Rx order 12345 missing coating");
    expect(tidyTitle("lens for iPhone case")).toBe("Lens for iPhone case");
  });

  it("keeps an ellipsis", () => {
    expect(tidyTitle("Waiting on supplier...")).toBe("Waiting on supplier...");
  });
});
