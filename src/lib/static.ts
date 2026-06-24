// True in the read-only GitHub Pages build. NEXT_PUBLIC_ so it is inlined for
// client components and also readable in server components at build time.
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
