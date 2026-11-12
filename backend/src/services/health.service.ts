import { sequelize } from '../config/database.js';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected';
  timestamp: string;
}

export const checkHealth = async (): Promise<HealthCheckResult> => {
  await sequelize.authenticate();

  return {
    status: 'ok',
    db: 'connected',
    timestamp: new Date().toISOString(),
  };
};
