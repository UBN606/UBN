// Soft-loads dotenv so scripts work both with and without node_modules.
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch {
  // dotenv not installed; rely on process env only.
}
