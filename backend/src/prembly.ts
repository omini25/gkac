/**
 * Prembly Identity Verification Service
 *
 * Integrates with Prembly API (https://docs.prembly.com) for identity
 * verification, including NIN (National Identification Number) lookups.
 *
 * Environment variables:
 *   PREMBLY_APP_ID       – Your Prembly App ID (from dashboard)
 *   PREMBLY_APP_SECRET   – Your Prembly App Secret Key (used as x-api-key)
 *   PREMBLY_BASE_URL     – Optional, defaults to "https://api.prembly.com"
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PremblyNINData {
  birthcountry: string;
  birthdate: string;          // "DD-MM-YYYY"
  birthlga: string;
  birthstate: string;
  centralID: string;
  educationallevel: string;
  email: string;
  employmentstatus: string;
  firstname: string;
  gender: string;
  heigth: string;
  maritalstatus: string;
  middlename: string;
  nin: string;
  nok_address1: string;
  nok_address2: string;
  nok_firstname: string;
  nok_lga: string;
  nok_middlename: string;
  nok_postalcode: string;
  nok_state: string;
  nok_surname: string;
  nok_town: string;
  ospokenlang: string;
  pfirstname: string;
  photo: string;              // base64-encoded image
  pmiddlename: string;
  profession: string;
  psurname: string;
  religion: string;
  residence_address: string;
  residence_lga: string;
  residence_state: string;
  residence_town: string;
  residencestatus: string;
  self_origin_lga: string;
  self_origin_place: string;
  self_origin_state: string;
  signature: string;          // base64-encoded image
  spoken_language: string;
  surname: string;
  telephoneno: string;
  title: string;
  trackingId: string;
  userid: string;
  vnin: string;
}

export interface PremblyNINResponse {
  status: boolean;
  detail: string;
  response_code: string;
  nin_data: PremblyNINData;
}

export interface PremblyErrorResponse {
  status: boolean;
  detail: string;
  response_code?: string;
}

// ─── Error class ───────────────────────────────────────────────────────────

export class PremblyError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "PremblyError";
  }
}

// ─── NIN Verification ──────────────────────────────────────────────────────

/**
 * Verify a Nigerian National Identification Number (NIN) via Prembly.
 *
 * Accepts either an 11-digit NIN (`number_nin`) or a 16-character Virtual NIN
 * (`number`).
 *
 * @param nin - The 11-digit NIN or 16-character Virtual NIN to verify.
 * @returns The parsed Prembly response with full NIN data.
 * @throws {PremblyError} If the API key is missing, the request fails, or
 *                        Prembly returns a non-success status.
 */
export async function verifyNIN(nin: string): Promise<PremblyNINResponse> {
  const appId = process.env.PREMBLY_APP_ID || "";
  const appSecret = process.env.PREMBLY_APP_SECRET || "";
  const baseUrl = process.env.PREMBLY_BASE_URL || "https://api.prembly.com";

  if (!appId || !appSecret) {
    throw new PremblyError(
      "PREMBLY_APP_ID and PREMBLY_APP_SECRET environment variables must be set. " +
      "Get them from your Prembly dashboard."
    );
  }

  if (!nin || nin.trim().length === 0) {
    throw new PremblyError("NIN number is required.");
  }

  const isVirtualNIN = nin.trim().length > 11;
  const body: Record<string, string> = {};

  if (isVirtualNIN) {
    body.number = nin.trim();
  } else {
    body.number_nin = nin.trim();
  }

  const url = `${baseUrl}/verification/vnin`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": appSecret,
        "app_id": appId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new PremblyError(
      `Network error while calling Prembly NIN API: ${err instanceof Error ? err.message : "Unknown error"}`,
      undefined,
      err,
    );
  }

  let json: Record<string, unknown>;
  try {
    json = await response.json() as Record<string, unknown>;
  } catch {
    throw new PremblyError(
      `Prembly returned non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const errResp = json as unknown as PremblyErrorResponse;
    const detail = errResp.detail || JSON.stringify(json);
    throw new PremblyError(
      `Prembly API error (HTTP ${response.status}): ${detail}`,
      errResp.response_code,
    );
  }

  // Prembly wraps success in HTTP 200 with `status: true`
  if (json.status !== true) {
    const errResp = json as unknown as PremblyErrorResponse;
    const detail = errResp.detail || "Verification failed";
    throw new PremblyError(
      `Prembly verification failed: ${detail}`,
      errResp.response_code,
    );
  }

  return json as unknown as PremblyNINResponse;
}
