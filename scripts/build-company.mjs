import { mkdir, cp, copyFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { html } from "../studio/render.mjs";
const root = new URL("../", import.meta.url),
  dist = new URL("dist/", root);
if (!process.env.STUDIO_SKIP_NEXT) {
  const r = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("node_modules/next/dist/bin/next", root)),
      "build",
      "agencyflow",
      "--webpack",
    ],
    {
      cwd: fileURLToPath(root),
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_AGENCY_URL: "https://agencyflow-studio-dun.vercel.app",
      },
    },
  );
  if (r.status !== 0) process.exit(r.status || 1);
}
await mkdir(dist, { recursive: true });
await cp(new URL("studio/assets/", root), new URL("assets/", dist), {
  recursive: true,
});
await writeFile(new URL("index.html", dist), html);
await copyFile(new URL("studio/style.css", root), new URL("style.css", dist));
await copyFile(
  new URL("demos/weekly-report/assets/PretendardVariable.woff2", root),
  new URL("assets/PretendardVariable.woff2", dist),
);
await build({
  entryPoints: [fileURLToPath(new URL("studio/main.js", root))],
  outfile: fileURLToPath(new URL("main.js", dist)),
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
});
for (const dir of [
  "follonote",
  "crewmemo",
  "_next",
  "product-assets",
  "manuals",
])
  await cp(
    new URL("agencyflow/out/" + dir + "/", root),
    new URL(dir + "/", dist),
    { recursive: true },
  );
await copyFile(
  new URL("agencyflow/public/PretendardVariable.woff2", root),
  new URL("PretendardVariable.woff2", dist),
);
await writeFile(
  new URL("robots.txt", dist),
  "User-agent: *\nAllow: /\nSitemap: https://enote-labs.vercel.app/sitemap.xml\n",
);
await writeFile(
  new URL("sitemap.xml", dist),
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    ["/"]
      .map(
        (p) => "<url><loc>https://enote-labs.vercel.app" + p + "</loc></url>",
      )
      .join("") +
    "</urlset>",
);
console.log("Studio landing + Follonote CRM + Crewmemo groupware built.");
