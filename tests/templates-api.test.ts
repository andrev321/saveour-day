import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

test("creation handler builds selected templates server-side and rejects invalid choices", async () => {
  const calls: { name: string; payload: Record<string, unknown> }[] = [];
  let authenticated = true;
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      requireUser: async () => {
        if (!authenticated) throw new Error("AUTH_REQUIRED");
        return { user: { id: "owner" } };
      },
      readJson: (request: Request) => request.json(),
      checkDb: (error: unknown) => {
        if (error) throw error;
      },
      serviceDb: () => ({
        rpc: async (name: string, payload: Record<string, unknown>) => {
          calls.push({ name, payload });
          return { error: null };
        },
      }),
      api:
        (handler: (r: Request) => Promise<unknown>) => async (r: Request) => {
          try {
            return Response.json(await handler(r));
          } catch (e) {
            return Response.json(
              {},
              { status: e instanceof z.ZodError ? 400 : 401 },
            );
          }
        },
    },
  });
  const { POST } = await import("../apps/admin/app/api/sites/route.ts");
  const post = (payload: unknown) =>
    POST(
      new Request("https://panel.test/api/sites", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  try {
    assert.equal(
      (
        await post({
          name: "Birthday",
          templateId: "birthday",
          locale: "en-GB",
        })
      ).status,
      200,
    );
    assert.equal(calls[0].name, "create_owned_site");
    const content = calls[0].payload.content as {
      identity: { displayName: string };
      locale: string;
      schemaVersion: number;
    };
    assert.equal(content.identity.displayName, "Birthday");
    assert.equal(content.locale, "en-GB");
    assert.equal(content.schemaVersion, 2);
    assert.equal(
      (await post({ name: "Empty", templateId: "blank", locale: "pl-PL" }))
        .status,
      200,
    );
    assert.equal(
      (calls[1].payload.content as { events: unknown[] }).events.length,
      0,
    );
    assert.equal(
      (
        await post({
          name: "Wrong",
          templateId: "not-a-template",
          locale: "pl-PL",
        })
      ).status,
      400,
    );
    assert.equal(
      (await post({ name: "Wrong", templateId: "blank", locale: "unknown" }))
        .status,
      400,
    );
    assert.equal(calls.length, 2);
    authenticated = false;
    assert.equal(
      (await post({ name: "Denied", templateId: "blank", locale: "pl-PL" }))
        .status,
      401,
    );
    assert.equal(calls.length, 2);
  } finally {
    mock.restoreAll();
  }
});
