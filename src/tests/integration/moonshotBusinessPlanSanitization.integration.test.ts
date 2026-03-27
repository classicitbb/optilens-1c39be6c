import { beforeEach, describe, expect, it } from "vitest";

import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

describe("moonshot business plan sanitization", () => {
  beforeEach(() => {
    localStorage.clear();
    useMoonshotStore.getState().resetDemoData();
  });

  it("sanitizes rich notes before persisting state", () => {
    useMoonshotStore.getState().updateBusinessPlan({
      futureFocus: {
        ...useMoonshotStore.getState().businessPlan.futureFocus,
        richNotes:
          '<p onclick="alert(1)">safe</p><script>alert(2)</script><a href="javascript:alert(3)">link</a><a href="https://safe.example">ok</a>',
      },
    });

    expect(useMoonshotStore.getState().businessPlan.futureFocus.richNotes).toBe(
      '<p>safe</p><a>link</a><a href="https://safe.example">ok</a>',
    );
  });
});
