# The Levi Lab — website

Source for **[levi.cascadiawildlifelab.org](https://levi.cascadiawildlifelab.org)**.

A static site (plain HTML, CSS, JavaScript — no build step, no framework)
served by GitHub Pages. Anything pushed to `main` is live within about a minute.

---

## Layout

```
index.html            Homepage — hero, research areas, video gallery, recent papers
research.html         Five research areas (anchor targets #env-genetics etc.)
publications.html     Full publication list with year filter and search
people.html           Current lab members and alumni
software.html         Released tools, including the FEZ 1.0 download
courses.html          Teaching
join.html             Prospective students and postdocs

css/style.css         All styling
js/main.js            Nav, theme toggle, scroll reveal, lightbox, pub filtering
media/img/            Photos and research-card backgrounds
media/img/posters/    Poster frames for the homepage gallery
media/people/         Member portraits
media/video/          Video clips
software/             Downloadable software archives

CNAME                 Custom domain — deleting this takes the site off the domain
scripts/check-site.py Link/anchor/alt/head checker; run before pushing
```

---

## Running it locally

```bash
git clone https://github.com/taaltree/levi-lab.git
cd levi-lab
python3 -m http.server 4176
```

Then open <http://localhost:4176>.

Before pushing:

```bash
python3 scripts/check-site.py
```

It fails on broken links, missing images, dead anchors, duplicate IDs, images
without `alt`, and missing canonical/social tags.

---

## Things worth knowing before editing

**The `.js` class gates the scroll animations.** `css/style.css` hides
`.fade-in` elements only under `.js .fade-in`, and an inline script in each
`<head>` adds that class. Do not remove the inline script — without it the
animation never runs, and without the gate the page renders blank when
scripting is unavailable.

**The homepage gallery deliberately does not autoplay.** Items are poster
images that open a lightbox on click. They were previously five autoplaying
`<video>` elements, which cost about 33 MB on every page load.

**Hover-revealed content has a touch fallback.** Research-card descriptions and
gallery play buttons appear on `:hover`, with a `@media (hover: none)` block
that shows them permanently on phones and tablets. If you add another
hover-reveal, add it there too or it will be invisible on mobile.

**Content repeated across pages.** The nav, mobile nav, and footer are copied
into all seven files. Changing one means changing all seven.

**Media budget.** Photos under 400 KB, portraits under 250 KB, videos under
6 MB. Keep originals out of this repository — they live in Dropbox.

---

## Still to do

- [ ] Photos for the three people currently shown as initials on `people.html`
- [ ] Confirm the 2018 FEZ 1.0 archive is still the version worth distributing
- [ ] Decide whether the old OSU page at `agsci-labs.oregonstate.edu/levit/`
      should redirect here or be retired

---

## Deployment

GitHub Pages builds from `main`, root directory. Push and it is live in about a
minute. The domain is set by the `CNAME` file plus a DNS record at Cloudflare:

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `levi` | `taaltree.github.io` | DNS only |

Proxy status must be **DNS only** (grey cloud) or GitHub cannot issue the TLS
certificate.
