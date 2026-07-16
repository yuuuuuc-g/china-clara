import { NextResponse } from "next/server";

/** /api/v1 统一响应信封：{ data, meta, error } */

export interface Meta {
  page?: number;
  perPage?: number;
  total?: number;
  [key: string]: unknown;
}

export function ok<T>(data: T, meta: Meta = {}, status = 200) {
  return NextResponse.json({ data, meta, error: null }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { data: null, meta: {}, error: { code, message } },
    { status }
  );
}
