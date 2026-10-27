process.env.FLOWNOTE_BASE_PATH='/';
process.env.FLOWNOTE_SITE_URL ||= process.env.VERCEL_PROJECT_PRODUCTION_URL
  ?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL
  :process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'https://flow-note.vercel.app';
await import('./build-pages.mjs');
await import('./verify-pages.mjs');
