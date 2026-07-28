#!/usr/bin/env python3
"""Verify every local reference, anchor, and head requirement across the site.

Run from anywhere:  python3 scripts/check-site.py
Exits non-zero if anything is broken, so CI fails the pull request.

Checks inline style url() and meta content= as well as src/href/poster —
a naive scan of src/href alone misses research-card backgrounds and og:image.
"""
import re, sys, pathlib, urllib.parse
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted(p.name for p in ROOT.glob("*.html"))
BASE = "https://levi.cascadiawildlifelab.org"

errors, warnings = [], []


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []      # (value, description)
        self.ids = []
        self.imgs_no_alt = []
        self.h1 = 0
        self.blank_no_rel = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            self.ids.append(d["id"])
        for key in ("href", "src", "poster"):
            if d.get(key):
                self.refs.append((d[key], f"<{tag} {key}>"))
        if d.get("style"):
            for m in re.findall(r'url\(["\']?([^)"\']+)', d["style"]):
                self.refs.append((m, f"<{tag} style url()>"))
        if tag == "meta" and d.get("content"):
            if d.get("property", "").endswith("image") or d.get("name", "").endswith("image"):
                self.refs.append((d["content"], "<meta image>"))
        if tag == "img" and not d.get("alt", "").strip():
            self.imgs_no_alt.append(d.get("src", "?"))
        if tag == "h1":
            self.h1 += 1
        if tag == "a" and d.get("target") == "_blank" and "noopener" not in d.get("rel", ""):
            self.blank_no_rel.append(d.get("href", "?"))


page_ids = {}
for page in PAGES:
    c = Collector()
    c.feed((ROOT / page).read_text(errors="replace"))
    page_ids[page] = set(c.ids)

for page in PAGES:
    html = (ROOT / page).read_text(errors="replace")
    c = Collector()
    c.feed(html)

    for ref, where in c.refs:
        u = urllib.parse.urlparse(ref)
        if u.scheme in ("http", "https", "mailto", "tel", "data"):
            continue
        if ref.startswith("#"):
            if ref != "#" and ref[1:] not in page_ids[page]:
                errors.append(f'{page}: anchor {ref} has no matching id')
            continue
        if not u.path:
            continue
        path = urllib.parse.unquote(u.path).lstrip("/")
        if not (ROOT / path).exists():
            errors.append(f"{page}: {where} -> {ref}  (file missing)")
            continue
        if u.fragment and path.endswith(".html"):
            if u.fragment not in page_ids.get(pathlib.Path(path).name, set()):
                errors.append(f"{page}: {ref} -> #{u.fragment} not found in {path}")

    dups = {i for i in c.ids if c.ids.count(i) > 1}
    for d in dups:
        errors.append(f'{page}: duplicate id="{d}"')
    for src in c.imgs_no_alt:
        errors.append(f"{page}: <img> without alt: {src}")
    for href in c.blank_no_rel:
        errors.append(f"{page}: target=_blank without rel=noopener: {href}")
    if c.h1 != 1:
        warnings.append(f"{page}: {c.h1} <h1> elements (expected 1)")

    for pattern, label in [
        (r'rel="canonical"', "canonical link"),
        (rf'og:image" content="{re.escape(BASE)}', "absolute og:image"),
        (r"classList\.add\('js'\)", "js-detection flag"),
        (r'class="skip-link"', "skip link"),
        (r'<main id="main">', "<main> landmark"),
    ]:
        if not re.search(pattern, html):
            errors.append(f"{page}: missing {label}")

    if 'href="#"' in html:
        errors.append(f'{page}: dead href="#"')

css = (ROOT / "css/style.css").read_text(errors="replace")
for m in re.finditer(r'url\((["\']?)([^)"\']+)\1\)', css):
    ref = m.group(2)
    if ref.startswith(("http", "data:")):
        continue
    if not (ROOT / "css" / ref).resolve().exists():
        errors.append(f"style.css: url({ref}) does not resolve")

if ".js .fade-in" not in css:
    errors.append("style.css: .fade-in is not gated on .js (page renders blank without JS)")

print(f"pages checked: {len(PAGES)}")
print(f"\nERRORS ({len(errors)}):")
for e in errors:
    print("  x", e)
print(f"\nWARNINGS ({len(warnings)}):")
for w in warnings:
    print("  !", w)

sys.exit(1 if errors else 0)
