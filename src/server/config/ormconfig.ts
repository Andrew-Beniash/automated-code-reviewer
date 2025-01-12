require('dotenv').config();

module.exports = {
    type: "postgres",
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    username: process.env.POSTGRES_USER || "code_reviewer_admin",
    password: process.env.POSTGRES_PASSWORD || "farisej11",
    database: process.env.POSTGRES_DB || "code_reviewer",
    synchronize: false,
    logging: process.env.NODE_ENV === "development",
    entities: ["src/server/entities/**/*.ts"],
    migrations: ["src/server/migrations/**/*.ts"],
    subscribers: ["src/server/subscribers/**/*.ts"],
    cli: {
        entitiesDir: "src/server/entities",
        migrationsDir: "src/server/migrations",
        subscribersDir: "src/server/subscribers"
    }
};