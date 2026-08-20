import { getHealthStatus } from '../services/health.service.js';

export function getHealth(req, res) {
  const status = getHealthStatus();
  res.status(200).json({ data: status });
}
