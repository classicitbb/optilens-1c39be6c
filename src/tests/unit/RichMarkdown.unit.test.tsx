import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RichMarkdown } from "@/components/content/RichMarkdown";

describe("RichMarkdown", () => {
  it("renders a markdown table as an HTML table", () => {
    const content = `| Lens | Index | Best for |
| --- | --- | --- |
| CR-39 | 1.50 | Everyday value |
| Polycarbonate | 1.59 | Impact resistance |`;

    render(<RichMarkdown content={content} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Lens",
      "Index",
      "Best for",
    ]);
    expect(screen.getByRole("cell", { name: "Polycarbonate" })).toBeInTheDocument();
  });

  it("renders fenced code blocks with pre/code markup", () => {
    const content = "```json\n{\"status\": \"ok\"}\n```";

    const { container } = render(<RichMarkdown content={content} />);

    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.querySelector("code")).toHaveTextContent('"status": "ok"');
  });

  it("renders inline code and bold emphasis", () => {
    const content = "Use `auth.uid()` and **save** the record.";

    const { container } = render(<RichMarkdown content={content} />);

    expect(container.querySelector("code")).toHaveTextContent("auth.uid()");
    expect(container.querySelector("strong")).toHaveTextContent("save");
  });

  it("renders ordered and unordered lists", () => {
    const content = "Steps:\n1. First\n2. Second\n\n- Bullet A\n- Bullet B";

    render(<RichMarkdown content={content} />);

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "First",
      "Second",
      "Bullet A",
      "Bullet B",
    ]);
  });

  it("opens links in a new tab safely", () => {
    const content = "[Classic Visions](https://classicvisions.net)";

    render(<RichMarkdown content={content} />);

    const link = screen.getByRole("link", { name: "Classic Visions" });
    expect(link).toHaveAttribute("href", "https://classicvisions.net");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("applies inverted tone styling for user messages", () => {
    const content = "User message";

    const { container } = render(<RichMarkdown content={content} tone="user" />);

    expect(container.firstChild).toHaveClass("text-primary-foreground");
  });
});
