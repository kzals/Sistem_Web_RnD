import sql from 'mssql';

function isIpAddress(value: string): boolean {
  const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/;
  return ipv4Pattern.test(value) || ipv6Pattern.test(value);
}

const dbServer = process.env.DB_SERVER || 'localhost';
const explicitTlsServerName = (process.env.DB_TLS_SERVER_NAME || '').trim();
const tlsServerName = explicitTlsServerName || (isIpAddress(dbServer) ? '' : dbServer);
const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000', 10);
const requestTimeout = parseInt(process.env.DB_REQUEST_TIMEOUT || '15000', 10);
const cancelTimeout = parseInt(process.env.DB_CANCEL_TIMEOUT || '30000', 10);

const config: sql.config = {
  server: dbServer,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  connectionTimeout,
  requestTimeout,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    serverName: tlsServerName,
  },
};

// Some mssql drivers support a cancelTimeout option at runtime, but it's not
// present in the TypeScript `config` type. Assign it dynamically to avoid
// compile-time type errors while keeping the runtime behavior configurable.
(config as any).cancelTimeout = cancelTimeout;

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export { sql };
