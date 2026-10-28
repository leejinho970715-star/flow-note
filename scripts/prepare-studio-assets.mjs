import { mkdir, writeFile, copyFile } from "node:fs/promises";
const dir = new URL("../agencyflow/public/product-assets/", import.meta.url);
await mkdir(dir, { recursive: true });
for (const [kind, color, path] of [
  ["follonote", "#137d71", "M20 43V21h23M21 32h17M32 21v23"],
  ["crewmemo", "#3864d9", "M21 24h23v23H21zM26 18v12M39 18v12M21 34h23"],
])
  await writeFile(
    new URL(kind + "-icon.svg", dir),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${color}"/><path d="${path}" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
await mkdir(new URL("../studio/assets/", import.meta.url), { recursive: true });
await copyFile(
  new URL("../marketing/assets/og-studio.png", import.meta.url),
  new URL("../studio/assets/og-studio.png", import.meta.url),
);
await copyFile(
  new URL("../marketing/favicon.svg", import.meta.url),
  new URL("../studio/assets/favicon.svg", import.meta.url),
);
console.log("Studio product icons prepared");
