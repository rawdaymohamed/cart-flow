import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import app from "../../app.js";

// mock Redis BEFORE using it in assertions
vi.mock("../../lib/redis.js", () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));
import { redis } from "../../lib/redis.js";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("logs out user and clears auth cookies", async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const cookies = signupRes.headers["set-cookie"];

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Logged out successfully",
      }),
    );

    const clearedCookies = res.headers["set-cookie"];

    expect(clearedCookies).toBeDefined();

    expect(
      clearedCookies.some((cookie) => cookie.startsWith("accessToken=;")),
    ).toBe(true);

    expect(
      clearedCookies.some((cookie) => cookie.startsWith("refreshToken=;")),
    ).toBe(true);
  });

  it("removes refresh token from redis", async () => {
    const refreshToken = jwt.sign(
      { userId: "test-user-id" },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);

    expect(redis.del).toHaveBeenCalledWith("refresh_token:test-user-id");
  });
});
