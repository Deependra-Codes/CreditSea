// env.ts validates at import, so anything importing it needs a valid environment.
// Runs before test modules are evaluated.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/lms-test";
process.env.JWT_SECRET ??= "test-secret-at-least-16-characters";
