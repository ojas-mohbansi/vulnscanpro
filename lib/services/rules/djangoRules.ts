import { Finding } from '../../../types';

export const analyzeDjango = async (scanId: string, url: string, html: string, headers: Headers): Promise<Finding[]> => {
  const findings: Finding[] = [];
  const start = Date.now();

  // 1. Django Admin Exposure
  try {
    const adminUrl = new URL('/admin/login/', url).toString();
    const res = await fetch(adminUrl);
    const adminHtml = await res.text();
    
    if (res.status === 200 && (adminHtml.includes('Django administration') || adminHtml.includes('id="id_username"'))) {
      findings.push({
        id: `django-admin-${Date.now()}`,
        scanId,
        module: 'django',
        title: 'Django Admin Interface Exposed',
        severity: 'medium',
        confidence: 1.0,
        description: 'The default Django Admin interface is exposed at `/admin/`. This is a high-value target for brute-force attacks.',
        evidence: { url: adminUrl },
        remediation: 'Change the admin URL in `urls.py` to something unpredictable (e.g., `path("secret-admin/", admin.site.urls)`), or restrict access via firewall/VPN.',
        refs: ['https://docs.djangoproject.com/en/stable/ref/contrib/admin/'],
        source: { api: 'DjangoHeuristics', latencyMs: Date.now() - start },
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) { /* ignore */ }

  // 2. ALLOWED_HOSTS Misconfiguration (Host Header Injection Probe)
  try {
    const spoofedHost = 'vulnscan-probe.com';
    const res = await fetch(url, {
      headers: { 'Host': spoofedHost }
    });
    
    // If Django is configured correctly, it typically returns 400 Bad Request for unknown hosts
    // If it returns 200 and serves content, it might be vulnerable.
    // NOTE: Some CDNs/Proxies might filter this before it hits Django, so this is a heuristic.
    if (res.status === 200) {
      // Check if the spoofed host is reflected in the response (e.g., in links)
      const text = await res.text();
      if (text.includes(spoofedHost)) {
         findings.push({
          id: `django-hosts-${Date.now()}`,
          scanId,
          module: 'django',
          title: 'Permissive ALLOWED_HOSTS',
          severity: 'high',
          confidence: 0.85,
          description: 'The application responded to a request with an arbitrary Host header and reflected it in the content. This indicates `ALLOWED_HOSTS` might be set to `[\'*\']`.',
          evidence: { spoofedHost, status: res.status },
          remediation: 'Set `ALLOWED_HOSTS` to a strict list of domain names in `settings.py`. Do not use `[\'*\']` in production.',
          refs: ['https://docs.djangoproject.com/en/stable/ref/settings/#allowed-hosts'],
          source: { api: 'DjangoHeuristics', latencyMs: Date.now() - start },
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (e) { /* ignore */ }

  // 3. CSRF Cookie Configuration
  // Django typically uses 'csrftoken' cookie
  const setCookie = headers.get('set-cookie');
  if (setCookie && setCookie.includes('csrftoken=')) {
     const cookies = setCookie.split(',').filter(c => c.trim().startsWith('csrftoken='));
     for (const cookie of cookies) {
       if (!cookie.toLowerCase().includes('secure')) {
          findings.push({
            id: `django-csrf-secure-${Date.now()}`,
            scanId,
            module: 'django',
            title: 'Insecure CSRF Cookie',
            severity: 'medium',
            confidence: 1.0,
            description: 'The `csrftoken` cookie is missing the `Secure` flag, allowing it to be intercepted over plain HTTP.',
            evidence: { cookie },
            remediation: 'Set `CSRF_COOKIE_SECURE = True` in `settings.py`.',
            refs: ['https://docs.djangoproject.com/en/stable/ref/settings/#csrf-cookie-secure'],
            source: { api: 'DjangoHeuristics', latencyMs: Date.now() - start },
            createdAt: new Date().toISOString()
          });
       }
     }
  }

  return findings;
};
