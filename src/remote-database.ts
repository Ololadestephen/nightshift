import { createClient, type Client, type Transaction, type InValue } from "@libsql/client/web";
import type { Database, Row, SqlValue, Statement } from "./database-port.js";
import { SCHEMA } from "./db.js";

export class RemoteDatabase implements Database {
  readonly artifactStorage = "database" as const;

  constructor(
    private readonly client: Client,
    private readonly bound?: Transaction,
  ) {}

  prepare(sql: string): Statement {
    const execute = (args: SqlValue[]) =>
      (this.bound ?? this.client).execute({ sql, args: args as InValue[] });
    return {
      get: async (...args) => (await execute(args)).rows[0] as Row | undefined,
      all: async (...args) => (await execute(args)).rows as Row[],
      run: async (...args) => ({ changes: (await execute(args)).rowsAffected }),
    };
  }

  async exec(sql: string): Promise<void> {
    await (this.bound ?? this.client).executeMultiple(sql);
  }

  async transaction<T>(run: (database: Database) => Promise<T>): Promise<T> {
    if (this.bound) throw new Error("Nested transactions are not supported.");
    const transaction = await this.client.transaction("write");
    try {
      const result = await run(new RemoteDatabase(this.client, transaction));
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }

  close(): void {
    if (this.bound) throw new Error("Cannot close a transaction connection.");
    this.client.close();
  }
}

export async function openRemoteDatabase(env: NodeJS.ProcessEnv): Promise<Database> {
  const url = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  if (!url || !authToken || !/^libsql:\/\//.test(url)) {
    throw new Error("Hosted database configuration is missing or invalid.");
  }
  const database = new RemoteDatabase(createClient({ url, authToken }));
  try {
    // The marketplace provisions a dedicated empty database. Schema initialization is atomic.
    await database.transaction(async (connection) => {
      await connection.exec(
        "CREATE TABLE IF NOT EXISTS schema_meta (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)",
      );
      const existing = await connection
        .prepare("SELECT version FROM schema_meta WHERE id = 1")
        .get();
      if (existing && existing.version !== 2) throw new Error("Unsupported hosted schema version.");
      if (!existing) {
        await connection.exec(SCHEMA);
        await connection.prepare("INSERT INTO schema_meta (id, version) VALUES (1, 2)").run();
      }
    });
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
