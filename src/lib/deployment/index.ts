import { DeploymentTarget, Certificate } from '../../db/schema';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface CertificateContent {
  cert: string;       // Full chain PEM
  privateKey: string; // Private key PEM
}

export interface DeploymentStrategy {
  deploy(target: DeploymentTarget, content: CertificateContent): Promise<void>;
}

export class FileExporterStrategy implements DeploymentStrategy {
  async deploy(target: DeploymentTarget, content: CertificateContent): Promise<void> {
    const config = target.config as { certPath: string; keyPath: string; mode?: number };
    
    if (!config.certPath || !config.keyPath) {
      throw new Error('FileExporter: certPath and keyPath are required in config');
    }

    // Ensure directories exist
    await fs.mkdir(path.dirname(config.certPath), { recursive: true });
    await fs.mkdir(path.dirname(config.keyPath), { recursive: true });

    // Write files
    await fs.writeFile(config.certPath, content.cert, { mode: config.mode || 0o644 });
    await fs.writeFile(config.keyPath, content.privateKey, { mode: config.mode || 0o600 });
    
    console.log(`[FileExporter] Wrote certificate to ${config.certPath} and key to ${config.keyPath}`);
  }
}

export class CommandRunnerStrategy implements DeploymentStrategy {
  async deploy(target: DeploymentTarget, content: CertificateContent): Promise<void> {
    const config = target.config as { command: string };
    
    if (!config.command) {
      throw new Error('CommandRunner: command is required in config');
    }

    console.log(`[CommandRunner] Executing: ${config.command}`);
    
    const { stdout, stderr } = await execAsync(config.command);
    
    if (stdout) console.log(`[CommandRunner] stdout: ${stdout}`);
    if (stderr) console.error(`[CommandRunner] stderr: ${stderr}`);
  }
}

export class WebhookStrategy implements DeploymentStrategy {
  async deploy(target: DeploymentTarget, content: CertificateContent): Promise<void> {
    const config = target.config as { url: string; method?: string; headers?: Record<string, string> };
    
    if (!config.url) {
      throw new Error('Webhook: url is required in config');
    }

    console.log(`[Webhook] Sending payload to ${config.url}`);
    
    await axios({
      method: config.method || 'POST',
      url: config.url,
      headers: config.headers || { 'Content-Type': 'application/json' },
      data: {
        certId: target.certId,
        domain: content.cert, // Sending full cert might be large/insecure depending on context, but useful for some hooks
        // Do not send private key by default unless explicitly safe?
        // Spec says "Send payload to external URL".
        // Use case: Load Balancer update. It needs the cert AND key usually.
        // Let's send both but be careful. 
        // If the receiving end is trusted, it's fine.
        certificate: content.cert,
        privateKey: content.privateKey,
      },
    });
    
    console.log(`[Webhook] Request successful`);
  }
}

export class DeploymentManager {
  private strategies: Record<string, DeploymentStrategy> = {
    file: new FileExporterStrategy(),
    command: new CommandRunnerStrategy(),
    webhook: new WebhookStrategy(),
  };

  async deploy(target: DeploymentTarget, content: CertificateContent): Promise<void> {
    const strategy = this.strategies[target.type];
    if (!strategy) {
      throw new Error(`Unknown deployment strategy: ${target.type}`);
    }
    
    await strategy.deploy(target, content);
  }
}
