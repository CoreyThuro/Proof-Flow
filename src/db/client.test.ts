const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
}));

process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

// eslint-disable-next-line import/first
import { query, queryOne } from './client';

describe('db client', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockEnd.mockResolvedValue(undefined);
  });

  describe('queryOne', () => {
    it('returns null when query returns no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await queryOne('SELECT 1');

      expect(result).toBeNull();
    });

    it('returns the first row when query returns rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'test' }] });

      const result = await queryOne<{ id: number; name: string }>('SELECT id, name FROM t');

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('throws when the underlying query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(queryOne('SELECT 1')).rejects.toThrow('connection refused');
    });
  });

  describe('query', () => {
    it('returns all rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      const results = await query<{ id: number }>('SELECT id FROM t');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1 });
    });

    it('throws when the underlying query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(query('SELECT 1')).rejects.toThrow('query failed');
    });
  });
});
