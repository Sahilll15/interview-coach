import type { Setup } from './setup.ts';
import type { ShapedTurn } from './transcript.ts';

export type SampleRole = { id: string; label: string; setup: Setup };

export const SAMPLE_ROLES: SampleRole[] = [
  {
    id: 'frontend',
    label: 'Frontend engineer',
    setup: {
      roleTitle: 'Frontend engineer',
      level: 'mid',
      type: 'mixed',
      jobDescription: `Frontend Engineer, Checkout team.
We build the checkout and payments UI used by 4 million shoppers a month. You will own features end to end in React and TypeScript, work closely with design and backend engineers, and care about performance and accessibility.
What you will do:
- Ship checkout flows in React 19 and TypeScript with strong test coverage
- Improve Core Web Vitals on our highest traffic pages
- Build accessible components for our design system (WCAG 2.2 AA)
- Debug production issues with real user monitoring data
What we look for:
- 3+ years building production React apps
- Solid understanding of rendering, state management and browser performance
- Experience running A/B tests and reading the results
- Clear written communication and a habit of mentoring others`,
    },
  },
  {
    id: 'pm',
    label: 'Product manager',
    setup: {
      roleTitle: 'Product manager',
      level: 'senior',
      type: 'behavioral',
      jobDescription: `Senior Product Manager, Growth.
Own activation and retention for a B2B collaboration product with 40k paying teams.
Responsibilities:
- Set the growth roadmap with engineering, design and data science
- Define success metrics and run experiments on onboarding and pricing pages
- Talk to customers every week and turn what you learn into clear problem statements
- Make tradeoffs under ambiguity and explain them to leadership
Requirements:
- 5+ years of product management, at least 2 in growth or self serve SaaS
- Comfortable with SQL and experiment design
- A track record of shipping changes that moved a business metric
- Strong stakeholder management and written communication`,
    },
  },
  {
    id: 'data',
    label: 'Data analyst',
    setup: {
      roleTitle: 'Data analyst',
      level: 'junior',
      type: 'technical',
      jobDescription: `Data Analyst, Operations.
Join a small analytics team supporting a grocery delivery business across 12 cities.
You will:
- Write SQL against our warehouse to answer questions from operations and finance
- Build and maintain dashboards that city managers use every morning
- Investigate metric changes such as late deliveries or order cancellations
- Present findings in plain language to non technical teams
You have:
- Strong SQL, including joins, window functions and aggregation
- Working knowledge of statistics: averages vs medians, variance, basic A/B testing
- Experience with a BI tool such as Looker, Tableau or Metabase
- Curiosity and care about data quality`,
    },
  },
];

export type SampleInterview = { id: string; label: string; roleId: string; transcript: ShapedTurn[] };

export const SAMPLE_INTERVIEWS: SampleInterview[] = [
  {
    id: 'frontend-mixed',
    label: 'Frontend, mid level',
    roleId: 'frontend',
    transcript: [
      { speaker: 'interviewer', text: 'Hi, thanks for joining. Let us start with a performance question. Tell me about a time you made a slow page faster. What was the situation and what did you do?' },
      { speaker: 'candidate', text: 'Sure. At my last job our product listing page had a largest contentful paint of about 4.2 seconds on mobile. I was the engineer on the search team, so I owned that page. I profiled it and found the hero image was lazy loaded and we shipped a 600 kilobyte JavaScript bundle before anything rendered. I moved the hero image to eager loading with a preload hint, split the filters panel into its own chunk, and server rendered the first twelve products. LCP dropped to 2.1 seconds at the 75th percentile and conversion went up about 3 percent over the next month.' },
      { speaker: 'interviewer', text: 'Nice. How did you know the conversion change came from the performance work and not something else?' },
      { speaker: 'candidate', text: 'Honestly we did not run a clean A/B test. We compared the four weeks before and after, and marketing did not change anything in that window, but I would run it behind a flag next time.' },
      { speaker: 'interviewer', text: 'Fair. Next one: explain the difference between state that should live in a component and state that should live in a global store.' },
      { speaker: 'candidate', text: 'I keep state local unless more than one distant part of the tree needs it. Like form input state stays in the form. Things like the logged in user or the cart go in context or a store. Server data I put in a query cache rather than a store because it has its own lifecycle.' },
      { speaker: 'interviewer', text: 'Last question. Tell me about a disagreement with a designer.' },
      { speaker: 'candidate', text: 'Um, there was one about a modal, they wanted it and I thought it was bad for accessibility, so we talked and it was fine in the end.' },
    ],
  },
  {
    id: 'pm-behavioral',
    label: 'Product manager, senior',
    roleId: 'pm',
    transcript: [
      { speaker: 'interviewer', text: 'Welcome. Tell me about a product decision you made with incomplete data.' },
      { speaker: 'candidate', text: 'We had to decide whether to remove the free trial credit card requirement. Leadership was split and we only had two weeks before the pricing review. I owned self serve onboarding. I pulled funnel data showing 38 percent of visitors dropped at the card form, ran five customer calls, and proposed a two week test on 20 percent of traffic with a guardrail on paid conversion. Trial starts went up 61 percent and paid conversion per visitor stayed flat, so we rolled it out to everyone.' },
      { speaker: 'interviewer', text: 'What would you have done if paid conversion had dropped?' },
      { speaker: 'candidate', text: 'We had agreed upfront that a drop of more than 10 percent meant rolling back, so I would have rolled back and looked at activation emails before trying again.' },
      { speaker: 'interviewer', text: 'Tell me about a time you had to say no to a senior stakeholder.' },
      { speaker: 'candidate', text: 'Our VP of sales wanted a custom dashboard for one big prospect. I said no because it did not fit the roadmap. He was not happy but it worked out.' },
    ],
  },
];
