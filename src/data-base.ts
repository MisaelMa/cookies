import sqlite3 from 'sqlite3';

type NamedParams = { [key: string]: any };

class ORM {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
      } else {
        console.log('Connected to the database');
      }
    });
  }

  public async query<T = any>(sql: string, params: NamedParams = {}): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all<T>(sql, Object.values(params), (err, rows) => {
        if (err) {
          console.error('Error executing query', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

export default ORM;
