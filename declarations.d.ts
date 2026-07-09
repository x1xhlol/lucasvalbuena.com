// TypeScript 7 checks side-effect imports; @payloadcms/next's ./css export
// points at a plain .css file with no types condition.
declare module "@payloadcms/next/css";
