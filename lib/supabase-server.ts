import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type ClientFactory = typeof createClient;

export type AuthenticatedRequest = {
  ok: true;
  client: SupabaseClient;
  user: User;
};

export type RejectedRequest = {
  ok: false;
  response: Response;
};

export function apiError(status: number, code: string, message: string) {
  return Response.json({ error: message, code }, { status });
}

export async function authenticateRequest(
  request: Request,
  clientFactory: ClientFactory = createClient,
): Promise<AuthenticatedRequest | RejectedRequest> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    return {
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return {
      ok: false,
      response: apiError(500, "server_misconfigured", "Service configuration is incomplete."),
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      ok: false,
      response: apiError(500, "server_misconfigured", "Service configuration is invalid."),
    };
  }

  const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && isLocalHost)) {
    return {
      ok: false,
      response: apiError(500, "server_misconfigured", "Service configuration is invalid."),
    };
  }

  try {
    const client = clientFactory(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      const unavailable = error && error.status !== 400 && error.status !== 401 && error.status !== 403;
      return {
        ok: false,
        response: unavailable
          ? apiError(503, "authentication_unavailable", "Authentication service is unavailable.")
          : apiError(401, "unauthorized", "Authentication required."),
      };
    }

    return { ok: true, client, user: data.user };
  } catch {
    return {
      ok: false,
      response: apiError(503, "authentication_unavailable", "Authentication service is unavailable."),
    };
  }
}