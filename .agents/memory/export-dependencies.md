---
name: Export dependency ownership
description: Why export and storage libraries require runtime checks beyond TypeScript and successful bundling.
---

Preserve the package's own runtime resolution context for export libraries that load fonts, templates or companion resources relative to their installed location. Avoid assuming a successful bundle means those resources are reachable.

**Why:** Report generation can typecheck and bundle successfully yet fail at runtime because font files or transitive helpers resolve relative to the application bundle rather than their owning package. Blanket externalization of a transitive helper also requires that helper to be directly resolvable by the application, which a pnpm workspace does not guarantee.

**How to apply:** After changing export or storage dependencies or bundling configuration, verify application startup and actual export generation. Test a private-storage round trip for saved report bytes. Resolve runtime ownership at the library boundary rather than adding unrelated direct dependencies just to satisfy a misplaced import.
