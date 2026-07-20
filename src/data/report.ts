/** Sample data transcribed from Figma node 3910:19916 ("보고서 영문"). */

export const SUMMARY = [
  { label: 'Sign-ups', value: '5', delta: '3', accent: 'var(--color-border-pd01)' },
  { label: 'Subscribers', value: '4', delta: '0', accent: 'var(--color-border-pd02)' },
  { label: 'Conversion Rate', value: '80%', delta: '0%', accent: 'var(--color-border-pd06)' },
  { label: 'Payment Amount', value: '$68.2', delta: '$51.15', accent: 'var(--color-border-pd03)' },
  { label: 'Markup', value: '$13.64', delta: '$10.23', accent: 'var(--color-border-pd04)' },
] as const

export const DATE_TABS = ['Today', 'Last 7 days', 'This Month', 'Last Month'] as const
export const GRAPH_TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

/**
 * Chart geometry is taken straight from the artboard so the plot matches the
 * design exactly. Bars share a baseline at y=281 inside a 1200x316.245 plot.
 */
export const CHART = {
  width: 1200,
  height: 316.245,
  baseline: 281,
  barWidth: 50,
  labelY: 292,
  signUps: [
    { x: 17, y: 192, h: 89 },
    { x: 221, y: 140, h: 141 },
    { x: 424, y: 161, h: 120 },
    { x: 627, y: 116, h: 165 },
    { x: 830, y: 151, h: 130 },
    { x: 1032, y: 238, h: 43 },
  ],
  subscribers: [
    { x: 78, y: 132, h: 149 },
    { x: 281, y: 240, h: 41 },
    { x: 485, y: 245, h: 36 },
    { x: 687, y: 180, h: 101 },
    { x: 890, y: 175, h: 106 },
    { x: 1094, y: 78, h: 203 },
  ],
  // Dot centres: the 13.898px squares in the artboard, plus half their size.
  markup: [
    { x: 79.9, y: 257.9 },
    { x: 279.9, y: 202.9 },
    { x: 480.9, y: 240.9 },
    { x: 689.9, y: 137.9 },
    { x: 895.9, y: 142.9 },
    { x: 1093.9, y: 195.9 },
  ],
  labels: [
    { x: 57, text: '07/22' },
    { x: 257, text: '07/23' },
    { x: 460, text: '07/24' },
    { x: 665, text: '07/25' },
    { x: 871, text: '07/26' },
    { x: 1071, text: '07/27' },
  ],
} as const

export type Row = {
  signUpDate: string
  creator: string
  promoCredit: string
  startDate: string
  plan: string
  lastPayment: string
  amount: string
  markup: string
}

export const ROWS: Row[] = [
  { signUpDate: '2026.07.27', creator: 'Creator5', promoCredit: '60:00', startDate: '-', plan: '-', lastPayment: '-', amount: '$0', markup: '$0' },
  { signUpDate: '2026.07.26', creator: 'Creator4', promoCredit: '60:00', startDate: '2026.07.29', plan: 'Standard', lastPayment: '2026.07.26', amount: '$17.05', markup: '$3.41' },
  { signUpDate: '2026.07.22', creator: 'Creator3', promoCredit: '60:00', startDate: '2026.07.26', plan: 'Standard', lastPayment: '2026.07.26', amount: '$17.05', markup: '$3.41' },
  { signUpDate: '2026.07.22', creator: 'Creator2', promoCredit: '60:00', startDate: '2026.07.26', plan: 'Standard', lastPayment: '2026.07.26', amount: '$17.05', markup: '$3.41' },
  { signUpDate: '2026.07.22', creator: 'Creator1', promoCredit: '60:00', startDate: '2026.07.26', plan: 'Standard', lastPayment: '2026.07.26', amount: '$17.05', markup: '$3.41' },
]
