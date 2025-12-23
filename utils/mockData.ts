import { Finding, Severity } from '../types';

export const generateMockFinding = (scanId: string, framework: string): Finding => {
  const isReact = framework === 'react' || framework === 'auto';
  const isFlask = framework === 'flask';
  
  const findingsPool: Partial<Finding>[] = [
    {
      title: 'Missing Content Security Policy',
      module: 'headers',
      severity: 'high',
      confidence: 0.95,
      description: 'The application is missing the Content-Security-Policy header, which helps prevent XSS attacks.',
      remediation: isReact 
        ? "Configure your server (e.g., Nginx, Express) to send the CSP header. For React SPAs:\n`Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random123';`"
        : "Set the CSP header in your response middleware.",
      reproSteps: 'curl -I https://target.com | grep -i Content-Security-Policy',
      refs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
    },
    {
      title: 'Unsafe Inline Scripts',
      module: 'react',
      severity: 'medium',
      confidence: 0.8,
      description: 'Detected use of inline scripts without a nonce, increasing vulnerability to XSS.',
      remediation: 'Move inline logic to external JS files or use a nonce generated on the server.',
      refs: ['https://react.dev/reference/react-dom/server/renderToPipeableStream'],
    },
    {
      title: 'Debug Mode Enabled',
      module: 'flask',
      severity: 'critical',
      confidence: 1.0,
      description: 'The Flask application appears to be running in debug mode, exposing interactive traceback.',
      remediation: "Ensure `FLASK_ENV` is set to 'production' and `debug=False` in `app.run()`.",
      evidence: { "server_header": "Werkzeug/2.0.1 Python/3.9.7" },
      refs: ['https://flask.palletsprojects.com/en/2.0.x/config/'],
    },
    {
      title: 'Insecure Cookie Configuration',
      module: 'cookies',
      severity: 'medium',
      confidence: 0.9,
      description: 'Session cookies are missing the `Secure` or `HttpOnly` flags.',
      remediation: isFlask 
        ? "Set `SESSION_COOKIE_SECURE = True` and `SESSION_COOKIE_HTTPONLY = True` in Flask config."
        : "Ensure cookies are created with `secure: true` and `httpOnly: true`.",
      refs: ['https://owasp.org/www-community/controls/SecureCookieAttribute'],
    },
    {
      title: 'Strict-Transport-Security Missing',
      module: 'tls',
      severity: 'low',
      confidence: 1.0,
      description: 'HSTS header not present. Users may be downgraded to HTTP.',
      remediation: "Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.",
      refs: ['https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html'],
    },
  ];

  const template = findingsPool[Math.floor(Math.random() * findingsPool.length)];
  
  return {
    id: `finding-${Math.random().toString(36).substr(2, 9)}`,
    scanId,
    module: template.module || 'general',
    title: template.title || 'Unknown Issue',
    severity: template.severity || 'low',
    confidence: template.confidence || 0.5,
    description: template.description || '',
    evidence: template.evidence || { snippet: "<html>...</html>" },
    remediation: template.remediation || '',
    reproSteps: template.reproSteps || 'Run scanner again to verify.',
    refs: template.refs || [],
    source: {
      api: 'VulnScanEngine_v1',
      latencyMs: Math.floor(Math.random() * 200),
    },
    createdAt: new Date().toISOString(),
  };
};
