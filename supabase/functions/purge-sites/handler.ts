type Result<T> = { data: T; error: unknown };
export type PurgeServices = {
  claim: (siteId: string, token: string) => Promise<Result<boolean | null>>;
  paths: (
    siteId: string,
    token: string,
  ) => Promise<Result<{ path: string }[] | null>>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
  finish: (siteId: string, token: string) => Promise<{ error: unknown }>;
  fail: (siteId: string, token: string) => Promise<unknown>;
};
export function purgeHandler(services: PurgeServices) {
  return async (request: Request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    let siteId: string, token: string;
    try {
      const raw = await request.text();
      if (raw.length > 512) throw new Error("invalid");
      const body = JSON.parse(raw);
      if (
        typeof body?.siteId !== "string" ||
        typeof body?.token !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          body.siteId,
        ) ||
        !/^[a-f0-9]{64}$/.test(body.token)
      )
        throw new Error("invalid");
      siteId = body.siteId;
      token = body.token;
    } catch {
      return new Response(null, { status: 400 });
    }
    let claimed = false;
    try {
      const claim = await services.claim(siteId, token);
      if (claim.error) throw new Error("claim");
      if (!claim.data) return new Response(null, { status: 403 });
      claimed = true;
      // Bounded work per invocation; partial failures keep the DB and are retried.
      for (let batch = 0; batch < 100; batch++) {
        const result = await services.paths(siteId, token);
        if (result.error || !result.data) throw new Error("list");
        if (!result.data.length) {
          const finished = await services.finish(siteId, token);
          if (finished.error) throw new Error("finish");
          return Response.json({ deleted: true });
        }
        const paths = result.data.map((item) => item.path);
        if (
          paths.some(
            (path) => !path.startsWith(`${siteId}/`) || path.includes(".."),
          )
        )
          throw new Error("scope");
        if ((await services.remove(paths)).error) throw new Error("storage");
      }
      throw new Error("batch-limit");
    } catch {
      if (claimed) {
        try {
          await services.fail(siteId, token);
        } catch {
          /* Expiry makes the job retryable even when reporting fails. */
        }
      }
      return Response.json({ error: "Cleanup incomplete" }, { status: 503 });
    }
  };
}
