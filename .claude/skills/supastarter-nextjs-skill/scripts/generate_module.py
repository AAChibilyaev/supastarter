#!/usr/bin/env python3
"""
Scaffold a new oRPC API module for supastarter Next.js.

Creates packages/api/modules/<name>/ with:
  - types.ts (zod schema stub)
  - procedures/create.ts (procedure stub of the chosen type)
  - router.ts (router object)

Usage (run from supastarter monorepo root):
  python3 scripts/generate_module.py <module-name> [--type public|protected|admin]

Examples:
  python3 scripts/generate_module.py feedback                   # public (default)
  python3 scripts/generate_module.py feedback --type protected  # requires session
  python3 scripts/generate_module.py audit-log --type admin     # admin only

After running, mount the new router in packages/api/orpc/router.ts:
  import { <camelName>Router } from "../modules/<name>/router";
  // In router object: <camelName>: <camelName>Router
"""

import argparse
import sys
from pathlib import Path


def kebab_to_camel(s: str) -> str:
    parts = s.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def kebab_to_pascal(s: str) -> str:
    return "".join(word.capitalize() for word in s.split("-"))


PROCEDURE_TYPES = {
    "public": {
        "import": "publicProcedure",
        "comment": "// publicProcedure: no auth required",
        "user_id_line": '\t\t// context.user is NOT available on publicProcedure',
    },
    "protected": {
        "import": "protectedProcedure",
        "comment": "// protectedProcedure: requires authenticated session — context.user is available",
        "user_id_line": "\t\tconst userId = context.user.id;",
    },
    "admin": {
        "import": "adminProcedure",
        "comment": "// adminProcedure: requires authenticated session AND user.role === 'admin'",
        "user_id_line": "\t\tconst userId = context.user.id;",
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold a new oRPC API module")
    parser.add_argument("name", help="Module name in kebab-case (e.g. feedback, audit-log)")
    parser.add_argument(
        "--type",
        choices=list(PROCEDURE_TYPES.keys()),
        default="public",
        help="Procedure type (default: public)",
    )
    args = parser.parse_args()

    name = args.name.strip().lower().replace(" ", "-")
    if not name or not name.replace("-", "").isalnum():
        print("Error: module name must be alphanumeric (hyphens allowed)", file=sys.stderr)
        return 1

    api_root = Path("packages/api")
    if not api_root.is_dir():
        print(
            "Error: packages/api not found. Run from supastarter monorepo root.",
            file=sys.stderr,
        )
        return 1

    module_dir = api_root / "modules" / name
    if module_dir.exists():
        print(f"Error: {module_dir} already exists", file=sys.stderr)
        return 1

    procedures_dir = module_dir / "procedures"
    procedures_dir.mkdir(parents=True, exist_ok=True)

    pascal = kebab_to_pascal(name)
    camel = kebab_to_camel(name)
    proc_type = PROCEDURE_TYPES[args.type]

    types_content = f"""import {{ z }} from "zod";

export const create{pascal}Schema = z.object({{
\t// TODO: define input shape
\t// e.g.: name: z.string().min(1).max(200),
}});

export type Create{pascal}Values = z.infer<typeof create{pascal}Schema>;
"""

    create_content = f"""import {{ ORPCError }} from "@orpc/server";
import {{ z }} from "zod";
import {{ {proc_type["import"]} }} from "../../../orpc/procedures";
import {{ create{pascal}Schema }} from "../types";

{proc_type["comment"]}
export const create{pascal}Procedure = {proc_type["import"]}
\t.route({{
\t\tmethod: "POST",
\t\tpath: "/{name}",
\t\ttags: ["{pascal}"],
\t\tsummary: "Create {name}",
\t\tdescription: "Create a new {name} record",
\t}})
\t.input(create{pascal}Schema)
\t.output(
\t\tz.object({{
\t\t\tid: z.string(),
\t\t}}),
\t)
\t.handler(async ({{ input, context }}) => {{
{proc_type["user_id_line"]}
\t\t// TODO: call your @repo/database helper, e.g.:
\t\t//   const row = await create{pascal}({{ ...input, userId }});
\t\t//   return {{ id: row.id }};
\t\tthrow new ORPCError("NOT_IMPLEMENTED", {{ message: "Implement create handler" }});
\t}});
"""

    router_content = f"""import {{ create{pascal}Procedure }} from "./procedures/create";

export const {camel}Router = {{
\tcreate: create{pascal}Procedure,
}};
"""

    (module_dir / "types.ts").write_text(types_content, encoding="utf-8")
    (module_dir / "procedures" / "create.ts").write_text(create_content, encoding="utf-8")
    (module_dir / "router.ts").write_text(router_content, encoding="utf-8")

    print(f"✓ Created {module_dir}")
    print(f"  Type: {args.type}Procedure")
    print()
    print("Next: mount the router in packages/api/orpc/router.ts:")
    print(f'  import {{ {camel}Router }} from "../modules/{name}/router";')
    print(f"  // Inside the router object: {camel}: {camel}Router,")
    return 0


if __name__ == "__main__":
    sys.exit(main())
