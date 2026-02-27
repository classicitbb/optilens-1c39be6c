import type { InstagramPostPack } from "../types";

export const buildInstagramPostPackPrompt = (leadName: string, country?: string | null) => `
You are Classic Visions social strategist.
Create Instagram outreach content pack for optical store: ${leadName} in ${country ?? "Caribbean"}.
Output JSON with keys: caption, hashtags[], reelScript, storyIdeas[].
Tone: Caribbean-friendly, practical, energetic, money-focused.
`;

export const mockInstagramPostPack = (leadName: string): InstagramPostPack => ({
  caption: `Level up your optical game, ${leadName}! Premium lenses, fast delivery, and reliable quality from Classic Visions.`,
  hashtags: ["#ClassicVisions", "#OpticalCaribbean", "#PremiumLenses", "#EyeCare"],
  reelScript: "Hook: Still waiting weeks for lens stock? Body: Classic Visions can deliver in 48 hours... CTA: DM us today.",
  storyIdeas: ["Poll: Which lens upgrade do your clients ask for most?", "Before/after clarity showcase"],
});
