"use client";

import { getResolvedLocale } from "@/i18n";

export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-app-locale", getResolvedLocale());
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}
