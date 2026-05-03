# Scripts

## generate_module.py

Scaffolds a new oRPC API module for supastarter Next.js.

### Usage

Run from the **supastarter monorepo root** (where `packages/api` exists):

```bash
python3 scripts/generate_module.py <module-name> [--type public|protected|admin]
```

### Arguments

- **module-name** (positional) — Lowercase, alphanumeric; hyphens allowed (e.g. `feedback`, `audit-log`, `user-settings`).
- **--type** — Procedure type. One of:
    - `public` (default) — no auth, no `context.user`
    - `protected` — requires session; `context.user` available
    - `admin` — requires session AND `user.role === "admin"`

### What it creates

Under `packages/api/modules/<name>/`:

- **types.ts** — Zod schema stub and inferred type.
- **procedures/create.ts** — Stub procedure of the chosen type (POST). Implement the handler and wire it to a `@repo/database` helper.
- **router.ts** — Router object exporting `create`.

The generated procedure throws `NOT_IMPLEMENTED` until you replace the body.

### After running

1. Implement the create handler in `procedures/create.ts` (call into `@repo/database` queries).
2. Mount the router in `packages/api/orpc/router.ts`:

    ```ts
    import { <camelName>Router } from "../modules/<name>/router";
    // Inside the router object: <camelName>: <camelName>Router,
    ```

    The script prints the exact import line for you. `<camelName>` is `feedbackRouter`, `auditLogRouter`, etc.

3. Add list/get/update/delete procedures as additional files under `procedures/` and add them to the router object.

### Examples

```bash
# Public — anyone can call
python3 scripts/generate_module.py feedback

# Protected — must be logged in
python3 scripts/generate_module.py feedback --type protected

# Admin only
python3 scripts/generate_module.py audit-log --type admin
```

See [assets/recipes/feedback-widget.md](../assets/recipes/feedback-widget.md) for a full feature implementation that builds on the scaffolded module.
