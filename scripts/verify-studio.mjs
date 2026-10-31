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
  assert(html.includes("/manuals/" + kind + "-guide.pdf"));
  const pdf = await readFile(
    new URL("dist/manuals/" + kind + "-guide.pdf", root),
  );
  assert.equal(pdf.toString("ascii", 0, 5), "%PDF-");
}
for (const name of ["Flownote", "ProjectFlow", "Follonote", "Crewmemo"])
  assert(html.includes(name));
assert(html.includes("https://flownote-studio.vercel.app/"));
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
for (const name of ["report","feedback","crm","team","check"]) {
 const asset = await readFile(new URL("dist/assets/clay/"+name+".webp",root));
 assert.equal(asset.toString("ascii",0,4),"RIFF");
 assert.equal(asset.toString("ascii",8,12),"WEBP");
}
const main = await read("dist/main.js");
assert(main.includes("ScrollTrigger"));
assert(!html.includes('data-testid="fake"'));
console.log(
  "Studio catalog, canonical metadata, product OG/icon assets, workspace noindex and bundled GSAP verified.",
);
