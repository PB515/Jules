import pg from 'pg';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
for (let attempt = 1; ; attempt++) {
  try {
    await client.connect();
    break;
  } catch (err) {
    if (attempt >= 3) throw err;
    console.log(`connect attempt ${attempt} failed (${err.message}), retrying...`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

const PROFESSOR_ID = 'bdd63c82-bec9-4333-afed-bf5946c19c20';
const GENERAL_CLUB_ID = '00000000-0000-0000-0000-000000000001';
const EXAMPLE_SURGE_ID = '476210d7-0a52-412a-a2b2-5d662ed06908';

const students = {
  volt: 'eb893147-d4c4-4e35-9885-65b0f5ffb0d0',
  amp: '7120d111-8c4c-4fdb-9814-4e3b8d348ebb',
  ohm: 'dffc86ec-2410-4837-872e-ea66447b332c',
  watt: '0390004b-d39e-47d0-80f4-ccf227b551a1',
  d23: 'c424f7bb-0dd8-4032-8752-3b66d07f311a',
  d26: '5fe310b8-4a6a-45ad-8451-db59f99f338e',
  d28: '3fb146fa-abe8-4fd9-ac13-67999607735d',
  d29: '0c68bac5-dab5-4926-a562-3d10f13aaadc',
  d30: '2fccba5e-cf52-4156-9a47-b5cbfca99588',
  d31: '11bae828-7060-4930-be82-41208cc8a5db',
  d32: '122aa0c1-9b25-40ca-871b-08fcd1ee7bae',
};

// ---- 1. Clubs (idempotent via slug unique constraint) ----
const clubDefs = [
  { name: 'Finance & Investment Club', slug: 'finance-investment', description: 'Markets, valuation, and case competitions for the finance-curious.' },
  { name: 'Marketing Society', slug: 'marketing-society', description: 'Brand strategy, campaigns, and consumer research.' },
  { name: 'Operations & Analytics Club', slug: 'operations-analytics', description: 'Supply chain, process design, and data-driven decision making.' },
  { name: 'Entrepreneurship Cell', slug: 'entrepreneurship-cell', description: 'Founder talks, pitch practice, and venture-building workshops.' },
];
const clubIds = {};
for (const c of clubDefs) {
  const res = await client.query(
    `insert into clubs (name, slug, description) values ($1, $2, $3)
     on conflict (slug) do update set name = excluded.name returning id`,
    [c.name, c.slug, c.description]
  );
  clubIds[c.slug] = res.rows[0].id;
}
console.log('Clubs ready.');

// ---- 2. Events (idempotent -- check by name first, since name isn't unique in schema) ----
async function upsertEventByName(name, insertFn) {
  const existing = await client.query('select id from events where name = $1', [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  return insertFn();
}

const pastEventDefs = [
  { key: 'orientation', name: 'Orientation Mixer', type: 'standard_meeting', club: GENERAL_CLUB_ID, daysAgo: 21, location: 'Auditorium A', joule: 10 },
  { key: 'stockpitch', name: 'Stock Pitch Workshop', type: 'expert_session', club: clubIds['finance-investment'], daysAgo: 14, location: 'Finance Lab', joule: 25 },
  { key: 'brandstrategy', name: 'Brand Strategy Bootcamp', type: 'standard_meeting', club: clubIds['marketing-society'], daysAgo: 10, location: 'Seminar Room 2', joule: 10 },
  { key: 'supplychain', name: 'Supply Chain Simulation', type: 'volunteer_task', club: clubIds['operations-analytics'], daysAgo: 8, location: 'Operations Lab', joule: 50 },
  { key: 'foundersfireside', name: "Founders' Fireside Chat", type: 'expert_session', club: clubIds['entrepreneurship-cell'], daysAgo: 5, location: 'Innovation Hub', joule: 25 },
  { key: 'casestudy', name: 'Case Study Sprint', type: 'standard_meeting', club: clubIds['finance-investment'], daysAgo: 2, location: 'Classroom 5', joule: 10 },
];
const eventIds = {};
for (const e of pastEventDefs) {
  eventIds[e.key] = await upsertEventByName(e.name, async () => {
    const res = await client.query(
      `insert into events (name, type, club_id, event_date, end_date, location, joule_value, created_by)
       values ($1, $2, $3, now() - ($4 || ' days')::interval, now() - ($4 || ' days')::interval + interval '2 hours', $5, $6, $7)
       returning id`,
      [e.name, e.type, e.club, e.daysAgo, e.location, e.joule, PROFESSOR_ID]
    );
    return res.rows[0].id;
  });
}
const test1 = await client.query(`select id, joule_value from events where name = 'Test_1'`);
eventIds.test1 = test1.rows[0].id;
const test1Joule = test1.rows[0].joule_value;

const upcomingEventDefs = [
  { key: 'roundtable', name: 'Leadership Roundtable', type: 'standard_meeting', club: clubIds['marketing-society'], daysAhead: 1, location: 'Seminar Room 1', joule: 10 },
  { key: 'investorpanel', name: 'Investor Panel Night', type: 'expert_session', club: clubIds['finance-investment'], daysAhead: 6, location: 'Finance Lab', joule: 25, formUrl: 'https://forms.gle/DEMO-investor-panel-rsvp' },
  { key: 'outreach', name: 'Community Outreach Day', type: 'volunteer_task', club: clubIds['operations-analytics'], daysAhead: 10, location: 'Community Hall, Block C', joule: 50 },
];
for (const e of upcomingEventDefs) {
  eventIds[e.key] = await upsertEventByName(e.name, async () => {
    const res = await client.query(
      `insert into events (name, type, club_id, event_date, end_date, location, joule_value, created_by, registration_form_url)
       values ($1, $2, $3, now() + ($4 || ' days')::interval, now() + ($4 || ' days')::interval + interval '2 hours', $5, $6, $7, $8)
       returning id`,
      [e.name, e.type, e.club, e.daysAhead, e.location, e.joule, PROFESSOR_ID, e.formUrl ?? null]
    );
    return res.rows[0].id;
  });
}
const test2 = await client.query(`select id from events where name = 'Test_2'`);
eventIds.test2 = test2.rows[0].id;
console.log('Events ready.');

// ---- 3. Attendance patterns (past events, oldest -> newest) ----
const pastOrder = ['orientation', 'stockpitch', 'brandstrategy', 'supplychain', 'foundersfireside', 'casestudy', 'test1'];
const pastJoule = { orientation: 10, stockpitch: 25, brandstrategy: 10, supplychain: 50, foundersfireside: 25, casestudy: 10, test1: test1Joule };

const patterns = {
  volt: [true, true, true, true, true, true, true],
  amp: [true, true, false, true, true, true, true],
  ohm: [true, false, true, true, false, true, true],
  watt: [true, true, true, true, true, true, true],
  d23: [false, false, false, true, true, true, true],
  d26: [true, true, true, true, true, false, true],
  d28: [true, true, false, false, true, true, true],
  d29: [true, true, true, false, true, true, true],
  d30: [false, false, false, false, false, false, false],
  d31: [true, true, true, true, true, true, false],
  d32: [true, false, true, false, true, false, true],
};

for (const [key, studentId] of Object.entries(students)) {
  if (key === 'd30') continue;
  const pattern = patterns[key];
  for (let i = 0; i < pastOrder.length; i++) {
    const eventKey = pastOrder[i];
    const attended = pattern[i];
    const eventId = eventIds[eventKey];
    // do UPDATE, not do NOTHING: Test_1/Test_2 pre-date this script and some
    // demo students already had a stale registration on them from earlier
    // real testing sessions (attended_at null) -- do-nothing silently kept
    // that stale value instead of applying the intended pattern here, which
    // is exactly the bug this comment is warning the next run away from.
    await client.query(
      `insert into event_registrations (event_id, student_id, registered_at, attended_at, location_at_registration)
       values ($1, $2, now() - interval '25 days', $3, 'n/a')
       on conflict (event_id, student_id) do update set attended_at = excluded.attended_at`,
      [eventId, studentId, attended ? new Date() : null]
    );
    if (attended) {
      await client.query(
        `insert into joule_transactions (student_id, event_id, amount, type)
         values ($1, $2, $3, 'event_scan')
         on conflict do nothing`,
        [studentId, eventId, pastJoule[eventKey]]
      );
    }
  }
}
console.log('Attendance + event_scan Joules inserted.');

// ---- 4. Upcoming registrations ----
const upcomingRegs = [
  { event: 'test2', studentsKeys: ['volt', 'amp', 'watt', 'd26', 'd29', 'd31'] },
  { event: 'roundtable', studentsKeys: ['volt', 'ohm', 'd23', 'd28', 'd32'] },
  { event: 'investorpanel', studentsKeys: ['amp', 'watt', 'd26', 'd29'] },
];
for (const { event, studentsKeys } of upcomingRegs) {
  for (const key of studentsKeys) {
    await client.query(
      `insert into event_registrations (event_id, student_id, registered_at, location_at_registration)
       values ($1, $2, now(), (select location from events where id = $1))
       on conflict (event_id, student_id) do nothing`,
      [eventIds[event], students[key]]
    );
  }
}
await client.query(
  `insert into event_registrations (event_id, student_id, registered_at, location_at_registration)
   values ($1, $2, now(), 'Community Hall, Block C')
   on conflict (event_id, student_id) do nothing`,
  [eventIds.outreach, students.d31]
);
await client.query(`update events set location = 'Convocation Hall, Block A' where id = $1`, [eventIds.outreach]);
console.log('Upcoming registrations + venue-change demo done.');

// ---- 5. Quiz-earned Joules ----
const quizExtras = {
  volt: { earned: 370, participation: 100 },
  amp: { earned: 200, participation: 15 },
  ohm: { earned: 0, participation: 30 },
  watt: { earned: 700, participation: 170 },
  d26: { earned: 465, participation: 100 },
  d28: { earned: 200, participation: 15 },
  d29: { earned: 420, participation: 100 },
  d31: { earned: 620, participation: 200 },
};
for (const [key, amounts] of Object.entries(quizExtras)) {
  const studentId = students[key];
  if (amounts.earned > 0) {
    await client.query(
      `insert into joule_transactions (student_id, surge_id, amount, type) values ($1, $2, $3, 'surge_earned') on conflict do nothing`,
      [studentId, EXAMPLE_SURGE_ID, amounts.earned]
    );
  }
  if (amounts.participation > 0) {
    await client.query(
      `insert into joule_transactions (student_id, surge_id, amount, type) values ($1, $2, $3, 'surge_participation') on conflict do nothing`,
      [studentId, EXAMPLE_SURGE_ID, amounts.participation]
    );
  }
}
const existingAdj = await client.query(
  `select 1 from joule_transactions where student_id = $1 and type = 'admin_manual_adjustment' and amount = 30`,
  [students.volt]
);
if (existingAdj.rows.length === 0) {
  await client.query(
    `insert into joule_transactions (student_id, amount, type, created_by_admin) values ($1, 30, 'admin_manual_adjustment', $2)`,
    [students.volt, PROFESSOR_ID]
  );
}
console.log('Quiz + manual adjustment Joules inserted.');

// ---- 6. Event Reports ----
const reportDefs = [
  {
    eventKey: 'stockpitch',
    coordinator: 'Ananya Rao',
    introduction:
      'The Finance & Investment Club hosted a hands-on stock pitch workshop to help members build real equity research and valuation skills ahead of the semester case competition.',
    objectives: ['Teach a repeatable stock-pitch framework', 'Practice valuation using comparable companies', 'Build confidence presenting an investment thesis'],
    highlights:
      'Members worked in pairs to pitch a real, publicly-traded company, defended their thesis against questions from senior members, and received structured feedback on both the analysis and the delivery.',
    outcomes: ['12 members completed a full pitch deck', '3 pitches selected for the upcoming case competition shortlist', 'Positive feedback from 100% of attendees on the post-event survey'],
    conclusion: "A strong turnout and genuinely competitive pitches made this one of the club's best-attended sessions this term; a follow-up workshop on DCF modeling is being planned.",
  },
  {
    eventKey: 'foundersfireside',
    coordinator: 'Rohan Mehta',
    introduction:
      'The Entrepreneurship Cell invited two program alumni who founded early-stage startups to share an honest account of their first two years post-graduation.',
    objectives: ['Expose students to real founder journeys', 'Demystify early fundraising and hiring decisions', 'Create informal mentorship connections'],
    highlights:
      'Both founders spoke candidly about failed early pivots before finding product-market fit, followed by an extended open Q&A that ran well past the scheduled time.',
    outcomes: ['40+ attendees, the largest Cell turnout this term', '6 students followed up for 1:1 mentorship conversations', 'One founder agreed to return next term as a judge for the pitch night'],
    conclusion: 'Feedback strongly favored more sessions in this format over a purely lecture-style expert session.',
  },
  {
    eventKey: 'casestudy',
    coordinator: 'Priya Nair',
    introduction: 'A timed case-study sprint giving members practice under real interview-style time pressure ahead of summer internship recruiting.',
    objectives: ['Simulate real case-interview time constraints', 'Build a structured problem-solving habit', 'Identify common structuring mistakes early'],
    highlights: 'Members were split into groups of three and given 45 minutes to structure and present a market-entry case, with peer scoring on structure, math, and communication.',
    outcomes: ['8 groups completed the full case', 'Peer-reviewed scorecards shared back with every participant', 'A repeat session was requested for next month'],
    conclusion: 'The timed format was well received and will likely become a recurring pre-recruiting-season fixture.',
  },
];
for (const r of reportDefs) {
  const existing = await client.query('select 1 from event_reports where event_id = $1', [eventIds[r.eventKey]]);
  if (existing.rows.length > 0) continue;
  const eventRow = await client.query('select name from events where id = $1', [eventIds[r.eventKey]]);
  await client.query(
    `insert into event_reports
       (title, event_id, uploaded_by, coordinator_name, introduction, objectives, event_highlights, outcomes, conclusion)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [eventRow.rows[0].name, eventIds[r.eventKey], PROFESSOR_ID, r.coordinator, r.introduction, r.objectives, r.highlights, r.outcomes, r.conclusion]
  );
}
console.log('Event Reports inserted.');

console.log('\nAll demo data in place.');

const activeSeason = await client.query(`select id from seasons where now() between start_date and end_date order by start_date desc limit 1`);
const leaderboard = await client.query('select * from public.season_leaderboard($1, 50, 0)', [activeSeason.rows[0].id]);
console.log('\nLeaderboard:');
console.table(leaderboard.rows.map((r) => ({ rank: r.rank, name: r.name, total: r.total_amount })));

await client.end();
