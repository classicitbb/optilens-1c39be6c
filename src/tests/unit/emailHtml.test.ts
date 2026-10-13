import { describe, expect, it } from "vitest";
import { buildOutgoingEmail, editorHtmlForEmail, htmlToPlainText, sanitizeEmailHtml, textToHtml } from "@/features/admin/email/emailHtml";
import { quoteForReply, quoteHtmlForReply } from "@/features/admin/email/format";

describe("email HTML", () => {
  it("strips scripts, handlers and unsafe URLs but keeps tables, images and inline styles", () => {
    const clean = sanitizeEmailHtml(
      `<table style="color:#123"><tr><td><img src="https://cv.bb/logo.png" onerror="alert(1)" alt="CV"></td></tr></table>` +
        `<a href="javascript:alert(1)">x</a><a href="https://cv.bb">site</a><script>alert(1)</script><p style="background:url(javascript:x)">p</p>`,
    );
    expect(clean).toContain(`<table style="color:#123">`);
    expect(clean).toContain(`<img src="https://cv.bb/logo.png" alt="CV">`);
    expect(clean).not.toMatch(/onerror|javascript:|<script/i);
    expect(clean).toContain(`<a href="https://cv.bb">site</a>`);
    expect(clean).toContain("<p>p</p>");
  });

  it("turns HTML into readable plain text", () => {
    const text = htmlToPlainText(
      `<p>Hi <strong>Ann</strong>,</p><p></p><ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li>first</li></ol>` +
        `<p>See <a href="https://cv.bb/store">the store</a></p><blockquote><p>old</p></blockquote>`,
    );
    expect(text).toBe("Hi Ann,\n\n- one\n- two\n\n1. first\n\nSee the store (https://cv.bb/store)\n> old");
  });

  it("styles paragraphs for mail clients and keeps empty lines visible", () => {
    expect(editorHtmlForEmail("<p>a</p><p></p><p>b</p>")).toBe(`<p style="margin:0">a</p><p style="margin:0"><br></p><p style="margin:0">b</p>`);
    expect(textToHtml("a <b>\n\nc")).toBe("<p>a &lt;b&gt;</p><p></p><p>c</p>");
  });

  it("assembles body, signature and quoted reply into both parts", () => {
    const { html, text } = buildOutgoingEmail({
      bodyHtml: "<p>Thanks!</p>",
      signatureHtml: "<p><b>Russell</b><script>x</script></p>",
      quoted: "\n\nOn Oct 13, Lily wrote:\n> Hello\n> there",
    });
    expect(html).toContain(`<p style="margin:0">Thanks!</p>`);
    expect(html).toContain("<b>Russell</b>");
    expect(html).not.toContain("<script");
    expect(html).toContain("On Oct 13, Lily wrote:<blockquote");
    expect(html).toContain("Hello<br>there</blockquote>");
    expect(text).toBe("Thanks!\n\nRussell\n\nOn Oct 13, Lily wrote:\n> Hello\n> there");
  });

  it("keeps the original HTML conversation in a reply and makes a plain-text alternative", () => {
    const original = {
      from_name: "Pat",
      from_address: "pat@example.com",
      sent_at: "2026-10-13T12:00:00Z",
      subject: "Earlier thread",
      body_text: "Current note",
      body_html: `<p style="color:#123456">Current note</p><blockquote><p><strong>Earlier note</strong></p></blockquote><script>alert(1)</script>`,
    };
    const quoted = quoteForReply(original);
    const quotedHtml = quoteHtmlForReply(original);
    const { html, text } = buildOutgoingEmail({ bodyHtml: "<p>My response</p>", quoted, quotedHtml });
    expect(html).toContain(`<p style="color:#123456">Current note</p>`);
    expect(html).toContain("<strong>Earlier note</strong>");
    expect(html).not.toContain("<script");
    expect(text).toContain("My response");
    expect(text).toContain("Current note");
    expect(text).toContain("Earlier note");
  });
});
