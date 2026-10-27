export function parseServerId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const id = value.trim();
  if (id.length === 0 || id.length > 128) return null;

  return id;
}

export const MAX_API_JSON_BODY_BYTES = 1024;

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; code: "invalid_request" | "body_too_large"; message: string };

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_API_JSON_BODY_BYTES,
): Promise<JsonBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("maxBytes must be a positive safe integer");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      return { ok: false, status: 400, code: "invalid_request", message: "A valid JSON body is required." };
    }
    if (Number(contentLength) > maxBytes) {
      return { ok: false, status: 413, code: "body_too_large", message: "Request body is too large." };
    }
  }

  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return { ok: false, status: 400, code: "invalid_request", message: "A JSON content type is required." };
  }
  if (!request.body) {
    return { ok: false, status: 400, code: "invalid_request", message: "A valid JSON body is required." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request is rejected regardless of stream cancellation outcome.
        }
        return { ok: false, status: 413, code: "body_too_large", message: "Request body is too large." };
      }
      chunks.push(value);
    }

    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, code: "invalid_request", message: "A valid JSON body is required." };
  } finally {
    reader.releaseLock();
  }
}

export type AccountCreationInput = { name: string };
export type ApplicationCreationInput = { accountId: string; name: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function parseAccountCreationInput(value: unknown): AccountCreationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!hasExactKeys(input, ["name"]) || typeof input.name !== "string") return null;
  const name = input.name.trim();
  return name.length >= 2 && name.length <= 80 ? { name } : null;
}

export function parseApplicationCreationInput(value: unknown): ApplicationCreationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    !hasExactKeys(input, ["accountId", "name"]) ||
    typeof input.accountId !== "string" ||
    !uuidPattern.test(input.accountId) ||
    typeof input.name !== "string"
  ) {
    return null;
  }

  const name = input.name.trim();
  return name.length >= 2 && name.length <= 80
    ? { accountId: input.accountId, name }
    : null;
}