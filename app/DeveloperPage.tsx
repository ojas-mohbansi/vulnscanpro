
import React, { useEffect, useState } from 'react';
import { Github, MapPin, Briefcase, Link as LinkIcon, Star, GitFork, Terminal, Shield, Code, ExternalLink, Loader2, Linkedin, Twitter, Lock, Cpu, Server, Activity, Database, Globe, Wifi } from 'lucide-react';
import { DeveloperService, DeveloperProfile, GithubRepo } from '../lib/services/developerService';

const DeveloperPage: React.FC = () => {
  const [profile, setProfile] = useState<DeveloperProfile>(DeveloperService.getProfile());
  const [projects, setProjects] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate network delay for "decoding" effect
      await new Promise(resolve => setTimeout(resolve, 800));
      const repos = await DeveloperService.getFeaturedProjects();
      setProjects(repos);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Cyber Overlay: Grid & Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none" />
      </div>
      
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10 space-y-12">
        
        {/* Header / Identity Chip */}
        <header className="flex flex-col items-center space-y-6 pt-12 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="relative group cursor-default">
             <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
             <div className="relative px-6 py-2 bg-slate-950 rounded-full border border-slate-800 flex items-center gap-3">
               <div className="flex gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse_3s_infinite]"></span>
                 <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-[pulse_3s_infinite_0.5s]"></span>
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse_3s_infinite_1s]"></span>
               </div>
               <span className="font-mono text-xs text-emerald-400 tracking-widest uppercase">System Architect // Level 5 Clearance</span>
             </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white relative">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500">
                {profile.name}
              </span>
              <div className="absolute -inset-x-20 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm"></div>
            </h1>
            <p className="text-blue-400/80 font-mono text-sm md:text-base max-w-lg mx-auto border-x border-blue-500/20 px-4">
              &lt; {profile.role} /&gt;
            </p>
          </div>
        </header>

        {/* Main Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Profile Bio & Stats */}
          <div className="lg:col-span-4 space-y-6 animate-in fade-in slide-in-from-left-8 duration-700 delay-200">
            {/* Avatar Hologram */}
            <div className="relative aspect-square w-full max-w-sm mx-auto lg:max-w-none group perspective-1000">
               <div className="absolute inset-4 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
               <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900/50 backdrop-blur-sm p-2 transform transition-transform duration-500 group-hover:scale-[1.02]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500 z-20"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500 z-20"></div>
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 pointer-events-none"></div>
                  
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700" 
                  />
                  
                  {/* Status Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                     <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-2">
                        <Activity className="w-3 h-3 animate-pulse" />
                        ONLINE
                     </div>
                     <Shield className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
                  </div>
               </div>
            </div>

            {/* Data Cards */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Terminal className="w-24 h-24 text-blue-500" />
               </div>
               
               <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-3 text-slate-300">
                     <div className="p-2 bg-slate-800 rounded-lg text-blue-400"><MapPin className="w-4 h-4" /></div>
                     <span className="font-mono text-sm">{profile.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                     <div className="p-2 bg-slate-800 rounded-lg text-emerald-400"><Briefcase className="w-4 h-4" /></div>
                     <span className="font-mono text-sm">{profile.company}</span>
                  </div>
                  
                  <div className="h-px bg-slate-800 my-4" />
                  
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {profile.bio}
                  </p>

                  <div className="flex gap-3 pt-2">
                    <a href={profile.socials.github} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-center text-sm font-bold transition-all border border-slate-700 hover:border-emerald-500/50 flex items-center justify-center gap-2 group/btn">
                       <Github className="w-4 h-4 group-hover/btn:text-emerald-400 transition-colors" /> GitHub
                    </a>
                    {profile.socials.linkedin && (
                      <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded text-center text-sm font-bold transition-all border border-blue-600/30 hover:border-blue-500 flex items-center justify-center gap-2">
                         <Linkedin className="w-4 h-4" /> Connect
                      </a>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Projects & Tech */}
          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
             
             {/* Tech Stack Ticker */}
             <div className="flex overflow-hidden bg-slate-900/30 border-y border-slate-800 py-3">
                <div className="flex gap-8 animate-[scroll_20s_linear_infinite] whitespace-nowrap px-4">
                   {['REACT', 'NEXT.JS', 'TYPESCRIPT', 'NODE.JS', 'PYTHON', 'FLASK', 'DJANGO', 'DOCKER', 'KUBERNETES', 'AWS', 'GRAPHQL', 'REDIS', 'POSTGRESQL', 'TAILWIND', 'THREE.JS'].map(tech => (
                      <span key={tech} className="text-slate-600 font-mono text-xs font-bold tracking-widest flex items-center gap-2">
                         <Cpu className="w-3 h-3 text-slate-700" /> {tech}
                      </span>
                   ))}
                   {['REACT', 'NEXT.JS', 'TYPESCRIPT', 'NODE.JS', 'PYTHON', 'FLASK', 'DJANGO', 'DOCKER'].map(tech => (
                      <span key={`dup-${tech}`} className="text-slate-600 font-mono text-xs font-bold tracking-widest flex items-center gap-2">
                         <Cpu className="w-3 h-3 text-slate-700" /> {tech}
                      </span>
                   ))}
                </div>
             </div>

             {/* Projects Grid Header */}
             <div className="flex items-end justify-between border-b border-slate-800 pb-2">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                   <Code className="w-6 h-6 text-emerald-500" />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Active Modules</span>
                </h3>
                <div className="font-mono text-xs text-slate-500">
                   {projects.length} REPOSITORIES LOADED
                </div>
             </div>

             {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[1,2,3,4].map(i => (
                      <div key={i} className="h-48 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {projects.map((repo, idx) => (
                      <a 
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank" 
                        rel="noreferrer"
                        className="group relative bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                         {/* Card Background Effect */}
                         <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.05)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-[position:-100%_0,0_0] group-hover:bg-[position:200%_0,0_0] transition-[background-position] duration-[1500ms]"></div>
                         
                         <div className="p-6 relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                               <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-emerald-500/30 transition-colors">
                                  {repo.language === 'Python' ? <Terminal className="w-5 h-5 text-blue-400" /> : 
                                   repo.language === 'TypeScript' ? <Code className="w-5 h-5 text-blue-400" /> :
                                   <Server className="w-5 h-5 text-slate-400" />}
                               </div>
                               <span className="font-mono text-[10px] text-emerald-500/80 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50 uppercase">
                                  {repo.language || 'Generic'}
                               </span>
                            </div>

                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors truncate font-mono">
                               {repo.name}
                            </h4>
                            <p className="text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">
                               {repo.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 border-t border-slate-800 pt-4">
                               <span className="flex items-center gap-1.5 group-hover:text-yellow-500 transition-colors">
                                  <Star className="w-3.5 h-3.5" /> {repo.stargazers_count}
                               </span>
                               <span className="flex items-center gap-1.5 group-hover:text-blue-400 transition-colors">
                                  <GitFork className="w-3.5 h-3.5" /> {repo.forks_count}
                               </span>
                               <span className="ml-auto flex items-center gap-1 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide font-bold">
                                  Access <ExternalLink className="w-3 h-3" />
                               </span>
                            </div>
                         </div>
                      </a>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Footer Terminal */}
        <div className="border-t border-slate-800 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
           <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-500 shadow-inner">
              <div className="flex gap-2 mb-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
              <div className="space-y-1">
                 <p><span className="text-emerald-500">root@vulnscan</span>:<span className="text-blue-500">~</span>$ initiating handshake protocol...</p>
                 <p><span className="text-emerald-500">root@vulnscan</span>:<span className="text-blue-500">~</span>$ connection established securely.</p>
                 <p className="animate-pulse"><span className="text-emerald-500">root@vulnscan</span>:<span className="text-blue-500">~</span>$ <span className="w-2 h-4 bg-slate-500 inline-block align-middle"></span></p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DeveloperPage;
