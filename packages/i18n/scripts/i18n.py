#!/usr/bin/env python3
"""
i18n CRUD tool — точная работа с JSON-файлами перевода AACsearch.

Использование:
  python3 packages/i18n/scripts/i18n.py <cmd> <scope> <key> [args...]

Команды:
  get   <scope> <key>                         — значения во всех 5 локалях
  set   <scope> <key> <en> <de> <es> <fr> <ru> — установить во всех локалях
  del   <scope> <key>                         — удалить из всех локалей
  ls    <scope> [prefix]                      — список ключей (опционально: с префиксом)
  check <scope> [prefix]                      — найти отсутствующие ключи
  cp    <src_scope> <src_key> <dst_scope> <dst_key> — скопировать между scope/ключами
  mv    <scope> <old_key> <new_key>           — переименовать ключ

Scopes: saas | marketing | shared | mail
Locales: en de es fr ru (всегда в этом порядке)
"""

import json
import sys
import os
from pathlib import Path

LOCALES = ["en", "de", "es", "fr", "ru"]
SCOPES = ["saas", "marketing", "shared", "mail"]

# Split file lists
SAAS_FILES = ["search", "settings", "admin", "organizations", "auth", "onboarding", "product", "common"]
MARKETING_FILES = ["core", "compare", "features", "integrations", "solutions"]

# Map top-level key → split file name for saas
_SAAS_KEY_GROUPS: dict[str, list[str]] = {
    "search": ["search"],
    "settings": ["settings"],
    "admin": ["admin"],
    "organizations": ["organizations"],
    "auth": ["auth"],
    "onboarding": ["onboarding", "choosePlan", "checkoutReturn", "start"],
    "product": ["indexing", "mySearch", "widget", "sdks", "analytics", "feedback", "referral", "pricing"],
    "common": ["app", "common", "nav", "notFound", "documentation"],
}
SAAS_KEY_FILE: dict[str, str] = {}
for _fname, _keys in _SAAS_KEY_GROUPS.items():
    for _k in _keys:
        SAAS_KEY_FILE[_k] = _fname


def _marketing_key_to_file(top_key: str) -> str:
    if "compare" in top_key or "vsAlgolia" in top_key:
        return "compare"
    if top_key.startswith("features"):
        return "features"
    if top_key.startswith("integrations"):
        return "integrations"
    if top_key.startswith("solutions") or top_key.startswith("useCases"):
        return "solutions"
    return "core"


def find_root() -> Path:
    """Find project root by locating packages/i18n."""
    here = Path(__file__).resolve().parent
    for candidate in [here.parent.parent.parent, here.parent.parent, here.parent]:
        if (candidate / "packages" / "i18n" / "translations").exists():
            return candidate
    cwd = Path(os.getcwd())
    if (cwd / "packages" / "i18n" / "translations").exists():
        return cwd
    raise RuntimeError("Cannot find project root (no packages/i18n/translations)")

ROOT = find_root()
TRANSLATIONS = ROOT / "packages" / "i18n" / "translations"


# ── JSON helpers ─────────────────────────────────────────────────────────────

def load(locale: str, scope: str) -> dict:
    if scope == "saas":
        merged: dict = {}
        for fname in SAAS_FILES:
            path = TRANSLATIONS / locale / "saas" / f"{fname}.json"
            with open(path, encoding="utf-8") as f:
                merged.update(json.load(f))
        return merged
    if scope == "marketing":
        merged = {}
        for fname in MARKETING_FILES:
            path = TRANSLATIONS / locale / "marketing" / f"{fname}.json"
            with open(path, encoding="utf-8") as f:
                merged.update(json.load(f))
        return merged
    path = TRANSLATIONS / locale / f"{scope}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(data: dict, locale: str, scope: str) -> None:
    if scope == "saas":
        file_data: dict[str, dict] = {fname: {} for fname in SAAS_FILES}
        for top_key, val in data.items():
            fname = SAAS_KEY_FILE.get(top_key, "common")
            file_data[fname][top_key] = val
        for fname, chunk in file_data.items():
            path = TRANSLATIONS / locale / "saas" / f"{fname}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)
                f.write("\n")
        return
    if scope == "marketing":
        file_data = {fname: {} for fname in MARKETING_FILES}
        for top_key, val in data.items():
            fname = _marketing_key_to_file(top_key)
            file_data[fname][top_key] = val
        for fname, chunk in file_data.items():
            path = TRANSLATIONS / locale / "marketing" / f"{fname}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)
                f.write("\n")
        return
    path = TRANSLATIONS / locale / f"{scope}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent="\t")
        f.write("\n")


