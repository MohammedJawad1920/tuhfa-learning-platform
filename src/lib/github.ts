import { env } from "@/config/env";

export class UpstreamError extends Error {}
export class ConflictError extends Error {}

const GITHUB_API_BASE = "https://api.github.com";

async function timedFetch(
  input: RequestInfo,
  init: RequestInit = {},
  timeout = 10000,
  retries = 1,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(String(input), {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.status >= 500 && attempt < retries) {
        // retry after brief backoff
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(id);
      if (err instanceof Error && (err as any).name === "AbortError") {
        throw new UpstreamError("Request timed out");
      }
      throw err;
    }
  }

  throw new UpstreamError("Unable to complete request");
}

export async function fetchLessons(): Promise<{ data: unknown; sha: string }> {
  const url = `${GITHUB_API_BASE}/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${env.GITHUB_FILE_PATH}?ref=${env.GITHUB_BRANCH}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${env.GITHUB_TOKEN}`,
    "User-Agent": "tuhfa-backend",
  };

  const res = await timedFetch(url, { method: "GET", headers }, 10000, 1);

  if (res.status >= 500) {
    throw new UpstreamError(`GitHub upstream error: ${res.status}`);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new UpstreamError(`GitHub responded with ${res.status}: ${txt}`);
  }

  const body = await res.json();
  const content = typeof body.content === "string" ? body.content : "";
  const sha = body.sha as string;

  try {
    const decoded = Buffer.from(content, "base64").toString("utf8");
    const data = JSON.parse(decoded);
    return { data, sha };
  } catch (err) {
    throw new UpstreamError(
      `Failed to parse lessons file: ${(err as Error).message}`,
    );
  }
}

export async function updateLessons(
  lessons: unknown,
  sha: string,
  commitMessage = "Update lessons.json",
): Promise<unknown> {
  if (!sha) throw new Error("sha is required for updateLessons");

  const url = `${GITHUB_API_BASE}/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${env.GITHUB_FILE_PATH}`;

  const content = Buffer.from(JSON.stringify(lessons), "utf8").toString(
    "base64",
  );

  const body = JSON.stringify({
    message: commitMessage,
    content,
    branch: env.GITHUB_BRANCH,
    sha,
  });

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${env.GITHUB_TOKEN}`,
    "User-Agent": "tuhfa-backend",
    "Content-Type": "application/json",
  };

  const res = await timedFetch(url, { method: "PUT", headers, body }, 10000, 1);

  if (res.status === 409) {
    throw new ConflictError("GitHub content conflict (409)");
  }

  if (res.status >= 500 || !res.ok) {
    const txt = await res.text().catch(() => "");
    throw new UpstreamError(`GitHub update failed: ${res.status} ${txt}`);
  }

  return res.json();
}

export default { fetchLessons, updateLessons, UpstreamError, ConflictError };
