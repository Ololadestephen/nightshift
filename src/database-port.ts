import type { DatabaseSync, SQLInputValue } from "node:sqlite";

export type SqlValue = SQLInputValue;
export type Row = Record<string, unknown>;

export interface Statement {
  get(...args: SqlValue[]): Promise<Row | undefined>;
  all(...args: SqlValue[]): Promise<Row[]>;
  run(...args: SqlValue[]): Promise<{ changes: number | bigint }>;
}

export interface Database {
  readonly artifactStorage: "file" | "database";
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  transaction<T>(run: (database: Database) => Promise<T>): Promise<T>;
  close(): void;
}

/** Serializes local access so an awaited transaction cannot leak uncommitted state. */
export class LocalDatabase implements Database {
  readonly artifactStorage = "file" as const;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly native: DatabaseSync,
    private readonly bound = false,
  ) {}

  private schedule<T>(work: () => T | Promise<T>): Promise<T> {
    if (this.bound) return Promise.resolve().then(work);
    const result = this.tail.then(work);
    this.tail = result.catch(() => undefined);
    return result;
  }

  prepare(sql: string): Statement {
    return {
      get: (...args) => this.schedule(() => this.native.prepare(sql).get(...args)),
      all: (...args) => this.schedule(() => this.native.prepare(sql).all(...args)),
      run: (...args) => this.schedule(() => this.native.prepare(sql).run(...args)),
    };
  }

  exec(sql: string): Promise<void> {
    return this.schedule(() => this.native.exec(sql));
  }

  transaction<T>(run: (database: Database) => Promise<T>): Promise<T> {
    if (this.bound) throw new Error("Nested transactions are not supported.");
    return this.schedule(async () => {
      this.native.exec("BEGIN IMMEDIATE");
      try {
        const result = await run(new LocalDatabase(this.native, true));
        this.native.exec("COMMIT");
        return result;
      } catch (error) {
        this.native.exec("ROLLBACK");
        throw error;
      }
    });
  }

  close(): void {
    if (this.bound) throw new Error("Cannot close a transaction connection.");
    this.native.close();
  }
}
