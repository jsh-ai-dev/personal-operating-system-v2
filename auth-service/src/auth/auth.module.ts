import { Module } from "@nestjs/common";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { DemoAccountSeeder } from "./demo-account-seeder.service";
import { JwtRevocationService } from "./jwt-revocation.service";
import { JwtStrategy } from "./jwt.strategy";
import { resolveJwtSecret } from "./resolve-jwt-secret";

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = resolveJwtSecret(config);
        const expiresIn = (config.get<string>("JWT_EXPIRES_IN") ?? "7d") as NonNullable<
          JwtSignOptions["expiresIn"]
        >;
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DemoAccountSeeder, JwtRevocationService, JwtStrategy],
  exports: [AuthService, JwtModule, JwtRevocationService],
})
export class AuthModule {}
