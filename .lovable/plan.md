

## Replace Hero Image with Video Background

### Change
Swap the static `chemistrie-hero.jpg` background in the hero section with the forecps.com MP4 video as an autoplaying, muted, looping background.

### Files to modify

**`src/pages/ProfessionalsChemistriePage.tsx`**
- Remove the `import chemHero` line (line 29)
- Replace the `<img>` tag (lines 189-193) with a `<video>` element:
  ```tsx
  <video
    autoPlay
    muted
    loop
    playsInline
    poster="/placeholder.svg"
    className="h-full w-full object-cover"
  >
    <source src="https://www.forecps.com/wp-content/uploads/2025/06/chem-sun-short.mp4" type="video/mp4" />
  </video>
  ```
- The gradient overlay and text content remain unchanged

No other files affected. The hero image asset (`chemistrie-hero.jpg`) can stay in the repo as it's not imported elsewhere.

