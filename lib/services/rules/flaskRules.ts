import { Finding } from '../../../types';

export const analyzeFlask = async (scanId: string, url: string, html: string, headers: Headers): Promise<Finding[]> => {
  const findings: Finding[] = [];
  const start = Date.now();

  // 1. Check for Werkzeug Debugger (Debug Mode)
  // Probe a non-existent page to trigger 404 and check for debug artifacts
  try {
    const errorUrl = new URL(`/scan-probe-404-${Date.now()}`, url).toString();
    const res = await fetch(errorUrl);
    const errorHtml = await res.text();
    
    if (errorHtml.includes('Werkzeug') || errorHtml.includes('Traceback (most recent call last)')) {
      findings.push({
        id: `flask-debug-${Date.now()}`,
        scanId,
        module: 'flask',
        title: 'Flask Debug Mode Enabled',
        severity: 'critical',
        confidence: 1.0,
        description: 'The application is running with `debug=True`, exposing the Werkzeug debugger. This allows arbitrary code execution via the interactive console.',
        evidence: { match: 'Werkzeug/Traceback found in 404 page' },
        remediation: 'Ensure `debug=False` in production. Set environment variable `FLASK_ENV=production` and do not use `app.run()` in production deployments (use Gunicorn/uWSGI).',
        refs: ['https://flask.palletsprojects.com/en/latest/config/#debug-mode'],
        source: { api: 'FlaskHeuristics', latencyMs: Date.now() - start },
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) { /* ignore */ }

  // 2. Session Cookie Security
  // Flask default session cookie is named 'session'
  const setCookie = headers.get('set-cookie');
  if (setCookie && setCookie.includes('session=')) {
    const cookies = setCookie.split(',').filter(c => c.trim().startsWith('session='));
    for (const cookie of cookies) {
      const missingFlags = [];
      if (!cookie.toLowerCase().includes('httponly')) missingFlags.push('HttpOnly');
      if (!cookie.toLowerCase().includes('secure')) missingFlags.push('Secure');
      if (!cookie.toLowerCase().includes('samesite')) missingFlags.push('SameSite');

      if (missingFlags.length > 0) {
        findings.push({
          id: `flask-cookie-${Date.now()}`,
          scanId,
          module: 'flask',
          title: 'Insecure Flask Session Cookie',
          severity: 'high',
          confidence: 1.0,
          description: `The Flask 'session' cookie is missing security flags: ${missingFlags.join(', ')}.`,
          evidence: { cookie },
          remediation: `Configure Flask settings:\n\`SESSION_COOKIE_HTTPONLY = True\`\n\`SESSION_COOKIE_SECURE = True\`\n\`SESSION_COOKIE_SAMESITE = 'Lax'\``,
          refs: ['https://flask.palletsprojects.com/en/latest/config/#SESSION_COOKIE_SECURE'],
          source: { api: 'FlaskHeuristics', latencyMs: Date.now() - start },
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // 3. CSRF Protection Check
  // If forms exist, check for hidden CSRF token inputs
  if (html.includes('<form')) {
    const hasCsrfToken = html.match(/name=["'](csrf_token|_csrf_token|csrfmiddlewaretoken)["']/i) || 
                         html.match(/id=["']csrf_token["']/i);
    
    if (!hasCsrfToken) {
      findings.push({
        id: `flask-csrf-${Date.now()}`,
        scanId,
        module: 'flask',
        title: 'Missing CSRF Token in Forms',
        severity: 'medium',
        confidence: 0.7, // Lower confidence as it might be an API-based form
        description: 'Detected HTML forms without a visible CSRF token field. Flask apps using templates require CSRF protection.',
        evidence: { snippet: 'Form found without csrf_token input' },
        remediation: 'Use `Flask-WTF` extension. In your forms, include `{{ form.csrf_token }}` or `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}"/>`.',
        refs: ['https://flask-wtf.readthedocs.io/en/stable/csrf.html'],
        source: { api: 'FlaskHeuristics', latencyMs: Date.now() - start },
        createdAt: new Date().toISOString()
      });
    }
  }

  return findings;
};
