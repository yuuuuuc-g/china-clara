import { describe, expect, it } from "vitest";
import {
  EnvConfigurationError,
  getPublicSupabaseEnv,
  getSupabaseAdminEnv,
} from "./env";

describe("environment configuration", () => {
  it("resolves public Supabase configuration", () => {
    expect(
      getPublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      })
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    });
  });

  it("prefers service-role credentials for server-side Supabase access", () => {
    expect(
      getSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://public.supabase.co",
        SUPABASE_URL: "https://server.supabase.co",
        SUPABASE_KEY: "legacy-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      })
    ).toEqual({
      supabaseUrl: "https://server.supabase.co",
      supabaseKey: "service-role-key",
    });
  });

  it("falls back to public URL and legacy key for older server routes", () => {
    expect(
      getSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://public.supabase.co",
        SUPABASE_KEY: "legacy-key",
      })
    ).toEqual({
      supabaseUrl: "https://public.supabase.co",
      supabaseKey: "legacy-key",
    });
  });

  it("raises a typed error when required Supabase admin credentials are missing", () => {
    expect(() => getSupabaseAdminEnv({ SUPABASE_URL: "https://example.supabase.co" })).toThrow(
      EnvConfigurationError
    );
  });
});