def get_nested(obj: dict, key: str):
    """Get value by dot-path, returns None if missing."""
    cur = obj
    for part in key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur

def set_nested(obj: dict, key: str, value) -> None:
    """Set value by dot-path, creating intermediate dicts as needed."""
    parts = key.split(".")
    cur = obj
    for part in parts[:-1]:
        if part not in cur or not isinstance(cur[part], dict):
            cur[part] = {}
        cur = cur[part]
    cur[parts[-1]] = value

def del_nested(obj: dict, key: str) -> bool:
    """Delete key by dot-path. Returns True if deleted."""
    parts = key.split(".")
    cur = obj
    for part in parts[:-1]:
        if not isinstance(cur, dict) or part not in cur:
            return False
        cur = cur[part]
    if parts[-1] in cur:
        del cur[parts[-1]]
        return True
    return False

def list_keys(obj: dict, prefix: str = "") -> list[str]:
    """Recursively collect all leaf key paths."""
    result = []
    for k, v in obj.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            result.extend(list_keys(v, full))
        else:
            result.append(full)
    return result


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_get(scope: str, key: str) -> None:
    print(f"  key: {scope}.{key}\n")
    found = False
    for locale in LOCALES:
        data = load(locale, scope)
        val = get_nested(data, key)
        flag = "✓" if val is not None else "✗"
        display = repr(val) if val is not None else "(missing)"
        print(f"  {flag} {locale:4}  {display}")
        if val is not None:
            found = True
    if not found:
        print("\n  [key not found in any locale]")


def cmd_set(scope: str, key: str, values: list[str]) -> None:
    if len(values) != 5:
        die(f"set requires exactly 5 values (en de es fr ru), got {len(values)}")
    for locale, val in zip(LOCALES, values):
        data = load(locale, scope)
        set_nested(data, key, val)
        save(data, locale, scope)
        print(f"  ✓ {locale:4}  {repr(val)}")
    print(f"\n  Saved {scope}.{key} in all 5 locales.")


def cmd_del(scope: str, key: str) -> None:
    for locale in LOCALES:
        data = load(locale, scope)
        deleted = del_nested(data, key)
        if deleted:
            save(data, locale, scope)
            print(f"  ✓ {locale:4}  deleted")
        else:
            print(f"  - {locale:4}  (not found)")
    print(f"\n  Done: {scope}.{key} removed.")


def cmd_ls(scope: str, prefix: str = "") -> None:
    data = load("en", scope)
    if prefix:
        sub = get_nested(data, prefix)
        if sub is None:
            die(f"Prefix '{prefix}' not found in {scope}/en")
        if not isinstance(sub, dict):
            print(f"  {prefix} = {repr(sub)}")
            return
        keys = list_keys(sub, prefix)
    else:
        keys = list_keys(data)
    for k in sorted(keys):
        print(f"  {k}")
    print(f"\n  {len(keys)} keys in {scope}/en" + (f" under '{prefix}'" if prefix else ""))


