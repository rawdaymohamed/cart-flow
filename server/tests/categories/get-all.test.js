import { describe, it } from "vitest";
import request from "supertest";
import Category from "../../models/category.model";
import app from "../../app";

describe("GET /api/categories", () => {
  it("should fetch all categories sorted by newest first (createdAt: -1)", async () => {
    // 1. Arrange: Seed the in-memory database.
    // We await them sequentially so the second one is definitively "newer".
    await Category.create({
      name: "Electronics",
      slug: "electronics",
      imageUrl: "/images/electronics.jpg",
    });

    await Category.create({
      name: "Apparel",
      slug: "apparel",
      imageUrl: "/images/apparel.jpg",
    });

    // 2. Act: Hit the public endpoint
    const response = await request(app).get("/api/categories");

    // 3. Assert: Verify status and data structure
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    // 4. Assert: Verify the Sorting Logic
    // Because 'Apparel' was created last, it should be the first item in the array
    expect(response.body[0].name).toBe("Apparel");
    expect(response.body[1].name).toBe("Electronics");
  });

  it("should return a 200 and an empty array if no categories exist", async () => {
    // 1. Arrange: Do nothing (database is already cleared by afterEach)

    // 2. Act
    const response = await request(app).get("/api/categories");

    // 3. Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return a 500 status if the database query fails", async () => {
    // 1. Arrange: Use Vitest's `vi.spyOn` to intercept the Mongoose `find` method
    // and force it to throw an error, simulating a database crash.
    vi.spyOn(Category, "find").mockImplementationOnce(() => {
      throw new Error("Simulated MongoDB failure");
    });

    // 2. Act
    const response = await request(app).get("/api/categories");

    // 3. Assert: Verify your controller's catch block works
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Server error");
    expect(response.body).toHaveProperty("error", "Simulated MongoDB failure");
  });
});
