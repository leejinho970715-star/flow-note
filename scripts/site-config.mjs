export const base=process.env.FLOWNOTE_BASE_PATH||'/flow-note/';
export const origin=new URL(process.env.FLOWNOTE_SITE_URL||'https://leejinho970715-star.github.io').origin;
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw new Error('FLOWNOTE_BASE_PATH must be / or a path with a trailing slash.');