def cmd_check(scope: str, prefix: str = "") -> None:
    en_data = load("en", scope)
    if prefix:
        sub = get_nested(en_data, prefix)
        if sub is None:
            die(f"Prefix '{prefix}' not found in {scope}/en")
        all_keys = list_keys(sub, prefix) if isinstance(sub, dict) else [prefix]
    else:
        all_keys = list_keys(en_data)

    issues: dict[str, list[str]] = {}
    for locale in LOCALES[1:]:
        data = load(locale, scope)
        for k in all_keys:
            if get_nested(data, k) is None:
                issues.setdefault(k, []).append(locale)

    if not issues:
        n = len(all_keys)
        print(f"  ✓ All {n} keys present in all 5 locales." + (f" (prefix: {prefix})" if prefix else ""))
        return

    print(f"  Missing keys ({len(issues)} total):\n")
    for k, locales in sorted(issues.items()):
        print(f"  ✗ {k}")
        print(f"      missing in: {', '.join(locales)}")
    print(f"\n  Run: python3 packages/i18n/scripts/i18n.py set {scope} <key> <en> <de> <es> <fr> <ru>")


def cmd_cp(src_scope: str, src_key: str, dst_scope: str, dst_key: str) -> None:
    for locale in LOCALES:
        src_data = load(locale, src_scope)
        val = get_nested(src_data, src_key)
        if val is None:
            print(f"  - {locale:4}  src missing, skipped")
            continue
        dst_data = load(locale, dst_scope)
        set_nested(dst_data, dst_key, val)
        save(dst_data, locale, dst_scope)
        print(f"  ✓ {locale:4}  {src_scope}.{src_key} → {dst_scope}.{dst_key}")


def cmd_mv(scope: str, old_key: str, new_key: str) -> None:
    print(f"  Moving {scope}.{old_key} → {scope}.{new_key}\n")
    for locale in LOCALES:
        data = load(locale, scope)
        val = get_nested(data, old_key)
        if val is None:
            print(f"  - {locale:4}  src missing, skipped")
            continue
        set_nested(data, new_key, val)
        del_nested(data, old_key)
        save(data, locale, scope)
        print(f"  ✓ {locale:4}")
    print(f"\n  Done.")


# ── Entry point ───────────────────────────────────────────────────────────────

def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)

def validate_scope(scope: str) -> None:
    if scope not in SCOPES:
        die(f"Unknown scope '{scope}'. Must be one of: {', '.join(SCOPES)}")

def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__)
        return

    cmd = args[0]

    if cmd == "get":
        if len(args) < 3:
            die("Usage: get <scope> <key>")
        validate_scope(args[1])
        cmd_get(args[1], args[2])

    elif cmd in ("set", "add"):
        if len(args) < 8:
            die("Usage: set <scope> <key> <en> <de> <es> <fr> <ru>")
        validate_scope(args[1])
        cmd_set(args[1], args[2], args[3:8])

    elif cmd in ("del", "delete", "rm"):
        if len(args) < 3:
            die("Usage: del <scope> <key>")
        validate_scope(args[1])
        cmd_del(args[1], args[2])

    elif cmd in ("ls", "list"):
        if len(args) < 2:
            die("Usage: ls <scope> [prefix]")
        validate_scope(args[1])
        cmd_ls(args[1], args[2] if len(args) > 2 else "")

    elif cmd == "check":
        if len(args) < 2:
            die("Usage: check <scope> [prefix]")
        validate_scope(args[1])
        cmd_check(args[1], args[2] if len(args) > 2 else "")

    elif cmd == "cp":
        if len(args) < 5:
            die("Usage: cp <src_scope> <src_key> <dst_scope> <dst_key>")
        validate_scope(args[1]); validate_scope(args[3])
        cmd_cp(args[1], args[2], args[3], args[4])

    elif cmd == "mv":
        if len(args) < 4:
            die("Usage: mv <scope> <old_key> <new_key>")
        validate_scope(args[1])
        cmd_mv(args[1], args[2], args[3])

    else:
        die(f"Unknown command '{cmd}'. Run with --help for usage.")

if __name__ == "__main__":
    main()
