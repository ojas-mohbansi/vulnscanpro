import { PreferencesService } from './preferences';
import { UserPreferences, Badge } from '../../types';

export const BADGES: Badge[] = [
  {
    id: 'first_scan',
    name: 'First Steps',
    description: 'Completed your first vulnerability scan.',
    icon: 'Footprints',
    xpReward: 50,
    conditionDescription: 'Run 1 scan'
  },
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Found your first High severity vulnerability.',
    icon: 'Bug',
    xpReward: 100,
    conditionDescription: 'Find a High/Critical issue'
  },
  {
    id: 'quiz_whiz',
    name: 'Quiz Whiz',
    description: 'Passed a security knowledge quiz.',
    icon: 'GraduationCap',
    xpReward: 75,
    conditionDescription: 'Pass a quiz'
  },
  {
    id: 'security_scholar',
    name: 'Security Scholar',
    description: 'Read the details of 5 findings.',
    icon: 'BookOpen',
    xpReward: 25,
    conditionDescription: 'View findings details'
  }
];

export class GamificationService {
  
  static awardXp(amount: number) {
    const prefs = PreferencesService.getPreferences();
    if (!prefs.learningMode) return;

    prefs.xp = (prefs.xp || 0) + amount;
    PreferencesService.savePreferences(prefs);
  }

  static unlockBadge(badgeId: string): Badge | null {
    const prefs = PreferencesService.getPreferences();
    if (!prefs.learningMode) return null;
    
    if (prefs.unlockedBadges.includes(badgeId)) return null; // Already unlocked

    const badge = BADGES.find(b => b.id === badgeId);
    if (badge) {
      prefs.unlockedBadges.push(badgeId);
      prefs.xp += badge.xpReward;
      PreferencesService.savePreferences(prefs);
      return badge;
    }
    return null;
  }

  static getStats() {
    const prefs = PreferencesService.getPreferences();
    return {
      xp: prefs.xp || 0,
      badges: prefs.unlockedBadges || [],
      level: Math.floor((prefs.xp || 0) / 100) + 1
    };
  }
  
  static getBadges() {
      return BADGES;
  }
}
