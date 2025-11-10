import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app";

describe("GET /api/status", () => {
  it("should return 200 and an online flag", async () => {
    const res = await request(app).get("/api/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("online");
    expect(typeof res.body.online).toBe("boolean");
  });
});
