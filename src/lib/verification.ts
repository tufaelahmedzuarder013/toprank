/** Ownership verification constants shared by the server checks and the instructions UI. */
export const VERIFY_KEY = "toprung-site-verification";
export const VERIFY_FILE = "/.well-known/toprung-verification.txt";

/** Short code an X profile owner puts in their bio for manual review. */
export const bioCode = (token: string) => `toprung:${token.slice(0, 12)}`;
