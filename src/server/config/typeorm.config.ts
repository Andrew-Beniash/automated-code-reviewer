import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { CreateUserTable1704988800000 } from "../migrations/1704988800000-CreateUserTable";



// Define the data source
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [User],
  migrations: [CreateUserTable1704988800000],
  synchronize: false,
  logging: process.env.NODE_ENV === "development"
});