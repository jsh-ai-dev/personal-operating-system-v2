process.env.JWT_SECRET ??= "e2e-test-jwt-secret-min-32-chars-ok";
/** e2e 에서 Redis 없이 인메모리 스토리지 사용 */
process.env.REDIS_URL ??= "";
