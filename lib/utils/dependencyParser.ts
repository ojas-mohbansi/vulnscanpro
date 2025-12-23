
import { Dependency } from '../../types';

export class DependencyParser {
  
  static parse(filename: string, content: string): Dependency[] {
    if (filename.endsWith('package.json')) {
      return this.parsePackageJson(content);
    }
    if (filename.endsWith('package-lock.json')) {
      return this.parsePackageLockJson(content);
    }
    if (filename.endsWith('requirements.txt')) {
      return this.parseRequirementsTxt(content);
    }
    if (filename.endsWith('pyproject.toml')) {
      return this.parsePyProjectToml(content);
    }
    return [];
  }

  private static parsePackageJson(content: string): Dependency[] {
    const deps: Dependency[] = [];
    try {
      const json = JSON.parse(content);
      const allDeps = { ...json.dependencies, ...json.devDependencies };
      
      for (const [name, version] of Object.entries(allDeps)) {
        const cleanVersion = (version as string).replace(/^[\^~>=<]+/, '');
        deps.push({
          name,
          version: cleanVersion,
          ecosystem: 'npm'
        });
      }
    } catch (e) {
      console.warn('Failed to parse package.json', e);
    }
    return deps;
  }

  private static parsePackageLockJson(content: string): Dependency[] {
    const deps: Dependency[] = [];
    try {
      const json = JSON.parse(content);
      // NPM v2/v3 structure: json.packages
      // NPM v1 structure: json.dependencies
      
      const packages = json.packages || json.dependencies;
      if (!packages) return [];

      for (const [key, val] of Object.entries(packages)) {
        const pkg = val as any;
        let name = key;
        
        // Handle "node_modules/package-name" format in v2/v3
        if (key.startsWith('node_modules/')) {
            name = key.replace('node_modules/', '');
        } else if (key === '') {
            continue; // Root package
        }

        if (pkg.version) {
            deps.push({
                name,
                version: pkg.version,
                ecosystem: 'npm'
            });
        }
      }
    } catch (e) {
        console.warn('Failed to parse package-lock.json', e);
    }
    return deps;
  }

  private static parseRequirementsTxt(content: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) continue;

      const match = clean.match(/^([a-zA-Z0-9\-_]+)[=<>!~]+([0-9a-zA-Z\.]+)/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2],
          ecosystem: 'PyPI'
        });
      } else if (clean.match(/^[a-zA-Z0-9\-_]+$/)) {
         deps.push({
            name: clean,
            version: 'latest', 
            ecosystem: 'PyPI'
         });
      }
    }
    return deps;
  }

  private static parsePyProjectToml(content: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = content.split('\n');
    let inDepSection = false;
    
    for (const line of lines) {
      const clean = line.trim();
      if (clean.startsWith('[tool.poetry.dependencies]') || clean.startsWith('[project.dependencies]')) {
        inDepSection = true;
        continue;
      }
      if (clean.startsWith('[')) {
        inDepSection = false;
        continue;
      }

      if (inDepSection && clean.includes('=')) {
        const parts = clean.split('=');
        const name = parts[0].trim();
        let version = parts[1].trim().replace(/['"]/g, '');
        if (version.startsWith('{')) continue; 
        version = version.replace(/^[\^~>=<]+/, '');

        if (name && version && name !== 'python') {
           deps.push({
             name,
             version,
             ecosystem: 'PyPI'
           });
        }
      }
    }
    return deps;
  }
}
