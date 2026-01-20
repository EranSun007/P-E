/**
 * Anonymization utilities for presentation mode
 * These functions transform sensitive data into anonymized versions
 */

/**
 * Anonymize a person's name to a generic label
 * @param {string} name - Original name
 * @param {number} index - Index for consistent numbering
 * @param {string} prefix - Label prefix (e.g., "Team Member", "Stakeholder")
 * @returns {string} Anonymized name
 */
export const anonymizeName = (name, index, prefix = 'Person') => {
  if (!name) return `${prefix} ${index + 1}`;
  return `${prefix} ${index + 1}`;
};

/**
 * Anonymize an email address
 * @param {string} email - Original email
 * @returns {string} Masked email or empty string
 */
export const anonymizeEmail = (email) => {
  if (!email) return '';
  return '●●●●●@●●●●●.com';
};

/**
 * Anonymize a phone number
 * @param {string} phone - Original phone
 * @returns {string} Masked phone or empty string
 */
export const anonymizePhone = (phone) => {
  if (!phone) return '';
  return '●●● ●●● ●●●●';
};

/**
 * Anonymize notes or personal text
 * @param {string} notes - Original notes
 * @returns {string} Placeholder text
 */
export const anonymizeNotes = (notes) => {
  if (!notes) return '';
  return '[Private notes hidden]';
};

/**
 * Anonymize contact info
 * @param {string} contactInfo - Original contact info
 * @returns {string} Placeholder text
 */
export const anonymizeContactInfo = (contactInfo) => {
  if (!contactInfo) return '';
  return '[Contact info hidden]';
};

/**
 * Get initials from an anonymized name
 * @param {number} index - Index for the person
 * @param {string} prefix - Label prefix
 * @returns {string} Initials (e.g., "P1", "TM1", "S1")
 */
export const getAnonymizedInitials = (index, prefix = 'P') => {
  const prefixInitial = prefix.split(' ').map(w => w[0]).join('').toUpperCase();
  return `${prefixInitial}${index + 1}`;
};

/**
 * Anonymize a team member object
 * @param {object} member - Original team member
 * @param {number} index - Index for consistent numbering
 * @returns {object} Anonymized member object
 */
export const anonymizeTeamMember = (member, index) => {
  if (!member) return member;
  return {
    ...member,
    name: anonymizeName(member.name, index, 'Team Member'),
    email: anonymizeEmail(member.email),
    phone: anonymizePhone(member.phone),
    notes: anonymizeNotes(member.notes),
    leave_title: member.leave_title ? '[Leave]' : null,
    avatar: null // Hide custom avatars
  };
};

/**
 * Anonymize a stakeholder object
 * @param {object} stakeholder - Original stakeholder
 * @param {number} index - Index for consistent numbering
 * @returns {object} Anonymized stakeholder object
 */
export const anonymizeStakeholder = (stakeholder, index) => {
  if (!stakeholder) return stakeholder;
  return {
    ...stakeholder,
    name: anonymizeName(stakeholder.name, index, 'Stakeholder'),
    email: anonymizeEmail(stakeholder.email),
    phone: anonymizePhone(stakeholder.phone),
    notes: anonymizeNotes(stakeholder.notes || stakeholder.description),
    contact_info: anonymizeContactInfo(stakeholder.contact_info),
    description: anonymizeNotes(stakeholder.description)
  };
};

/**
 * Anonymize one-on-one meeting notes
 * @param {object} meeting - Original meeting object
 * @returns {object} Anonymized meeting object
 */
export const anonymizeOneOnOne = (meeting) => {
  if (!meeting) return meeting;

  // Anonymize notes array
  const anonymizedNotes = Array.isArray(meeting.notes)
    ? meeting.notes.map(note => ({
        ...note,
        text: '[Note hidden]'
      }))
    : meeting.notes;

  // Anonymize action items descriptions
  const anonymizedActionItems = Array.isArray(meeting.action_items)
    ? meeting.action_items.map(item => ({
        ...item,
        description: '[Action item hidden]'
      }))
    : meeting.action_items;

  return {
    ...meeting,
    notes: anonymizedNotes,
    action_items: anonymizedActionItems
  };
};

/**
 * Create a name mapping for consistent anonymization across views
 * @param {Array} items - Array of items with names
 * @param {string} prefix - Label prefix
 * @returns {Map} Map of original names to anonymized names
 */
export const createNameMap = (items, prefix = 'Person') => {
  const map = new Map();
  if (!Array.isArray(items)) return map;

  items.forEach((item, index) => {
    if (item?.name) {
      map.set(item.name, anonymizeName(item.name, index, prefix));
    }
    if (item?.id) {
      map.set(item.id, index);
    }
  });

  return map;
};

/**
 * Get anonymized display name with consistent indexing
 * @param {string} name - Original name
 * @param {Array} allItems - Full list for consistent indexing
 * @param {string} prefix - Label prefix
 * @returns {string} Anonymized name
 */
export const getAnonymizedName = (name, allItems, prefix = 'Person') => {
  if (!name || !Array.isArray(allItems)) return `${prefix} ?`;
  const index = allItems.findIndex(item => item?.name === name);
  if (index === -1) return `${prefix} ?`;
  return anonymizeName(name, index, prefix);
};
