import { z } from "zod";

type RuntimeEnv = Readonly<Record<string, string | undefined>>;

interface SupabaseAdminEnv {
  supabaseUrl: string;
  supabaseKey: string;
}

interface PublicSupabaseEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class EnvConfigurationError extends Error {
  constructor(message: string, public readonly variables: readonly string[]) {
    super(message);
    this.name = "EnvConfigurationError";
  }
}

const envString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1)
);

const optionalEnvString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional()
);

const publicSupabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: envString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envString,
});

const supabaseAdminSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalEnvString,
  SUPABASE_URL: optionalEnvString,
  SUPABASE_KEY: optionalEnvString,
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvString,
});

function currentEnv(env?: RuntimeEnv): RuntimeEnv {
  return env ?? process.env;
}

function publicRuntimeEnv(): RuntimeEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

function readFirstEnv(env: RuntimeEnv, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function missingEnv(names: readonly string[]): EnvConfigurationError {
  return new EnvConfigurationError(
    `Missing required environment variable: ${names.join(" or ")}`,
    names
  );
}

export function getPublicSupabaseEnv(env?: RuntimeEnv): PublicSupabaseEnv {
  const result = publicSupabaseSchema.safeParse(env ?? publicRuntimeEnv());

  if (!result.success) {
    const variables = result.error.issues.map((issue) => String(issue.path[0]));
    throw new EnvConfigurationError(
      `Missing required environment variable: ${variables.join(", ")}`,
      variables
    );
  }

  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseAdminEnv(env?: RuntimeEnv): SupabaseAdminEnv {
  const runtimeEnv = currentEnv(env);
  supabaseAdminSchema.parse(runtimeEnv);

  const supabaseUrl = readFirstEnv(runtimeEnv, [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]);
  const supabaseKey = readFirstEnv(runtimeEnv, [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_KEY",
  ]);

  if (!supabaseUrl) {
    throw missingEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  }
  if (!supabaseKey) {
    throw missingEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY"]);
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

export function getOptionalEnv(name: string, env?: RuntimeEnv): string | undefined {
  return readFirstEnv(currentEnv(env), [name]);
}
