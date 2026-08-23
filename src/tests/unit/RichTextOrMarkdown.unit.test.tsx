import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RichTextOrMarkdown from "@/components/content/RichTextOrMarkdown";

describe("RichTextOrMarkdown", () => {
  it("renders CMS HTML as rich text", () => {
    const { container } = render(
      <RichTextOrMarkdown content="<h1><strong>Privacy Policy</strong></h1><p>Last updated</p>" />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy").tagName).toBe("STRONG");
    expect(container).not.toHaveTextContent("<h1>");
  });

  it("renders legacy Markdown fallbacks", () => {
    render(<RichTextOrMarkdown content={"## Information We Collect\n\n- Contact details"} />);

    expect(screen.getByRole("heading", { level: 2, name: "Information We Collect" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Contact details");
  });

  it("sanitizes stored HTML before rendering", () => {
    const { container } = render(
      <RichTextOrMarkdown content={'<p onclick="alert(1)">Safe</p><script>alert("xss")</script>'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Safe")).not.toHaveAttribute("onclick");
  });
});
