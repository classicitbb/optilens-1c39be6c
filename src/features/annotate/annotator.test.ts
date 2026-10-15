// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAnnotator, type Annotator } from "./annotator";

describe("createAnnotator", () => {
  let annotator: Annotator;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<section><h2>Prescription</h2><button id="go">Submit</button></section>';
    annotator = createAnnotator();
  });
  afterEach(() => annotator.destroy());

  it("freezes clicks, saves a note and exports markdown", () => {
    let clicked = false;
    document.getElementById("go")!.addEventListener("click", () => { clicked = true; });
    annotator.setActive(true);
    document.getElementById("go")!.click();
    expect(clicked).toBe(false);

    const area = document.querySelector<HTMLTextAreaElement>(".annot-pop textarea")!;
    area.value = "Make it bigger";
    document.querySelector<HTMLButtonElement>(".annot-pop .annot-btn.primary")!.click();

    expect(annotator.count()).toBe(1);
    expect(document.querySelectorAll(".annot-pin")).toHaveLength(1);
    const md = annotator.markdown();
    expect(md).toContain("Make it bigger");
    expect(md).toContain("`#go`");
  });

  it("keeps notes per path and removes its overlay on destroy", () => {
    annotator.setActive(true);
    document.getElementById("go")!.click();
    document.querySelector<HTMLTextAreaElement>(".annot-pop textarea")!.value = "x";
    document.querySelector<HTMLButtonElement>(".annot-pop .annot-btn.primary")!.click();
    annotator.destroy();
    expect(document.querySelector(".annot-layer")).toBeNull();
    expect(localStorage.getItem(`cv.annotate.${location.pathname}`)).toContain('"x"');
  });
});
