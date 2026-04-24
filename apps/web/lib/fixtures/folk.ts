// Merged memberships + audience fixture. A folk roll — everyone in the
// realm, paying or not, plus the headline counts a keeper reads before
// opening the list.

export type FolkRole = 'scribe' | 'keeper' | 'wanderer';

export type FolkMember = {
  readonly id: string;
  readonly name: string;
  readonly seal: string; // single-letter avatar initial
  readonly role: FolkRole;
  readonly enrolmentCount: number;
  readonly xp: number;
  readonly level: number;
  readonly streakDays: number;
  readonly lastSeen: string;
  readonly note?: string; // Caveat-hand aside rendered next to the row
};

export type FolkData = {
  readonly totalPaying: number;
  readonly totalFolk: number;
  readonly newThisWeek: number;
  readonly churnRisk: number; // count of folk unseen > 14 days
  readonly members: readonly FolkMember[];
};

export const FOLK_FIXTURE: FolkData = {
  totalPaying: 47,
  totalFolk: 312,
  newThisWeek: 9,
  churnRisk: 4,
  members: [
    {
      id: 'f1',
      name: 'Mira Blackthorn',
      seal: 'M',
      role: 'scribe',
      enrolmentCount: 4,
      xp: 860,
      level: 4,
      streakDays: 23,
      lastSeen: '4 min ago',
      note: '~ signed Forge Basics today ~',
    },
    {
      id: 'f2',
      name: 'Theo Marrow',
      seal: 'T',
      role: 'scribe',
      enrolmentCount: 7,
      xp: 1840,
      level: 5,
      streakDays: 61,
      lastSeen: '18 min ago',
    },
    {
      id: 'f3',
      name: 'Cressida Vale',
      seal: 'C',
      role: 'keeper',
      enrolmentCount: 2,
      xp: 340,
      level: 3,
      streakDays: 7,
      lastSeen: '2 hr ago',
      note: '~ moderating the tavern ~',
    },
    {
      id: 'f4',
      name: 'Wren Ashford',
      seal: 'W',
      role: 'scribe',
      enrolmentCount: 5,
      xp: 720,
      level: 4,
      streakDays: 14,
      lastSeen: '3 hr ago',
    },
    {
      id: 'f5',
      name: 'Oren Fallow',
      seal: 'O',
      role: 'wanderer',
      enrolmentCount: 1,
      xp: 110,
      level: 2,
      streakDays: 2,
      lastSeen: '5 hr ago',
    },
    {
      id: 'f6',
      name: 'Juno Astor',
      seal: 'J',
      role: 'scribe',
      enrolmentCount: 3,
      xp: 520,
      level: 3,
      streakDays: 9,
      lastSeen: 'yesterday',
    },
    {
      id: 'f7',
      name: 'Silas Rook',
      seal: 'S',
      role: 'wanderer',
      enrolmentCount: 0,
      xp: 40,
      level: 1,
      streakDays: 0,
      lastSeen: 'yesterday',
      note: '~ browsed, has not enrolled ~',
    },
    {
      id: 'f8',
      name: 'Hazel Cairn',
      seal: 'H',
      role: 'scribe',
      enrolmentCount: 6,
      xp: 1480,
      level: 5,
      streakDays: 42,
      lastSeen: '2 days ago',
    },
    {
      id: 'f9',
      name: 'Briar Shaw',
      seal: 'B',
      role: 'scribe',
      enrolmentCount: 2,
      xp: 280,
      level: 3,
      streakDays: 0,
      lastSeen: '3 days ago',
    },
    {
      id: 'f10',
      name: 'Eulalia Hart',
      seal: 'E',
      role: 'scribe',
      enrolmentCount: 4,
      xp: 960,
      level: 4,
      streakDays: 0,
      lastSeen: '6 days ago',
    },
    {
      id: 'f11',
      name: 'Rowan Gile',
      seal: 'R',
      role: 'wanderer',
      enrolmentCount: 1,
      xp: 120,
      level: 2,
      streakDays: 0,
      lastSeen: '2 weeks ago',
      note: '~ gone quiet ~',
    },
    {
      id: 'f12',
      name: 'Nell Arden',
      seal: 'N',
      role: 'wanderer',
      enrolmentCount: 0,
      xp: 0,
      level: 1,
      streakDays: 0,
      lastSeen: '3 weeks ago',
      note: '~ gone quiet ~',
    },
  ],
};
