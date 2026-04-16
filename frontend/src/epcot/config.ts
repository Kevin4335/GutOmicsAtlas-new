/**
 * 1 = developer diagnostics (raw errors, technical strip, upload id). 0 = researcher-facing UI only.
 * Set to 1 while QA-ing the full EPCOT flow; use 0 for biological users.
 */
export const EPCOT_TESTING_MODE: 0 | 1 = 1

/** Default lab API host (overridable with VITE_EPCOT_API_URL). See FRONTEND_instructions.md / BACKEND_API.md. */
export const EPCOT_DEFAULT_API_BASE = 'http://jieliulab3.dcmb.med.umich.edu:8001'
