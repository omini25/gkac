import path from "path";

/**
 * Returns the absolute path to the uploads directory.
 * Can be overridden via the UPLOADS_DIR environment variable.
 * Falls back to `backend/uploads/` relative to the project root.
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  // Default: two levels up from `src/` — i.e. `backend/uploads/`
  return path.join(__dirname, "..", "uploads");
}
