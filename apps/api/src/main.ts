import path from 'node:path';
import { createCahootzHttpServer } from './server.ts';
import { BRAND_NAME } from '../../../packages/shared/src/index.ts';

const port = Number(process.env.PORT ?? 4100);
const dbPath = process.env.CAHOOTZ_DB_PATH ?? path.join(process.cwd(), 'cahootz-dev.sqlite');

const app = createCahootzHttpServer({ dbPath });

app.server.listen(port, '127.0.0.1', () => {
  console.log(
    JSON.stringify({
      status: 'listening',
      service: `${BRAND_NAME} Modular Monolith API + Web Server`,
      url: `http://127.0.0.1:${port}`,
      dbPath,
      pilotInstitutionId: app.pilotSeed.institutionId,
    })
  );
});
