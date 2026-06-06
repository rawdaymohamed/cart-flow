import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app.js";
describe("API Health /api/health", () => {
  it("returns success message", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ success: true, message: "Server is running" }),
    );
  });
});
