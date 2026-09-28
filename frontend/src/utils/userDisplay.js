import { TEAM_MEMBERS } from '../data/team';

/**
 * Returns localized citizen user display name based on current language mode.
 * Automatically maps known team members & email prefixes (e.g. suneetchugh -> सुनीत चुघ)
 * and falls back to localized citizen titles.
 */
export function getLocalizedUserName(user, isHindi = false) {
  if (!user) return isHindi ? 'नागरिक उपयोगकर्ता' : 'Citizen User';

  const rawName = typeof user === 'string' 
    ? user 
    : (user.fullName || user.displayName || (user.email ? user.email.split('@')[0] : ''));

  const emailLower = (user?.email || '').toLowerCase();
  const nameLower = (rawName || '').toLowerCase();

  if (isHindi) {
    // Check if name is already Devanagari
    if (/[\u0900-\u097F]/.test(rawName)) {
      return rawName;
    }

    // Check known team member mappings
    for (const member of TEAM_MEMBERS) {
      if (
        nameLower.includes(member.name.toLowerCase()) ||
        (member.id && emailLower.includes(member.id)) ||
        (member.id && nameLower.includes(member.id))
      ) {
        return member.nameHi;
      }
    }

    // Common fallbacks
    if (!rawName || nameLower === 'citizen user' || nameLower === 'citizen') {
      return 'नागरिक उपयोगकर्ता';
    }
  }

  return rawName || (isHindi ? 'नागरिक उपयोगकर्ता' : 'Citizen User');
}

/**
 * Returns user first name for greetings (e.g. dashboard "Welcome back, Suneet / सुनीत")
 */
export function getLocalizedUserFirstName(user, isHindi = false) {
  const fullName = getLocalizedUserName(user, isHindi);
  if (!fullName) return isHindi ? 'नागरिक' : 'Citizen';
  return fullName.split(' ')[0];
}
