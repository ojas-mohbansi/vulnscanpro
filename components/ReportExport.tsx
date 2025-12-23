
import React, { useState } from 'react';
import { Download, FileJson, FileCode, FileText, Loader2, Eye, X, Printer, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { ScanResult } from '../types';
import { ReportGenerator, generateFilename } from '../lib/utils/reportGenerator';
import { PreferencesService } from '../lib/services/preferences';

interface ReportExportProps {
  scan: ScanResult;
}

const ReportExport: React.FC<ReportExportProps> = ({ scan }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const prefs = PreferencesService.getPreferences();
  const currentLanguage = prefs.language;

  const handleDownload = async (format: 'json' | 'html' | 'md' | 'csv') => {
    setIsGenerating(true);
    setShowDropdown(false);
    const filename = generateFilename(scan.id, format);

    try {
      let content = '';
      let mimeType = '';

      switch (format) {
        case 'html':
          content = ReportGenerator.html(scan, currentLanguage);
          mimeType = 'text/html';
          break;
        case 'md':
          content = ReportGenerator.markdown(scan, currentLanguage);
          mimeType = 'text/markdown';
          break;
        case 'csv':
          content = ReportGenerator.csv(scan);
          mimeType = 'text/csv';
          break;
        case 'json':
        default:
          content = ReportGenerator.json(scan);
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (clientErr) {
      console.error('Report generation failed:', clientErr);
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    const html = ReportGenerator.html(scan, currentLanguage);
    setPreviewContent(html);
    setShowPreview(true);
  };

  const handlePrint = () => {
    const html = ReportGenerator.html(scan, currentLanguage);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            title="Preview Report"
        >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
        </button>

        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            title="Print or Save as PDF"
        >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">PDF / Print</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary.hover text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-1">
                  <button onClick={() => handleDownload('json')} className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <FileJson className="w-4 h-4 text-yellow-500" /> JSON Data
                  </button>
                  <button onClick={() => handleDownload('md')} className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <FileText className="w-4 h-4 text-blue-500" /> Markdown
                  </button>
                  <button onClick={() => handleDownload('html')} className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <FileCode className="w-4 h-4 text-orange-500" /> HTML Report
                  </button>
                  <button onClick={() => handleDownload('csv')} className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-lg flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-green-500" /> CSV Spreadsheet
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-10 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full h-full max-w-6xl rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
              <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
                 <div className="text-slate-800 font-bold flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-indigo-600" />
                    Report Preview
                 </div>
                 <div className="flex gap-3">
                    <button 
                      onClick={handlePrint}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                    >
                       <Printer className="w-4 h-4" /> Print / PDF
                    </button>
                    <button 
                      onClick={() => setShowPreview(false)}
                      className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                    >
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>
              <div className="flex-1 bg-white relative">
                 <iframe 
                   title="Report Preview"
                   srcDoc={previewContent}
                   className="w-full h-full border-0"
                   sandbox="allow-same-origin allow-scripts allow-modals" 
                 />
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default ReportExport;
