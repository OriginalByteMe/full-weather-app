// Basic schema setup for Drizzle ORM
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Creating a minimal table to satisfy schema requirements
export const examples = pgTable("examples", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
