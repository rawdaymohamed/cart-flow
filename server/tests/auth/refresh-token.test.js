import request from "supertest";
import { describe, it } from "vitest";
import { redis } from "../../lib/redis.js";
import app from "../../app.js";
import { vi } from "vitest";

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe("Refresh Token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects refresh when refresh token is missing", async () => {
    const res = await request(app).post("/api/auth/refresh-token");

    expect(res.status).toBe(401);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "No refresh token provided",
      }),
    );
  });

  it("rejects invalid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", ["refreshToken=invalid-token"]);

    expect(res.status).toBe(401);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Invalid refresh token",
      }),
    );
  });

  it("issues a new access token when refresh token is valid", async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const refreshCookie = signupRes.headers["set-cookie"].find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    const refreshToken = refreshCookie.split(";")[0].split("=")[1];

    redis.get.mockResolvedValue(refreshToken);

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [refreshCookie]);

    expect(res.status).toBe(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Token refreshed successfully",
      }),
    );

    const newCookies = res.headers["set-cookie"];

    expect(newCookies).toBeDefined();

    expect(newCookies.some((cookie) => cookie.startsWith("accessToken="))).toBe(
      true,
    );
  });

  it("rejects refresh token that is not stored in redis", async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const refreshCookie = signupRes.headers["set-cookie"].find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    redis.get.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [refreshCookie]);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid refresh token");
  });
});
