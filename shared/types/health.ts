// Contrat partagé pour GET /api/health — consommé côté server (handler) ET
// côté client (page d'accueil), pour éviter toute divergence de forme.
export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  database: {
    ok: boolean;
    latencyMs: number | null;
  };
  timestamp: string;
}
