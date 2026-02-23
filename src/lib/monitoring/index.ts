import tls from 'tls';
import { db } from '../db';
import { certificates, auditLogs } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Performs an SSL/TLS handshake with an external domain and extracts certificate info.
 */
export async function getRemoteCertificateInfo(domain: string, port = 443): Promise<{ expiry: Date; fingerprint: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      servername: domain,
      rejectUnauthorized: false, // We want to see the cert even if expired or self-signed for drift detection
    };

    const socket = tls.connect(port, domain, options, () => {
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || !Object.keys(cert).length) {
        return reject(new Error(`Could not retrieve certificate for ${domain}`));
      }

      resolve({
        expiry: new Date(cert.valid_to),
        fingerprint: cert.fingerprint256, // SHA256 fingerprint
      });
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error(`Handshake timeout for ${domain}`));
    });
  });
}

/**
 * Checks for drift between the serving certificate and the database record.
 * Logic:
 * 1. Logic to perform SSL/TLS handshake with an external domain.
 * 2. Extract cert info (expiry, fingerprint).
 * 3. Compare actual cert info with the record in the database.
 * 4. If a mismatch (drift) is detected, log it to audit_logs with a warning status.
 */
export async function performDriftDetection(certId: string) {
  const certRecord = await db.query.certificates.findFirst({
    where: eq(certificates.id, certId),
  });

  if (!certRecord) {
    throw new Error(`Certificate record not found: ${certId}`);
  }

  try {
    const remoteInfo = await getRemoteCertificateInfo(certRecord.domain);
    
    // Compare expiry (allow 1 minute difference for rounding issues)
    const expiryDrift = Math.abs(remoteInfo.expiry.getTime() - certRecord.expiresAt.getTime()) > 60000;
    
    // Compare fingerprint
    const fingerprintDrift = certRecord.fingerprint && remoteInfo.fingerprint !== certRecord.fingerprint;
    
    const driftDetected = expiryDrift || fingerprintDrift;
    
    if (driftDetected) {
      await db.insert(auditLogs).values({
        id: randomUUID(),
        event: 'monitoring_drift',
        details: {
          certId: certId,
          domain: certRecord.domain,
          expectedExpiry: certRecord.expiresAt.toISOString(),
          actualExpiry: remoteInfo.expiry.toISOString(),
          expectedFingerprint: certRecord.fingerprint,
          actualFingerprint: remoteInfo.fingerprint,
          status: 'warning'
        },
        timestamp: new Date()
      });
      return { drift: true, remoteInfo };
    }

    return { drift: false, remoteInfo };
  } catch (error: any) {
    console.error(`Drift detection failed for ${certRecord.domain}:`, error);
    
    // Log failure to reach domain as a warning as well?
    await db.insert(auditLogs).values({
        id: randomUUID(),
        event: 'monitoring_drift',
        details: {
          certId: certId,
          domain: certRecord.domain,
          error: error.message || String(error),
          status: 'warning'
        },
        timestamp: new Date()
      });
    throw error;
  }
}

/**
 * System Health Prober
 * Logic to check system health (DB connection, scheduler status).
 */
export async function checkSystemHealth() {
  const health: {
    status: 'healthy' | 'unhealthy';
    database: 'up' | 'down';
    scheduler: string;
    timestamp: string;
  } = {
    status: 'healthy',
    database: 'up',
    scheduler: 'unknown',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check DB by performing a simple query
    await db.select().from(certificates).limit(1);
  } catch (error) {
    health.database = 'down';
    health.status = 'unhealthy';
  }

  // Check Scheduler - look at the latest audit log for any activity
  try {
    const lastAudit = await db.query.auditLogs.findFirst({
        orderBy: (logs, { desc }) => [desc(logs.timestamp)],
    });
    
    if (lastAudit) {
        health.scheduler = `Last activity: ${lastAudit.event} at ${lastAudit.timestamp.toISOString()}`;
    } else {
        health.scheduler = 'No activity recorded yet';
    }
  } catch (error) {
    health.scheduler = 'Error checking scheduler status';
  }

  return health;
}
