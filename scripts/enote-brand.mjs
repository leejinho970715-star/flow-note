import { writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const marks = {
  flownote: "M20 15h21l7 7v27H20zM27 29h14M27 37h10",
  agencyflow: "M18 17h29v25H33l-12 9v-9h-3zM27 26h12M27 33h7",
  follonote: "M18 47V18M18 47h30M24 39l9-10 7 4 8-14M39 19h9v9",
  crewmemo: "M15 45v-6l8-4 9 3 9-3 8 4v6M24 47v-8h16v8",
  enote: "M19 16h28M19 16v33h28M19 32h22M39 24l8 8-8 8",
};
await mkdir(new URL("agencyflow/public/product-assets/", root), {
  recursive: true,
});
for (const [kind, path] of Object.entries(marks)) {
  const color = kind === "enote" ? "#ed7834" : "#c4541b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="17" fill="${color}"/>${kind === "crewmemo" ? '<g fill="none" stroke="#fff" stroke-width="3.5"><circle cx="32" cy="22" r="6"/><circle cx="19" cy="29" r="4"/><circle cx="45" cy="29" r="4"/></g>' : ""}<path d="${path}" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  await writeFile(
    new URL("agencyflow/public/product-assets/" + kind + "-icon.svg", root),
    svg,
  );
  if (kind === "agencyflow")
    await writeFile(new URL("agencyflow/public/favicon.svg", root), svg);
  if (kind === "flownote")
    await writeFile(
      new URL("demos/weekly-report/assets/flownote-logo.svg", root),
      svg,
    );
  if (kind === "enote")
    await writeFile(new URL("studio/assets/favicon.svg", root), svg);
}
console.log(
  "ENOTE-LABS brand, product symbols and manual entry points updated.",
);
