/** Lockfile classification only: optional packages are not proof of deployed use. */
export function deriveDependencyScope(nodes, packages) {
  const scopes = new Set(nodes.map((node) => {
    const meta = packages?.[node];
    if (!meta) return "unknown";
    if (meta.devOptional) return "optional-or-dev";
    if (meta.dev) return "dev-only";
    if (meta.optional) return "optional-runtime";
    return "runtime";
  }));
  return scopes.size ? [...scopes].sort().join(",") : "unknown";
}
