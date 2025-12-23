import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/apiClients';
import { ScanResult, Finding } from '../types';
import { ArrowLeft, AlertCircle, CheckCircle, MinusCircle, PlusCircle } from 'lucide-react';

type DiffType = 'new' | 'resolved' | 'persistent';

interface DiffFinding extends Finding {
  diffType: DiffType;
}

const DiffPage: React.FC = () => {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();
  const [scan1, setScan1] = useState<ScanResult | null>(null);
  const [scan2, setScan2] = useState<ScanResult | null>(null);
  const [diffFindings, setDiffFindings] = useState<DiffFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id1 || !id2) return;
    
    Promise.all([api.getScan(id1), api.getScan(id2)]).then(([s1, s2]) => {
      // Sort by date so s1 is older, s2 is newer
      if (new Date(s1.startTime) > new Date(s2.startTime)) {
        setScan1(s2);
        setScan2(s1);
        calculateDiff(s2, s1);
      } else {
        setScan1(s1);
        setScan2(s2);
        calculateDiff(s1, s2);
      }
      setLoading(false);
    });
  }, [id1, id2]);

  const calculateDiff = (oldScan: ScanResult, newScan: ScanResult) => {
    const diffs: DiffFinding[] = [];
    const oldMap = new Map(oldScan.findings.map(f => [f.title + f.module, f]));
    const newMap = new Map(newScan.findings.map(f => [f.title + f.module, f]));

    // Find New
    newScan.findings.forEach(f => {
      if (!oldMap.has(f.title + f.module)) {
        diffs.push({ ...f, diffType: 'new' });
      } else {
        diffs.push({ ...f, diffType: 'persistent' });
      }
    });

    // Find Resolved
    oldScan.findings.forEach(f => {
      if (!newMap.has(f.title + f.module)) {
        diffs.push({ ...f, diffType: 'resolved' });
      }
    });

    setDiffFindings(diffs);
  };

  const getDiffIcon = (type: DiffType) => {
    switch (type) {
      case 'new': return <PlusCircle className="w-5 h-5 text-red-500" />;
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'persistent': return <MinusCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Calculating differences...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link to="/history" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>

        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold">Scan Comparison</h1>
            <p className="text-slate-400 mt-1">Comparing {new Date(scan1!.startTime).toLocaleDateString()} vs {new Date(scan2!.startTime).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-4 text-sm">
             <div className="text-right">
               <div className="font-mono text-red-400">{diffFindings.filter(f => f.diffType === 'new').length} New</div>
               <div className="font-mono text-green-400">{diffFindings.filter(f => f.diffType === 'resolved').length} Resolved</div>
             </div>
          </div>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
               <tr>
                 <th className="px-6 py-3">Status</th>
                 <th className="px-6 py-3">Severity</th>
                 <th className="px-6 py-3">Finding</th>
                 <th className="px-6 py-3">Module</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {diffFindings.map((f, idx) => (
                <tr key={idx} className={f.diffType === 'new' ? 'bg-red-500/5' : f.diffType === 'resolved' ? 'bg-green-500/5' : ''}>
                  <td className="px-6 py-4 flex items-center gap-2 font-medium capitalize">
                    {getDiffIcon(f.diffType)}
                    {f.diffType}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs border ${
                      f.severity === 'critical' ? 'border-red-500/30 text-red-500' : 
                      f.severity === 'high' ? 'border-orange-500/30 text-orange-500' : 'border-slate-700 text-slate-400'
                    }`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-200">{f.title}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{f.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DiffPage;
