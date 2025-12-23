import { EducationResource, Finding } from '../../types';
import { fallbackManager } from './fallbackManager';

// Comprehensive static library to ensure offline functionality
const OFFLINE_LIBRARY: EducationResource[] = [
  // OWASP
  {
    id: 'owasp-top-10',
    title: 'OWASP Top 10 - 2021',
    url: 'https://owasp.org/www-project-top-ten/',
    type: 'article',
    description: 'The standard awareness document for developers and web application security.',
    tags: ['general', 'owasp', 'standards'],
    source: 'OWASP'
  },
  {
    id: 'owasp-cheatsheets',
    title: 'OWASP Cheatsheet Series',
    url: 'https://cheatsheetseries.owasp.org/',
    type: 'cheatsheet',
    description: 'Concise, actionable security guides for developers.',
    tags: ['general', 'best-practices', 'code'],
    source: 'OWASP'
  },
  {
    id: 'owasp-xss',
    title: 'Cross Site Scripting (XSS) Prevention',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
    type: 'cheatsheet',
    description: 'Defenses against XSS including output encoding and HTML sanitization.',
    tags: ['xss', 'injection', 'frontend'],
    source: 'OWASP'
  },
  // MDN
  {
    id: 'mdn-csp',
    title: 'Content Security Policy (CSP)',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
    type: 'docs',
    description: 'Comprehensive guide to configuring CSP headers to mitigate XSS.',
    tags: ['headers', 'csp', 'xss'],
    source: 'MDN'
  },
  {
    id: 'mdn-security',
    title: 'Web Security',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Security',
    type: 'docs',
    description: 'Overview of web security technologies and threat models.',
    tags: ['general', 'browsers'],
    source: 'MDN'
  },
  // Frameworks
  {
    id: 'react-security',
    title: 'React Security Best Practices',
    url: 'https://react.dev/learn/security-risks',
    type: 'docs',
    description: 'Official guide on handling data safely in React applications.',
    tags: ['react', 'framework'],
    source: 'React Docs'
  },
  {
    id: 'django-security',
    title: 'Security in Django',
    url: 'https://docs.djangoproject.com/en/stable/topics/security/',
    type: 'docs',
    description: 'Built-in security features of Django: CSRF, XSS, SQLi protection.',
    tags: ['django', 'backend', 'python'],
    source: 'Django Docs'
  },
  {
    id: 'flask-security',
    title: 'Security Considerations in Flask',
    url: 'https://flask.palletsprojects.com/en/latest/security/',
    type: 'docs',
    description: 'Hardening Flask apps against common vulnerabilities.',
    tags: ['flask', 'backend', 'python'],
    source: 'Flask Docs'
  }
];

export class EducationService {
  
  /**
   * Returns a curated list of resources for a specific finding.
   */
  static getRelatedResources(finding: Finding): EducationResource[] {
    // 1. Keyword matching
    const keywords = [
      finding.module,
      ...finding.title.toLowerCase().split(' '),
      ...finding.description.toLowerCase().split(' ')
    ].filter(k => k.length > 3); // Filter small words

    const matches = OFFLINE_LIBRARY.filter(res => {
      // Check resource tags against keywords
      return res.tags.some(tag => keywords.some(k => k.includes(tag))) ||
             keywords.some(k => res.title.toLowerCase().includes(k));
    });

    // 2. Always include framework specific docs if module matches
    if (finding.module === 'react') {
      const r = OFFLINE_LIBRARY.find(x => x.id === 'react-security');
      if (r && !matches.includes(r)) matches.unshift(r);
    }
    if (finding.module === 'django') {
      const r = OFFLINE_LIBRARY.find(x => x.id === 'django-security');
      if (r && !matches.includes(r)) matches.unshift(r);
    }
    if (finding.module === 'flask') {
      const r = OFFLINE_LIBRARY.find(x => x.id === 'flask-security');
      if (r && !matches.includes(r)) matches.unshift(r);
    }

    // 3. Fallback to general if empty
    if (matches.length === 0) {
      return OFFLINE_LIBRARY.filter(r => r.tags.includes('general')).slice(0, 3);
    }

    return matches.slice(0, 5); // Limit to top 5
  }

  /**
   * Fetches the full library, attempting to update from external feeds.
   */
  static async getAllResources(): Promise<EducationResource[]> {
    // Primary + 25 Fallbacks for "Dynamic Tutorial Feed"
    const feedEndpoints = [
      'https://raw.githubusercontent.com/VulnScanPro/edu/main/tutorials.json', // Primary
      'https://cdn.jsdelivr.net/gh/VulnScanPro/edu@main/tutorials.json',
      'https://unpkg.com/@vulnscan/edu/tutorials.json',
      'https://vulnscan-edu.netlify.app/tutorials.json',
      'https://vulnscan-edu.vercel.app/api/tutorials',
      'https://vulnscan-edu.surge.sh/tutorials.json',
      'https://vulnscan-edu.onrender.com/tutorials.json',
      'https://vulnscan-edu.up.railway.app/tutorials.json',
      'https://vulnscan-edu.fly.dev/tutorials.json',
      'https://vulnscan-edu.glitch.me/tutorials.json',
      'https://vulnscan-edu.herokuapp.com/tutorials.json',
      'https://vulnscan-demo.web.app/tutorials.json',
      'https://vulnscan-demo.supabase.co/storage/v1/object/public/edu/tutorials.json',
      'https://run.mocky.io/v3/edu-feed-placeholder',
      'https://vulnscan.beeceptor.com/edu',
      'https://httpbin.org/anything/edu.json', // Reflection mock
      'https://jsonplaceholder.typicode.com/posts?tag=security',
      'https://reqres.in/api/tutorials',
      'https://ipfs.io/ipfs/QmHashEdu',
      'https://worker.cloudflare.com/edu',
      'https://gist.githubusercontent.com/vulnscan/raw/edu.json',
      'https://pastebin.com/raw/edu-feed',
      'https://docs.google.com/spreadsheets/d/edu/pub?output=json',
      'https://codeberg.org/vulnscan/edu/raw/branch/main/tutorials.json',
      'https://gitlab.com/vulnscan/edu/-/raw/main/tutorials.json'
    ];

    try {
      const result = await fallbackManager.fetchWithFallback<EducationResource[]>(
        feedEndpoints,
        (data) => Array.isArray(data) && data.length > 0 && !!data[0].title,
        { timeout: 3000 }
      );

      if (result.data) {
        // Merge unique external resources with offline library
        const ids = new Set(OFFLINE_LIBRARY.map(r => r.id));
        const newResources = result.data.filter(r => !ids.has(r.id));
        return [...OFFLINE_LIBRARY, ...newResources];
      }
    } catch (e) {
      // console.warn("Failed to fetch external education feed, using offline pack.");
    }

    return OFFLINE_LIBRARY;
  }
}
