import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../app.js";
import User from "../../models/user.model.js";
import { email } from "zod";

describe("POST /api/auth/signup", () => {
  it("creates a new user and sets auth cookies", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        name: "Rawda",
        email: "rawda@example.com",
      }),
    );

    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("role");

    expect(res.body).not.toHaveProperty("password");

    expect(res.headers["set-cookie"]).toBeDefined();

    const userInDb = await User.findOne({ email: "rawda@example.com" });

    expect(userInDb).toBeTruthy();
    expect(userInDb.password).not.toBe("password123");
  });
  it("rejects signup when email already exists", async () => {
    await User.create({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda 2",
      email: "rawda@example.com",
      password: "password456",
    });

    expect(res.status).toBe(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "User already exists",
      }),
    );

    const users = await User.find({ email: "rawda@example.com" });

    expect(users).toHaveLength(1);
  });
  it("does not return password in response", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);

    expect(res.body).not.toHaveProperty("password");
  });

  it("sets accessToken and refreshToken cookies after signup", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);

    const cookies = res.headers["set-cookie"];

    expect(cookies).toBeDefined();

    expect(cookies.some((cookie) => cookie.startsWith("accessToken="))).toBe(
      true,
    );

    expect(cookies.some((cookie) => cookie.startsWith("refreshToken="))).toBe(
      true,
    );
  });
  it("rejects signup when name is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Name is required");
  });
  it("rejects signup when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Rawda" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email is required");
  });
  it("rejects signup when password are missing", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Rawda", email: "rawda1@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Password is required");
  });

  it("rejects invalid email format", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "not-an-email",
      password: "password123",
    });

    expect(res.status).toBe(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Please provide a valid email",
      }),
    );
  });
  it("rejects short password", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Rawda",
      email: "rawda1@test.com",
      password: "123",
    });

    expect(res.status).toBe(400);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Password must be at least 8 characters",
      }),
    );
  });
});
