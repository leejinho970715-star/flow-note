import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  read = (p) => readFile(new URL(p, root), "utf8");
const html = await read("dist/index.html");
assert(html.includes("ENOTE-LABS") && !html.includes("Flownote Studio"));
assert.equal((html.match(/role="tab"/g) || []).length, 4);
assert.equal((html.match(/role="tabpanel"/g) || []).length, 4);
assert.equal((html.match(/class="mac-toolbar"/g) || []).length, 5);
const landingCss = await read("studio/style.css");
assert(
  !/#(?:226754|276854|137d71|3864d9|e7f1ea)\b/i.test(landingCss),
  "Landing must use the orange palette",
);
const captures = JSON.parse(await read("studio/assets/capture-manifest.json"));
assert.equal(captures.screens.length, 4);
for (const kind of ["flownote", "agencyflow", "follonote", "crewmemo"]) {
  assert(html.includes("/manuals/" + kind + "-guide-orange-20261031.pdf"));
  const pdf = await readFile(
    new URL("dist/manuals/" + kind + "-guide-orange-20261031.pdf", root),
  );
  assert.equal(pdf.toString("ascii", 0, 5), "%PDF-");
}
for (const name of ["Flownote", "ProjectFlow", "Follonote", "Crewmemo"])
  assert(html.includes(name));
const siteOrigin = "https://enote-labs.vercel.app/";
assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)[1], siteOrigin);
assert.equal(html.match(/property="og:url" content="([^"]+)"/)[1], siteOrigin);
const ogDescription = html.match(
  /property="og:description" content="([^"]+)"/,
)[1];
assert(ogDescription.length > 30);
assert.equal(
  html.match(/name="twitter:description" content="([^"]+)"/)[1],
  ogDescription,
);
const graph = JSON.parse(
  html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
);
assert(
  graph["@graph"].some(
    (x) =>
      x["@type"] === "Organization" && x.email === "leejinho970715@gmail.com",
  ),
);
const sitemap = await read("dist/sitemap.xml");
assert.deepEqual(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]),
  [siteOrigin],
);
const companyOG = await readFile(
  new URL("dist/assets/og-enote-labs-20261031.png", root),
);
assert.equal(companyOG.readUInt32BE(16), 1200);
assert.equal(companyOG.readUInt32BE(20), 630);
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert(html.includes("application/ld+json"));
assert(html.includes("아직") || html.includes("준비 중"));
for (const kind of ["follonote", "crewmemo"]) {
  const home = await read("agencyflow/out/" + kind + "/index.html"),
    app = await read("agencyflow/out/" + kind + "/workspace/index.html");
  assert(home.includes("https://flownote-studio.vercel.app/" + kind + "/"));
  assert(home.includes("/product-assets/" + kind + "-og.png"));
  assert(app.includes("noindex"));
  assert(
    app.includes("https://flownote-studio.vercel.app/" + kind + "/workspace/"),
  );
  await read("agencyflow/public/product-assets/" + kind + "-icon.svg");
  const png = await readFile(
    new URL("agencyflow/public/product-assets/" + kind + "-og.png", root),
  );
  assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
}
for (const name of ["report", "feedback", "crm", "team", "check", "custom"]) {
  const asset = await readFile(
    new URL("dist/assets/clay/" + name + ".webp", root),
  );
  assert.equal(asset.toString("ascii", 0, 4), "RIFF");
  assert.equal(asset.toString("ascii", 8, 12), "WEBP");
}
const main = await read("dist/main.js");
assert(main.includes("ScrollTrigger"));
assert(!html.includes('data-testid="fake"'));
console.log(
  "Studio catalog, canonical metadata, product OG/icon assets, workspace noindex and bundled GSAP verified.",
);
