
import { ScanResult, Finding, Severity, ScanBenchmark } from '../../types';
import { translationCache } from '../hooks/useI18n';
import { PreferencesService } from '../services/preferences';

export const generateFilename = (scanId: string, format: 'json' | 'html' | 'md' | 'csv') => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `vulnscan_${scanId}_${date}.${format}`;
};

const getSeverityColor = (s: Severity) => {
  switch (s) {
    case 'critical': return '#ef4444'; // red-500
    case 'high': return '#f97316'; // orange-500
    case 'medium': return '#eab308'; // yellow-500
    case 'low': return '#3b82f6'; // blue-500
    default: return '#64748b'; // slate-500
  }
};

const formatDuration = (ms: number) => {
  return ms > 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
};

// Helper to get localized string or fallback to english default key
const getTranslator = (lang: string) => {
  // Try to get from cache, fallback to en
  const dict = translationCache[lang] || translationCache['en'];
  return (key: string) => dict[key] || translationCache['en'][key] || key;
};

export class ReportGenerator {
  static json(scan: ScanResult): string {
    return JSON.stringify(scan, null, 2);
  }

  static csv(scan: ScanResult): string {
    const { findings, target, id, startTime } = scan;
    
    // Header Row
    const header = [
      'Scan ID',
      'Target',
      'Date',
      'Finding ID',
      'Title',
      'Severity',
      'Module',
      'Confidence',
      'Description',
      'Remediation',
      'Source API'
    ];

    // Data Rows
    const rows = findings.map(f => {
      return [
        id,
        target,
        startTime,
        f.id,
        f.title,
        f.severity,
        f.module,
        f.confidence.toFixed(2),
        f.description,
        f.remediation,
        f.source.api
      ].map(field => {
        // Escape quotes and wrap in quotes for CSV validity
        const stringField = String(field || '');
        return `"${stringField.replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [header.join(','), ...rows].join('\n');
  }

  static markdown(scan: ScanResult, language: string = 'en'): string {
    const t = getTranslator(language);
    const { target, id, startTime, stats, findings, compliance, benchmark } = scan;
    const date = new Date(startTime).toLocaleString();
    
    let md = `# ${t('report.title')}\n\n`;
    md += `**Target:** ${target}\n`;
    md += `**Scan ID:** ${id}\n`;
    md += `**Date:** ${date}\n`;
    md += `**Duration:** ${formatDuration(stats.durationMs)}\n\n`;

    // Benchmark Section
    if (benchmark) {
      md += `## Performance Benchmarks\n\n`;
      md += `| Metric | Value | Reference |\n|---|---|---|\n`;
      md += `| **Baseline Latency** | ${benchmark.baselineLatencyMs}ms | via ${benchmark.telemetrySource} |\n`;
      md += `| **Avg Request Latency** | ${benchmark.avgRequestLatencyMs}ms | (Internal) |\n`;
      md += `| **Throughput** | ${benchmark.requestsPerSecond} req/s | ${benchmark.totalRequests} total requests |\n`;
      md += `| **Fallback API Usage** | ${benchmark.fallbackUsagePercent}% | Reliability Metric |\n\n`;
    }

    md += `## ${t('report.exec_summary')}\n\n`;
    md += `| ${t('results.severity')} | Count |\n|---|---|\n`;
    md += `| 🔴 ${t('severity.critical')} | ${stats.critical} |\n`;
    md += `| 🟠 ${t('severity.high')} | ${stats.high} |\n`;
    md += `| 🟡 ${t('severity.medium')} | ${stats.medium} |\n`;
    md += `| 🔵 ${t('severity.low')} | ${stats.low} |\n\n`;

    if (compliance && compliance.length > 0) {
      md += `## Compliance Status\n\n`;
      compliance.forEach(comp => {
        const icon = comp.score === 100 ? '✅' : comp.score > 80 ? '⚠️' : '❌';
        md += `### ${icon} ${comp.name} (Score: ${comp.score}%)\n\n`;
        md += `| Control | Status | Findings |\n|---|---|---|\n`;
        comp.controls.forEach(ctrl => {
          const statusIcon = ctrl.status === 'pass' ? 'Pass' : ctrl.status === 'warning' ? 'Warning' : 'Fail';
          md += `| **${ctrl.code}**: ${ctrl.name} | ${statusIcon} | ${ctrl.relatedFindings.length} |\n`;
        });
        md += `\n`;
      });
    }

    md += `## ${t('report.detailed_findings')}\n\n`;

    if (findings.length === 0) {
      md += `*${t('report.no_findings')}*\n`;
    }

    // Sort by severity rank
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedFindings = [...findings].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    sortedFindings.forEach((f, idx) => {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '🔵';
      md += `### ${idx + 1}. ${icon} [${t(`severity.${f.severity}`)}] ${f.title}\n\n`;
      md += `**Module:** ${f.module} | **Confidence:** ${(f.confidence * 100).toFixed(0)}%\n\n`;
      md += `> ${f.description}\n\n`;
      
      md += `#### ${t('report.remediation')}\n\`\`\`bash\n${f.remediation}\n\`\`\`\n\n`;
      
      if (f.evidence) {
        md += `#### ${t('report.evidence')}\n\`\`\`json\n${JSON.stringify(f.evidence, null, 2)}\n\`\`\`\n\n`;
      }

      if (f.refs && f.refs.length > 0) {
        md += `#### ${t('report.references')}\n`;
        f.refs.forEach(r => md += `- <${r}>\n`);
        md += `\n`;
      }

      md += `_Provenance: ${f.source.api} (Latency: ${f.source.latencyMs}ms)_\n\n`;
      md += `---\n\n`;
    });

    md += `\n_${t('report.disclaimer')}_\n`;

    return md;
  }

  static html(scan: ScanResult, language: string = 'en'): string {
    const t = getTranslator(language);
    const { target, id, startTime, stats, findings, compliance, benchmark } = scan;
    const date = new Date(startTime).toLocaleString();
    
    // Sort findings
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedFindings = [...findings].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    let benchmarkHtml = '';
    if (benchmark) {
        // Simple SVG charts for benchmarks - kept simple for print compatibility
        const primaryUsage = 100 - benchmark.fallbackUsagePercent;
        
        benchmarkHtml = `
        <section class="mb-12 avoid-break">
          <h2 class="text-xl font-bold mb-4 border-l-4 border-slate-900 pl-3">Scan Performance & Telemetry</h2>
          <table class="w-full text-sm border-collapse mb-6">
             <thead>
               <tr class="bg-slate-100">
                 <th class="border p-2 text-left">Metric</th>
                 <th class="border p-2 text-left">Value</th>
                 <th class="border p-2 text-left">Context</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td class="border p-2 font-medium">Baseline Latency</td>
                 <td class="border p-2">${benchmark.baselineLatencyMs}ms</td>
                 <td class="border p-2 text-slate-500">Source: ${benchmark.telemetrySource}</td>
               </tr>
               <tr>
                 <td class="border p-2 font-medium">Avg Request Latency</td>
                 <td class="border p-2">${benchmark.avgRequestLatencyMs}ms</td>
                 <td class="border p-2 text-slate-500">Internal Measurement</td>
               </tr>
               <tr>
                 <td class="border p-2 font-medium">Reliability</td>
                 <td class="border p-2">${primaryUsage.toFixed(0)}% Primary API Success</td>
                 <td class="border p-2 text-slate-500">${benchmark.totalRequests} Total Requests</td>
               </tr>
             </tbody>
          </table>
        </section>
        `;
    }

    let complianceHtml = '';
    if (compliance && compliance.length > 0) {
      complianceHtml = `
        <section class="mb-12 avoid-break">
          <h2 class="text-xl font-bold mb-4 border-l-4 border-slate-900 pl-3">Compliance Overview</h2>
          <div class="space-y-6">
            ${compliance.map(comp => `
              <div class="bg-white rounded-lg border border-slate-200 p-6 compliance-card">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="font-bold text-lg">${comp.name} <span class="text-slate-500 font-normal">v${comp.version}</span></h3>
                  <span class="px-3 py-1 rounded-full font-bold border ${comp.score === 100 ? 'bg-green-100 text-green-700 border-green-200' : comp.score > 80 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}">
                    Score: ${comp.score}%
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  ${comp.controls.map(ctrl => `
                    <div class="flex items-center gap-2 p-2 rounded border ${ctrl.status === 'pass' ? 'bg-green-50 border-green-100' : ctrl.status === 'warning' ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}">
                      <span class="text-xs font-mono font-bold text-slate-700">${ctrl.code}</span>
                      <span class="text-xs text-slate-600 truncate flex-1">${ctrl.name}</span>
                      <span class="text-[10px] uppercase font-bold">${ctrl.status}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('report.title')} - ${target}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-body: 'Inter', sans-serif;
      --font-mono: 'Roboto Mono', monospace;
    }
    body { font-family: var(--font-body); color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    pre, code { font-family: var(--font-mono); }
    
    .severity-badge { text-transform: uppercase; font-weight: bold; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 9999px; border: 1px solid transparent; }
    
    /* Screen Styles */
    .screen-only { display: block; }
    .print-only { display: none; }

    /* Print Styles */
    @media print {
      @page {
        margin: 0.75in;
        size: auto;
      }
      
      body {
        font-family: var(--font-mono);
        font-size: 11pt;
        line-height: 1.4;
        background-color: #fff;
        color: #000;
      }

      .no-print, nav, footer.screen-footer, button { display: none !important; }
      .print-only { display: flex !important; }
      .screen-only { display: none !important; }
      .avoid-break { break-inside: avoid; page-break-inside: avoid; }
      .break-before { page-break-before: always; }

      /* Headers & Footers */
      .print-header {
        border-bottom: 2px solid #000;
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        justify-content: space-between;
        align-items: flex-end;
      }
      
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: 1px solid #ccc;
        padding-top: 0.5rem;
        font-size: 9pt;
        justify-content: space-between;
        background: #fff;
      }

      /* Typography Overrides */
      h1 { font-size: 20pt; font-weight: 700; margin-bottom: 0.5rem; }
      h2 { font-size: 16pt; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 0.25rem; margin-top: 2rem; page-break-after: avoid; }
      h3 { font-size: 14pt; font-weight: 700; margin-top: 1.5rem; page-break-after: avoid; }
      h4 { font-size: 11pt; font-weight: 700; margin-top: 1rem; }
      p { margin-bottom: 0.5rem; }

      /* High Contrast Severity Badges for B&W Print */
      .severity-badge {
        border: 1px solid #000 !important;
        color: #000 !important;
        background: #fff !important;
      }
      .badge-critical {
        background-image: repeating-linear-gradient(45deg, #ccc, #ccc 5px, #fff 5px, #fff 10px) !important;
      }
      .badge-high {
        background-color: #e5e5e5 !important;
      }
      .badge-medium {
        background-image: radial-gradient(#999 1px, transparent 1px) !important;
        background-size: 4px 4px !important;
      }
      .badge-low {
        border-style: dotted !important;
      }

      /* Layout Components */
      .finding-card {
        border: 1px solid #000;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: #fff;
        box-shadow: none;
      }
      
      .compliance-card {
        border: 1px solid #000;
        box-shadow: none;
      }

      /* Links */
      a { text-decoration: none; color: #000; font-weight: 500; }
      a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; font-weight: normal; font-style: italic; }

      /* Code Blocks */
      pre {
        border: 1px solid #999;
        background: #f5f5f5 !important;
        padding: 0.5rem;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 10pt;
      }
    }
  </style>
</head>
<body class="bg-gray-50 text-slate-900 p-8 print:p-0 max-w-5xl mx-auto">
  
  <!-- Print Header -->
  <div class="print-header print-only hidden">
    <div>
      <h1 class="text-2xl font-bold uppercase tracking-tight">Vulnerability Report</h1>
      <div class="text-sm font-mono mt-1">Scan ID: ${id}</div>
    </div>
    <div class="text-right text-xs font-mono">
      <div>${date}</div>
      <div>Target: ${target}</div>
    </div>
  </div>

  <!-- Screen Header -->
  <header class="border-b-2 border-slate-200 pb-6 mb-8 no-print">
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 mb-2">${t('report.title')}</h1>
        <p class="text-slate-500">Target: <span class="font-mono font-medium text-slate-700">${target}</span></p>
      </div>
      <div class="text-right text-sm text-slate-500">
        <p>Date: ${date}</p>
        <p>Scan ID: ${id}</p>
        <p>Duration: ${formatDuration(stats.durationMs)}</p>
      </div>
    </div>
  </header>

  <section class="mb-12 avoid-break">
    <h2 class="text-xl font-bold mb-4 border-l-4 border-slate-900 pl-3">${t('report.exec_summary')}</h2>
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center finding-card">
        <div class="text-2xl font-bold text-red-600 print:text-black">${stats.critical}</div>
        <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold print:text-black">${t('severity.critical')}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center finding-card">
        <div class="text-2xl font-bold text-orange-500 print:text-black">${stats.high}</div>
        <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold print:text-black">${t('severity.high')}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center finding-card">
        <div class="text-2xl font-bold text-yellow-500 print:text-black">${stats.medium}</div>
        <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold print:text-black">${t('severity.medium')}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center finding-card">
        <div class="text-2xl font-bold text-blue-500 print:text-black">${stats.low}</div>
        <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold print:text-black">${t('severity.low')}</div>
      </div>
    </div>
  </section>

  ${benchmarkHtml}

  ${complianceHtml}

  <section>
    <h2 class="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 break-before">${t('report.detailed_findings')}</h2>
    
    ${sortedFindings.length === 0 ? `<p class="text-slate-500 italic">${t('report.no_findings')}</p>` : ''}

    <div class="space-y-8">
      ${sortedFindings.map((f, i) => `
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden avoid-break finding-card">
          <div class="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 print:bg-transparent print:border-b-black">
            <div class="flex items-center gap-3">
              <span class="severity-badge badge-${f.severity}" style="background-color: ${getSeverityColor(f.severity)}15; color: ${getSeverityColor(f.severity)}; border-color: ${getSeverityColor(f.severity)}30;">
                ${t(`severity.${f.severity}`)}
              </span>
              <h3 class="font-bold text-lg text-slate-800 print:text-black">${f.title}</h3>
            </div>
            <span class="text-xs text-slate-400 font-mono print:text-slate-600">ID: ${f.id}</span>
          </div>
          
          <div class="p-6 space-y-6 print:p-4 print:space-y-4">
            <div>
              <p class="text-slate-700 leading-relaxed print:text-black">${f.description}</p>
              <div class="mt-2 flex items-center gap-4 text-xs text-slate-500 print:text-slate-600">
                <span class="font-semibold bg-slate-100 px-2 py-1 rounded print:border print:bg-white">Module: ${f.module}</span>
                <span>Confidence: ${(f.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2 print:text-black">
                <svg class="w-4 h-4 text-emerald-500 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ${t('report.remediation')}
              </h4>
              <div class="bg-slate-900 rounded-md p-4 overflow-x-auto print:bg-white print:border print:p-2">
                <pre class="text-sm text-emerald-400 font-mono whitespace-pre-wrap print:text-black print:text-xs">${f.remediation}</pre>
              </div>
            </div>

            ${f.evidence ? `
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-2 print:text-black">${t('report.evidence')}</h4>
              <div class="bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto print:bg-white print:p-2">
                <pre class="text-xs text-slate-600 font-mono print:text-black">${JSON.stringify(f.evidence, null, 2)}</pre>
              </div>
            </div>
            ` : ''}

            ${f.refs && f.refs.length > 0 ? `
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-2 print:text-black">${t('report.references')}</h4>
              <ul class="list-disc list-inside text-sm text-blue-600 space-y-1 print:text-black">
                ${f.refs.map(r => `<li><a href="${r}" target="_blank" class="hover:underline">${r}</a></li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono print:border-t-black print:text-slate-600">
              <span>Source: ${f.source.api}</span>
              ${f.source.fallbackUsed ? `<span>Fallback: ${f.source.fallbackUsed}</span>` : ''}
              <span>Latency: ${f.source.latencyMs}ms</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </section>

  <!-- Print Footer -->
  <div class="print-footer print-only hidden">
    <div>VulnScan Pro Report</div>
    <div>${t('report.generated_by')}</div>
  </div>

  <footer class="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 no-print">
    <p>${t('report.generated_by')} • ${date}</p>
    <p class="mt-1 opacity-75">${t('report.disclaimer')}</p>
  </footer>
</body>
</html>
    `;
  }
}
