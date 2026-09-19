# mo-rizvi — personal site

Single-page profile for Mohammed Ali Rizvi, analytics engineer. Deployed as a
[Render Static Site](https://render.com/docs/static-sites) from this repo.

No build step: plain HTML, CSS and one ES module. Three.js is loaded from
jsDelivr via an import map for the lineage-DAG hero; if the CDN or WebGL is
unavailable, or `prefers-reduced-motion` is set, the page falls back to a static
gradient and is otherwise complete.

## Files

```
index.html   content + import map
styles.css   tokens (dark-first, light variant), layout, card depth, reveals
main.js      scroll reveals, card tilt, Three.js DAG
render.yaml  Render Blueprint (static, publish dir ".", no build)
```

## Run locally

```bash
python -m http.server 8080
# http://localhost:8080
```

Any static server works; the page must be served over http(s) (not `file://`)
because `main.js` is an ES module.

## Deploy on Render

Either apply the Blueprint (`render.yaml`) or, in the dashboard:

New → Static Site → connect `rizvi14/render` → branch `main` →
build command *(empty)* → publish directory `.`

Auto-deploy on push to `main` is on by default.
