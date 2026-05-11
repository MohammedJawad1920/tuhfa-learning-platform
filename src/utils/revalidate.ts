import { env } from "@/config/env";

export async function triggerRevalidation(): Promise<void> {
  try {
    const revalidateUrl = new URL("/api/revalidate", env.NEXT_PUBLIC_APP_URL);
    const nonce = Date.now().toString();

    fetch(revalidateUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.REVALIDATION_SECRET}`,
        "X-Revalidate-Nonce": nonce,
      },
    }).catch(() => undefined);
  } catch {
    // Ignore revalidation failures so admin writes remain fast.
  }
}

export default triggerRevalidation;
