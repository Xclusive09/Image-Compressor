import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request = require("supertest");
import sharp = require("sharp");
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";

async function createFixture() {
  return sharp({
    create: {
      width: 800,
      height: 800,
      channels: 3,
      background: { r: 160, g: 120, b: 90 }
    }
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

describe("Image compression endpoint", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/images/compress compresses multipart image uploads", async () => {
    const fixture = await createFixture();

    const response = await request(app.getHttpAdapter().getInstance())
      .post("/api/images/compress")
      .field("targetKb", "12")
      .field("mode", "balanced")
      .attach("image", fixture, {
        filename: "passport.jpg",
        contentType: "image/jpeg"
      })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    expect(response.body.success).toBe(true);
    expect(response.body.data.compressedSizeKb).toBeLessThanOrEqual(12);
    expect(response.body.data.base64).toEqual(
      expect.stringContaining("data:image/jpeg;base64,")
    );
  });
});
