/**
 * site.ts: brand & contact constants, set ONCE per site.
 *
 * Use when: anywhere you'd otherwise hardcode the business name, a phone number,
 * an email, or a social URL. Edit this file (and the tokens in globals.css) and
 * the whole site updates, closing the gap that forced a multi-file rebrand on Bugadi.
 *
 * This is the per-site 20%: replace every value below when you clone.
 */
export const site = {
  name: 'Synergy',
  legalName: 'Synergy, Adani University FMS/Infra Management MBA',
  tagline: 'Progress, together.',
  description:
    'Synergy is the shared engagement platform for every club across the program: Joules earned via QR check-in and Surge quizzes, standing tiers, and a permanent Catalyst Records archive, all under one shared points system.',

  // Read from env so dev/staging/prod need no code change; falls back to
  // localhost. TODO: set NEXT_PUBLIC_SITE_URL for real before launch.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  contact: {
    email: 'hello@yourcollege.edu', // TODO: real club contact
    phone: '+91 00000 00000',
    whatsapp: '910000000000',
    address: 'TBD, club/college address',
  },

  social: {
    instagram: '',
    linkedin: '',
    x: '',
  },

  // PLACEHOLDER, replace before launch (docs/project-spec.md §9, CLAUDE.md decision 10).
  // Configurable at runtime via institution_settings; this is only the seed/fallback.
  defaultAllowedEmailDomains: ['yourcollege.edu'],

  // PLACEHOLDER, replace with the club's real registrar calendar before the
  // first season launches (docs/project-spec.md §9, CLAUDE.md decision 9).
  defaultSeasonCalendar: {
    odd: { label: 'Odd/Monsoon', startMonthDay: '07-01', endMonthDay: '12-15' },
    even: { label: 'Even/Winter', startMonthDay: '12-16', endMonthDay: '05-31' },
  },
} as const;

export type Site = typeof site;
