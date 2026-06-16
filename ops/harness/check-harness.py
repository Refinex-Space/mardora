#!/usr/bin/env python3
"""Validate the Markora Harness control plane."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REQUIRED_FRONTMATTER_KEYS = {"owner", "updated", "status", "referenced_by"}
REQUIRED_DOC_DIRS = ["architecture", "config", "standards", "domain", "guides"]
DOC_REF_RE = re.compile(r"(?:`|\()((?:\./)?docs/[A-Za-z0-9_./-]+\.md)(?:`|\))")
LOWER_KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
ADR_RE = re.compile(r"^[0-9]{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def has_frontmatter(text: str) -> tuple[bool, set[str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return False, set()
    for index in range(1, min(len(lines), 40)):
        if lines[index].strip() == "---":
            keys: set[str] = set()
            for line in lines[1:index]:
                match = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):", line)
                if match:
                    keys.add(match.group(1))
            return True, keys
    return False, set()


def extract_doc_refs(text: str) -> set[str]:
    refs: set[str] = set()
    for match in DOC_REF_RE.finditer(text):
        ref = match.group(1)
        refs.add(ref[2:] if ref.startswith("./") else ref)
    return refs


def is_valid_doc_name(path: Path, root: Path) -> bool:
    if path.name == "README.md":
        return True
    if path.parent.name == "decisions":
        return bool(ADR_RE.match(path.name))
    return bool(LOWER_KEBAB_RE.match(path.name))


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    errors: list[str] = []

    agents = root / "AGENTS.md"
    if not agents.exists():
        errors.append("AGENTS.md is missing")
        agents_text = ""
    else:
        agents_text = read_text(agents)
        if len(agents_text.splitlines()) > 150:
            errors.append("AGENTS.md must stay at or below 150 lines")
        lowered = agents_text.lower()
        if "definition of done" not in lowered and "完成" not in agents_text:
            errors.append("AGENTS.md is missing Definition of Done")
        if "knowledge map" not in lowered and "知识地图" not in agents_text:
            errors.append("AGENTS.md is missing Knowledge Map")

    claude = root / "CLAUDE.md"
    if not claude.exists() or read_text(claude).strip() != "@AGENTS.md":
        errors.append("CLAUDE.md must be a thin @AGENTS.md bridge")

    docs_dir = root / "docs"
    if not docs_dir.exists():
        errors.append("docs directory is missing")
        docs_files: list[Path] = []
    else:
        for dirname in REQUIRED_DOC_DIRS:
            if not (docs_dir / dirname).exists():
                errors.append(f"docs/{dirname} directory is missing")
        docs_files = sorted(path for path in docs_dir.rglob("*.md") if path.is_file())

    reference_sources = [agents]
    if docs_dir.exists() and (docs_dir / "README.md").exists():
        reference_sources.append(docs_dir / "README.md")
    reference_sources.extend(root.rglob("SKILL.md"))

    refs: set[str] = set()
    for source in reference_sources:
        if not source.exists():
            continue
        if any(part in {".git", "node_modules", "dist", "build", ".next"} for part in source.parts):
            continue
        refs.update(extract_doc_refs(read_text(source)))

    for ref in sorted(refs):
        if not (root / ref).exists():
            errors.append(f"referenced docs path does not exist: {ref}")

    for doc in docs_files:
        doc_rel = rel(doc, root)
        if not is_valid_doc_name(doc, root):
            errors.append(f"invalid docs filename: {doc_rel}")

        ok, keys = has_frontmatter(read_text(doc))
        if not ok:
            errors.append(f"missing YAML front matter: {doc_rel}")
        else:
            missing = REQUIRED_FRONTMATTER_KEYS - keys
            if missing:
                errors.append(f"front matter missing {', '.join(sorted(missing))}: {doc_rel}")

        if doc_rel != "docs/README.md" and doc_rel not in refs:
            errors.append(f"orphan docs file: {doc_rel}")

    if errors:
        print(f"Harness check failed: {len(errors)} issue(s)")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Harness check passed: {len(docs_files)} docs file(s), {len(refs)} docs reference(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
