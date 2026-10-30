import { describe, expect, it, vi } from "vitest";
import {
  checkConnection,
  describeConnectionCheck,
  type CheckFetch,
} from "./connection-check";

const CONFIG = {
  apiBaseUrl: "https://cereberus.test",
  cfAccessClientId: "id.access",
  cfAccessClientSecret: "secret",
};

// What Cloudflare Access answers when the service token isn't accepted.
const accessRedirect = () =>
  new Response("<html>Sign in</html>", {
    status: 302,
    headers: {
      location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/x",
      "www-authenticate": 'Cloudflare-Access resource_metadata="x"',
    },
  });

const respondingWith = (response: Response | (() => Promise<Response>)) =>
  vi.fn<CheckFetch>(async () =>
    typeof response === "function" ? response() : response,
  );

describe("checkConnection", () => {
  it("asks the backend's health check, sending the token and not following redirects", async () => {
    const fetchImpl = respondingWith(Response.json({ status: "ok" }));

    expect(await checkConnection(CONFIG, fetchImpl)).toBe("ok");

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://cereberus.test/api/healthz");
    expect(init?.headers).toEqual({
      "CF-Access-Client-Id": "id.access",
      "CF-Access-Client-Secret": "secret",
    });
    expect(init?.maxRedirections).toBe(0);
  });

  it("sends no token headers for a server Access does not protect", async () => {
    const fetchImpl = respondingWith(Response.json({ status: "ok" }));

    await checkConnection(
      { ...CONFIG, cfAccessClientId: "", cfAccessClientSecret: "" },
      fetchImpl,
    );

    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual({});
  });

  it("joins the path like axios does, keeping a base path", async () => {
    const fetchImpl = respondingWith(Response.json({ status: "ok" }));

    await checkConnection(
      { ...CONFIG, apiBaseUrl: "https://cereberus.test/prefix/" },
      fetchImpl,
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://cereberus.test/prefix/api/healthz",
    );
  });

  it.each(["cereberus.test", "ftp://cereberus.test", ""])(
    "rejects %j as a server address without sending anything",
    async (apiBaseUrl) => {
      const fetchImpl = respondingWith(Response.json({ status: "ok" }));

      expect(await checkConnection({ ...CONFIG, apiBaseUrl }, fetchImpl)).toBe(
        "invalid-url",
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("reports nothing answering as unreachable", async () => {
    // Tauri's fetch rejects with the Rust error as a plain string.
    const fetchImpl = vi.fn<CheckFetch>(() =>
      Promise.reject("error sending request"),
    );

    expect(await checkConnection(CONFIG, fetchImpl)).toBe("unreachable");
  });

  it("recognizes Cloudflare Access's redirect to its login page", async () => {
    expect(
      await checkConnection(CONFIG, respondingWith(accessRedirect())),
    ).toBe("access-denied");
  });

  it("recognizes Cloudflare Access's 401", async () => {
    const fetchImpl = respondingWith(
      new Response("", {
        status: 401,
        headers: {
          "www-authenticate": 'Cloudflare-Access resource_metadata="x"',
        },
      }),
    );

    expect(await checkConnection(CONFIG, fetchImpl)).toBe("access-denied");
  });

  it.each([502, 522, 530])(
    "reports a %i from Cloudflare as the backend being down",
    async (status) => {
      const fetchImpl = respondingWith(new Response("", { status }));

      expect(await checkConnection(CONFIG, fetchImpl)).toBe("backend-down");
    },
  );

  it.each([
    ["a 404 page", new Response("Not found", { status: 404 })],
    ["an HTML page", new Response("<html></html>", { status: 200 })],
    ["other JSON", Response.json({ hello: "world" })],
  ])("reports %s as not the Cereberus backend", async (_, response) => {
    expect(await checkConnection(CONFIG, respondingWith(response))).toBe(
      "not-cereberus",
    );
  });
});

describe("describeConnectionCheck", () => {
  it("names the host it tried", () => {
    expect(
      describeConnectionCheck("unreachable", "https://cereberus.test/prefix"),
    ).toBe(
      "Couldn't reach cereberus.test. Check the address and your connection.",
    );
    expect(
      describeConnectionCheck("access-denied", "https://cereberus.test"),
    ).toBe("Cloudflare Access rejected the client ID or secret.");
  });
});
