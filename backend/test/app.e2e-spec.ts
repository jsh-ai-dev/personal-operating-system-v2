import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";

import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/prisma/prisma.service";

describe("Health (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: async () => undefined,
      $disconnect: async () => undefined,
      $queryRaw: async () => [],
      calendarMemo: {
        count: async () => 0,
        findMany: async () => [],
        findUnique: async () => null,
        upsert: async () => ({}),
        update: async () => ({}),
        delete: async () => undefined,
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  it("/api/health (GET)", () => {
    return request(app.getHttpServer()).get("/api/health").expect(200).expect((res) => {
      expect(res.body.status).toBe("ok");
    });
  });

  it("/api/health/db (GET)", () => {
    return request(app.getHttpServer()).get("/api/health/db").expect(200).expect((res) => {
      expect(res.body.ok).toBe(true);
      expect(res.body.calendarMemoCount).toBe(0);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
