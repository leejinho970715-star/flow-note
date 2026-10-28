process.env.FLOWNOTE_BASE_PATH='/';
process.env.FLOWNOTE_SITE_URL ||= process.env.VERCEL_PROJECT_PRODUCTION_URL
  ?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL
  :process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'https://flow-note-psi.vercel.app';
if(process.env.FLOWNOTE_TARGET==='agency')await import('./build-agency.mjs');
else if(process.env.FLOWNOTE_TARGET==='company')await import('./build-company.mjs');
else{await import('./build-pages.mjs');await import('./verify-pages.mjs');}
