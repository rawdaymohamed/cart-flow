import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../app.js";
import User from "../../models/user.model.js";

describe("POST /api/auth/login", () => {
  it("logs in user with valid credentials and sets auth cookies", async () => {
    await User.create({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "rawda@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        name: "Rawda",
        email: "rawda@example.com",
      }),
    );

    expect(res.body).not.toHaveProperty("password");

    const cookies = res.headers["set-cookie"];

    expect(cookies).toBeDefined();

    expect(cookies.some((cookie) => cookie.startsWith("accessToken="))).toBe(
      true,
    );

    expect(cookies.some((cookie) => cookie.startsWith("refreshToken="))).toBe(
      true,
    );
  });

  it("rejects login when email does not exist", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@test.com",
      password: "password123",
    });

    expect(res.status).toBe(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Invalid email or password",
      }),
    );
  });
  it("rejects login when password is incorrect", async () => {
    await User.create({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "rawda@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Invalid email or password",
      }),
    );
  });
  it("rejects login when email is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Email is required",
      }),
    );
  });
  it("rejects login when password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "rawda1@test.com",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Password is required",
      }),
    );
  });
  it("rejects login when email format is invalid", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please provide a valid email");
  });
  it("rejects login when fields are empty strings", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "",
      password: "",
    });

    expect(res.status).toBe(400);
  });
  it("does not set auth cookies when login fails", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@test.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});
