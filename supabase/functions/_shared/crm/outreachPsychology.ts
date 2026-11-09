// Marketing-psychology guidance for each CRM pipeline stage. One principle per
// stage keeps a draft focused (Hick's Law applies to writers too), and every
// principle carries an honest way to use it. Nothing here lets a draft invent
// scarcity, deadlines, customers, numbers or testimonials.

export interface StagePrinciple {
  /** Mental model, named so staff can read why a draft leans the way it does. */
  principle: string
  /** Instruction appended to the draft prompt. */
  guidance: string
}

export const ETHICS_RULES = `Ethical limits, always: never invent urgency, stock levels, deadlines, discounts, customer names, statistics or testimonials. Use only facts given in this prompt. Social proof must be generic and true ("opticians across the Caribbean") unless a named reference is supplied. The reader must always be free to say no, and the message should say so lightly where it fits.`

export const STAGE_PRINCIPLES: Record<string, StagePrinciple> = {
  target: {
    principle: 'Activation energy + Liking',
    guidance: 'Make the reply trivially easy: end with one yes/no question that takes five seconds to answer. Open with a specific observation about their practice or town so it reads as written for them, and sound like a neighbour, not a vendor.',
  },
  outreach: {
    principle: 'Mere exposure',
    guidance: 'A single light line that is new information, not a nudge. Do not repeat the first message. Offer one small useful fact so the second touch adds value instead of pressure.',
  },
  engaged: {
    principle: 'Reciprocity',
    guidance: 'Give something before asking: one concrete, useful tip or answer relevant to what they said. Ask for nothing larger than a short reply.',
  },
  qualifying: {
    principle: 'Commitment and consistency',
    guidance: 'Ask two easy questions they will answer in their own words (volume, current lab frustration). Small answers make the next step feel like the natural continuation.',
  },
  presenting: {
    principle: 'Contrast + Framing',
    guidance: 'Name the gap in their current experience (turnaround, communication, ordering) and show the difference concretely, framed around what they gain in their day-to-day. Anchor on the problem they described, not on a price.',
  },
  trial_offer: {
    principle: 'Regret aversion + Anchoring on a small step',
    guidance: 'Remove the fear of choosing wrong: propose one small trial order on a product they already buy, and say plainly that nothing else changes. Make the trial the smallest possible step.',
  },
  trial_active: {
    principle: 'Peak-end rule',
    guidance: 'Make this a memorable good moment: confirm their order is being handled, say what to expect and when, and invite honest feedback. Finish warmly.',
  },
  converting: {
    principle: 'Goal-gradient effect',
    guidance: 'Show progress made together and the next natural step (a second product line or a standing order). Make the next step feel close, not large.',
  },
  customer: {
    principle: 'Endowment + Reciprocity',
    guidance: 'Reinforce what they already have with us and share one genuinely useful update. No hard sell.',
  },
  nurture: {
    principle: 'Zeigarnik effect',
    guidance: 'Leave a gentle open loop they can close on their own time: a useful note and an open door, with no pressure to reply now.',
  },
}

export const principleForStage = (stage: string | null | undefined): StagePrinciple =>
  STAGE_PRINCIPLES[String(stage ?? '')] ?? STAGE_PRINCIPLES.target

/** The block added to the draft prompt for a stage. */
export const psychologyPrompt = (stage: string | null | undefined): string => {
  const { principle, guidance } = principleForStage(stage)
  return `Persuasion approach (${principle}): ${guidance}\n${ETHICS_RULES}`
}
