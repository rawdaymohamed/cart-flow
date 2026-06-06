import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../app.js";

describe("GET /api/auth/profile", () => {
  it("rejects request when user is not authenticated", async () => {
    const res = await request(app).get("/api/auth/profile");

    expect(res.status).toBe(401);
  });

  it("returns user profile when authenticated", async () => {
    await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "rawda@example.com",
      password: "password123",
    });

    const cookies = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        email: "rawda@example.com",
        name: "Rawda",
      }),
    );

    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects request when access token is invalid", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", ["accessToken=invalid-token"]);

    expect(res.status).toBe(401);
  });
});
