import { PoolClient } from 'pg';
export declare function query<T>(sql: string, params?: unknown[]): Promise<T[]>;
export declare function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
export declare function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
//# sourceMappingURL=client.d.ts.map