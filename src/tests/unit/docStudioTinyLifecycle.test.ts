/// <reference types="node" />
import { readFileSync } from "node:fs";

import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(
  resolve(process.cwd(), "public/ds/studio-logic.js"),
  "utf8",
);

describe("Doc Studio TinyMCE lifecycle guard", () => {
  it("does not let a stale host marker block a remount", () => {
    expect(studioSource).toContain("TINY_HOSTS = {};");
    expect(studioSource).toContain("TINY_MOUNT_IDS = {};");
    expect(studioSource).toContain(
      "if (node.dataset.tmceMounted === '1' && this.TINY_HOSTS[tab] === node && this.TINY[tab]) return;",
    );
    expect(studioSource).toContain("node.dataset.tmceMounted = '0';");
  });

  it("invalidates pending initialization when a tab or file is destroyed", () => {
    expect(studioSource).toContain(
      "if (self.TINY_MOUNT_IDS[tab] !== mountId || self.TINY_HOSTS[tab] !== node || node.dataset.tmceMounted !== '1')",
    );
    expect(studioSource).toContain(
      "this.TINY_MOUNT_IDS[tab] = (this.TINY_MOUNT_IDS[tab] || 0) + 1;",
    );
    expect(studioSource).toContain(
      "node.querySelectorAll('.tox-tinymce, textarea').forEach(child => child.remove());",
    );
  });

  it("remounts the reused editor host after applying a saved file", () => {
    expect(studioSource).toContain(
      "const host = this.TINY_HOSTS[type]; if (host) this.mountTiny(type, host);",
    );
  });
});
