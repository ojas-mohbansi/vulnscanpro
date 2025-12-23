import React from 'react';
import { GamificationService } from '../lib/services/gamification';
import * as Icons from 'lucide-react';

const BadgesPanel: React.FC = () => {
  const stats = GamificationService.getStats();
  const allBadges = GamificationService.getBadges();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg mb-6">
       <div className="flex items-center justify-between mb-4">
         <h2 className="text-slate-400 text-sm uppercase tracking-wider font-semibold">Learning Progress</h2>
         <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
            Level {stats.level} • {stats.xp} XP
         </div>
       </div>

       <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
         {allBadges.map((badge) => {
           const isUnlocked = stats.badges.includes(badge.id);
           const Icon = (Icons as any)[badge.icon] || Icons.Award;
           
           return (
             <div key={badge.id} className="group relative flex flex-col items-center gap-2">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                 isUnlocked 
                   ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                   : 'bg-slate-800 border-slate-700 text-slate-600 grayscale opacity-60'
               }`}>
                 <Icon className="w-6 h-6" />
               </div>
               
               {/* Tooltip */}
               <div className="absolute bottom-full mb-2 w-48 p-3 bg-slate-950 border border-slate-700 rounded-lg text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                 <p className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{badge.name}</p>
                 <p className="text-xs text-slate-400">{badge.description}</p>
                 {!isUnlocked && <p className="text-[10px] text-primary mt-2 uppercase tracking-wider">Unlock: {badge.conditionDescription}</p>}
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
};

export default BadgesPanel;
