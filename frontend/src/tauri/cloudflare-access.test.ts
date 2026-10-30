import axios from "axios";
import { describe, expect, it } from "vitest";
import { isAccessDenied } from "./cloudflare-access";

/** What axios rejects with when the server answers with this response. */
const rejectionFor = async (response: Response): Promise<unknown> =>
  axios
    .create({ adapter: "fetch", env: { fetch: async () => response } })
    .get("https://cereberus.test/api/invoices")
    .then(
      () => {
        throw new Error("expected the request to fail");
      },
      (error: unknown) => error,
    );

describe("isAccessDenied", () => {
  it("recognizes Cloudflare Access's 401", async () => {
    const error = await rejectionFor(
      new Response("", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Cloudflare-Access resource_metadata="x"',
        },
      }),
    );

    expect(isAccessDenied(error)).toBe(true);
  });

  it("recognizes Cloudflare Access's redirect to its login page", async () => {
    const error = await rejectionFor(
      new Response("", {
        status: 302,
        headers: {
          location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/x",
        },
      }),
    );

    expect(isAccessDenied(error)).toBe(true);
  });

  it("leaves Cereberus's own 401, an expired session, alone", async () => {
    const error = await rejectionFor(
      Response.json({ message: "Unauthorized" }, { status: 401 }),
    );

    expect(isAccessDenied(error)).toBe(false);
  });

  it("is false for errors with no response", () => {
    expect(isAccessDenied(new Error("Network Error"))).toBe(false);
  });
});
