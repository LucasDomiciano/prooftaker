const DEFAULT_SECRET = "prooftaker-local-dev-session-secret-32b";

export type AppSession = {
  userId: string;
};

export function getSessionConfig() {
  const password = process.env.SESSION_SECRET || DEFAULT_SECRET;
  if (password.length < 32) {
    throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres.");
  }
  return {
    password,
    name: "prooftaker-session",
    maxAge: 60 * 60 * 24 * 30,
  };
}
