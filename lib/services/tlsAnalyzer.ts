
import tls from 'tls';
import https from 'https';
import { Finding } from '../../types';

export class TlsAnalyzerService {
  static async analyze(target: string, scanId: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const start = Date.now();
    let url: URL;

    try {
      url = new URL(target);
      if (url.protocol !== 'https:') return [];
    } catch {
      return [];
    }

    try {
      const options = {
        host: url.hostname,
        port: url.port || 443,
        servername: url.hostname,
        rejectUnauthorized: false, // We want to inspect bad certs, not crash
        minVersion: 'TLSv1', // Allow checking old versions
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        
        // 1. Certificate Validity
        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();

        if (now > validTo) {
          findings.push({
            id: `tls-expired-${Date.now()}`,
            scanId,
            module: 'tls',
            title: 'SSL Certificate Expired',
            severity: 'critical',
            confidence: 1.0,
            description: `The certificate expired on ${validTo.toISOString()}. Users will see a security warning.`,
            evidence: { expiry: validTo.toISOString(), issuer: cert.issuer },
            remediation: 'Renew the SSL certificate immediately.',
            refs: ['https://letsencrypt.org/'],
            source: { api: 'NodeTLS', latencyMs: Date.now() - start },
            createdAt: new Date().toISOString()
          });
        } else if (now < validFrom) {
           findings.push({
            id: `tls-future-${Date.now()}`,
            scanId,
            module: 'tls',
            title: 'SSL Certificate Not Yet Valid',
            severity: 'high',
            confidence: 1.0,
            description: `The certificate is not valid until ${validFrom.toISOString()}.`,
            evidence: { validFrom: validFrom.toISOString() },
            remediation: 'Check the system clock on the server generating the certificate.',
            refs: [],
            source: { api: 'NodeTLS' },
            createdAt: new Date().toISOString()
          });
        }

        // 2. Issuer Checks (Self-Signed)
        // Heuristic: If issuer and subject are identical
        if (JSON.stringify(cert.issuer) === JSON.stringify(cert.subject) && !cert.issuerCN?.includes('Let\'s Encrypt')) {
           findings.push({
            id: `tls-selfsigned-${Date.now()}`,
            scanId,
            module: 'tls',
            title: 'Self-Signed Certificate Detected',
            severity: 'medium',
            confidence: 1.0,
            description: 'The certificate appears to be self-signed. This is acceptable for internal tools but not for public production sites.',
            evidence: { issuer: cert.issuer },
            remediation: 'Use a certificate from a trusted Certificate Authority (CA).',
            refs: [],
            source: { api: 'NodeTLS' },
            createdAt: new Date().toISOString()
          });
        }

        // 3. Protocol & Cipher Checks
        if (protocol === 'TLSv1' || protocol === 'TLSv1.1' || protocol === 'SSLv3') {
           findings.push({
            id: `tls-deprecated-${Date.now()}`,
            scanId,
            module: 'tls',
            title: `Deprecated Protocol Enabled: ${protocol}`,
            severity: 'high',
            confidence: 1.0,
            description: `${protocol} has known vulnerabilities and is deprecated. Modern browsers may block it.`,
            evidence: { protocol },
            remediation: 'Disable TLS 1.0 and 1.1 on your server. Enable TLS 1.2 and 1.3 only.',
            refs: ['https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final'],
            source: { api: 'NodeTLS' },
            createdAt: new Date().toISOString()
          });
        }

        if (cipher.name.includes('RC4') || cipher.name.includes('MD5') || cipher.name.includes('DES')) {
           findings.push({
            id: `tls-weakcipher-${Date.now()}`,
            scanId,
            module: 'tls',
            title: `Weak Cipher Suite: ${cipher.name}`,
            severity: 'high',
            confidence: 1.0,
            description: 'The server supports weak ciphers (RC4, MD5, or DES) which are vulnerable to attacks.',
            evidence: { cipher: cipher.name },
            remediation: 'Reconfigure the web server to disable weak ciphers. Use strong AES-GCM suites.',
            refs: ['https://wiki.mozilla.org/Security/Server_Side_TLS'],
            source: { api: 'NodeTLS' },
            createdAt: new Date().toISOString()
          });
        }

        socket.end();
      });

      socket.on('error', (err) => {
         // Connection failed implies issue, but generic
      });

      // Wait for socket to close or timeout
      await new Promise((resolve) => {
          socket.on('close', resolve);
          socket.on('error', resolve);
          setTimeout(() => { socket.destroy(); resolve(null); }, 5000);
      });

    } catch (e) {
      console.warn("TLS Analysis Error", e);
    }

    return findings;
  }
}
