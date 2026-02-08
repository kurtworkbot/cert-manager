import { DnsProvider, DnsChallenge } from './types';

/**
 * Manual DNS Provider - for users who want to manually add TXT records
 * This provider doesn't actually modify DNS, but stores the challenge
 * for the user to manually add to their DNS provider.
 */
export class ManualProvider implements DnsProvider {
  name = 'manual';
  
  // Store pending challenges for retrieval
  private static pendingChallenges: Map<string, DnsChallenge> = new Map();

  async createRecord(challenge: DnsChallenge): Promise<void> {
    // Store the challenge for manual verification
    ManualProvider.pendingChallenges.set(challenge.domain, challenge);
    
    console.log('\n========================================');
    console.log('MANUAL DNS CHALLENGE REQUIRED');
    console.log('========================================');
    console.log(`Domain: ${challenge.domain}`);
    console.log(`Record Name: ${challenge.recordName}`);
    console.log(`Record Type: TXT`);
    console.log(`Record Value: ${challenge.recordValue}`);
    console.log('========================================');
    console.log('Please add this TXT record to your DNS provider.');
    console.log('The ACME server will verify this record.');
    console.log('========================================\n');
  }

  async deleteRecord(challenge: DnsChallenge): Promise<void> {
    ManualProvider.pendingChallenges.delete(challenge.domain);
    
    console.log('\n========================================');
    console.log('MANUAL DNS CLEANUP');
    console.log('========================================');
    console.log(`You can now remove the TXT record for:`);
    console.log(`Record Name: ${challenge.recordName}`);
    console.log('========================================\n');
  }

  /**
   * Get pending challenge for a domain (for API retrieval)
   */
  static getPendingChallenge(domain: string): DnsChallenge | undefined {
    return ManualProvider.pendingChallenges.get(domain);
  }

  /**
   * Get all pending challenges
   */
  static getAllPendingChallenges(): DnsChallenge[] {
    return Array.from(ManualProvider.pendingChallenges.values());
  }

  async verifyCredentials(): Promise<boolean> {
    // Manual mode always "works"
    return true;
  }
}
