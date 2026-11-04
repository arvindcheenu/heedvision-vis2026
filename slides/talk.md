---
title: HeedVision
subtitle: Attention Awareness in Collaborative Immersive Analytics Environments
authors: Arvind Srinivasan, Niklas Elmqvist
photos: assets/people/arvind.jpg, assets/people/niklas.jpg
venue: IEEE VIS 2026 · Boston · November 9–13
contacts: **Arvind Srinivasan** · arvind@cs.au.dk; Niklas Elmqvist · elm@cs.au.dk
url: https://heedvision.arvindchee.nu/talk/
site: https://heedvision.arvindchee.nu/   # where the QR code points when asking is off
duration: 9.8     # minutes, for presenter-view pacing

# Live layer: delete these lines to run without it.
questions: on      # on | off | a link to the venue's Q&A tool (the presenter view can also switch it off)
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
HOW THIS FILE WORKS

Each slide starts with `---`. Settings go between two `---` lines:
  id        stable name, used in links and questions
  chapter   the section it belongs to, shown in the navigation at the top
  layout    full | two | three | four | figure-text | text-figure | grid | figure-strip
            title | section | photo | end
  time      seconds you plan to spend (presenter view pacing)
  columns, rows   optional: split the body differently, e.g. `columns: 3 2`

Then:
  # Title            short
  ## Subtitle        optional
  blocks             one per cell of the layout, in order
  :::notes … :::     what you say; [click] marks a build

Blocks (add `step` to show one on a click, `step=2` to fix its click number,
`wide` to span all columns, `tone=you|partner|both|brand|orange` for its colour):
  :::card title="…" icon=eye cite="…"  … :::     a block of text; `> a quote` works inside
  ::stat value="70%" label="…" sub="…"           a number
  ::image src="…" alt="…" caption="…" fit=cover  a picture
  ::plot src="…" alt="…"                         an SVG plot
  ::clip src="…" poster="…" title="…"            a looping video
  :::quote who="…" … :::                         a quote
  :::heat … :::                                  a table whose numbers tint their cells
  :::steps reveal tones="…" icons="…"  - **Title** — text {RQ1 | a question}  :::
  ::caveat text="…"                              a small note under the body
  :::stack … :::   :::row … :::                  under or beside each other
  ::demo  ::bvh  ::hunt  ::hv  ::live  ::designspace   the animations

Colours and type for every slide are at the top of shared/hv.css and the end of slides/css/deck.css.
-->


---
id: title
layout: title
chapter: Motivation
time: 24
---

:::notes
Hi everyone, I'm Arvind Srinivasan, and I will be presenting this work titled HeedVision, Attention Awareness in Collaborative Immersive Analytics Environments, coauthored with Niklas Elmqvist.

In this work, we show how people analyzing data together in augmented reality can see where each of them has already looked, by colouring the data itself, and we study when that helps. The QR code takes you to the paper, the video and these slides.
:::

---
id: hook-up
layout: photo
chapter: Motivation
image: assets/fig/hook-cells.jpg
alt: An illustrated UMAP of single-cell RNA-seq data on black: thousands of cells in coloured clusters, with a few green cells scattered between them.
credit: Single Cell RNA Seq, illustrated UMAP · Ryan Kissinger, courtesy of NIAID (NIH BioArt 767), public domain · background changed
cite: Legetth et al., CellexalVR, iScience 2021
time: 9
---

# Some data has no up,

## A biologist searches an embedding of thousands of cells for one rare type.

:::notes
Picture a biologist in a headset, inside an embedding of thousands of cells, looking for one rare type. Nothing in there is up or down.
:::

---
id: hook-landmarks
layout: photo
chapter: Motivation
image: assets/fig/hook-molecule.jpg
alt: The grey molecular surface of the CHK2 kinase on black, with a small red inhibitor sitting in a pocket.
credit: [Human CHK2 in complex with benzimidazole carboxamide inhibitor](https://commons.wikimedia.org/wiki/File:Human_CHK2_in_complex_with_benzimidazole_carboxamide_inhibitor.png) · BaptisteGrandGrand, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · adapted: labels removed, background changed; adaptation CC BY-SA 4.0
cite: O'Connor et al., multi-user VR for molecular dynamics, Science Advances 2018
time: 10
---

# no landmarks,

## A chemist searches a protein's surface for the pocket where a drug fits.

:::notes
Or a chemist going around a protein, looking for the pocket where a drug fits. Every bump looks like the next one, so there's nothing to navigate by.
:::

---
id: hook-alone
layout: photo
chapter: Motivation
image: assets/fig/hook-network.jpg
alt: The Opte Project's map of the Internet: a dense web of coloured lines between hosts, with one hub magnified.
credit: [Partial map of the Internet, January 2005](https://commons.wikimedia.org/wiki/File:Internet_map_1024.jpg) · The Opte Project, [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/) · background changed
cite: Pairs analysing networks in HMD and CAVE: Cordeil et al., TVCG 2017
time: 10
---

# and too much to search alone.

## An analyst searches thousands of hosts for the one that's been compromised.

:::notes
Or imagine a network analyst going through thousands of hosts for the one that's been compromised. That's too much for one person, so you bring in a colleague.
:::

---
id: problem
layout: figure-text
chapter: Motivation
time: 30
---

# Who looked where?

::demo modes="none,who" steps=1 bare tag="Two analysts, simulated"

:::stack
:::card title="Group awareness"
The ability to perceive the activities of collaborators in a shared space.
:::
:::card title="Harder in immersive 3D"
Multiple viewpoints, distributed spatial attention, real-time coordination.
:::
:::card title="What if the space remembered?" tone=both step=1
:::
:::

:::notes
Now there are two of you, in the same 3D space. These circles show where you're each looking, and neither of you can see the other's.

What's missing is group awareness, the ability to perceive the activities of collaborators in a shared space. And in immersive 3D it gets especially hard, with multiple viewpoints, attention spread through the space, and all of it happening in real time.

[click] So what if the space remembered who looked where, and coloured it like this? People have shown collaborators' focus on desktops and large displays, but few have done it over time in immersive environments.
:::

---
id: part-idea
layout: section
chapter: Idea
image: assets/fig/section-idea.jpg
time: 4
---

# From one viewer to many

## Collaborative attention-aware visualization

:::notes
So we took attention-aware visualization from one viewer to many.
:::

---
id: caav
layout: full
chapter: Idea
time: 42
---

# CAAV

## Collaborative Attention-Aware Visualization

:::steps reveal tones="you partner both" icons="eye layers palette"
- **Capture** — Distinguish between users while tracking attention simultaneously. {RQ1 | How should the attention of multiple viewers on a visualization be **captured in real time**?}
- **Record** — Identity-aware accumulators, with sum, maximum, difference and count. {RQ2 | How should the attention of multiple viewers on a visualization be **recorded over time**?}
- **Display** — Encode both attention intensity and user identity. {RQ3 | How should the attention of multiple viewers on a visualization be **displayed**?}
:::

:::notes
Attention-aware visualizations measure a single viewer's attention over time and change the display to encourage exploration or support reflection. We extend that to many analysts, and we call these collaborative attention-aware visualizations, or CAAVs. They track, record and revisualize the collective attention of multiple users over time. That brings new problems, and three research questions.

[click] How should the attention of multiple viewers be captured in real time? Now you have to tell users apart while tracking them all at once.

[click] How should it be recorded over time? We keep attention per person, and add ways to aggregate it.

[click] And how should it be displayed? You have to show how much attention and whose, in a way that supports coordination rather than self-reflection.
:::

---
id: record
layout: full
chapter: Idea
time: 34
---

# Record: one session, five views

::demo steps snapshot tag="One simulated session"

:::notes
For recording, each voxel keeps one value per person, which grows while you look and decays when you stop. Here's one simulated session, shown five ways.

Count is how many people looked.

[click] Sum shows total coverage.

[click] Maximum is the strongest focus.

[click] Difference highlights the division of labor, because shared spots fade out.

[click] And when you add colour, you see whose attention it is. Blue for you, orange for your partner, and pink for both. That's the one HeedVision shows.
:::

---
id: design-space
layout: full
chapter: Idea
time: 38
---

# Display: a design space

::designspace steps badge="HeedVision" highlight=world-embedded trigger=explicit

:::notes
For display, we laid out this design space, along three dimensions.

[click] Presentation: attention can be embedded in the visualization, or separated into a view of its own. Situatedness: it can sit in world space, where it stays fixed in the space you share.

[click] Or in camera space, where it follows your own view.

[click] And triggering: always on, explicit, where you ask to see it, or implicit, where the system decides.

[click] HeedVision is world-space and embedded, with explicit triggering. Embedding keeps attention on the chart itself, and because you share the world, you can say “look at that orange region.”
:::

---
id: part-system
layout: section
chapter: System
image: assets/fig/section-system.jpg
time: 3
---

# HeedVision

## One corner built and evaluated

:::notes
That corner is the one we built and evaluated.
:::

---
id: heedvision
layout: figure-text
chapter: System
time: 28
---

# Colour per user, in the shared world

::hv steps=1

:::stack
:::card icon=toggle title="Explicit" step=1
A controller button shows or hides attention.
:::
:::card icon=palette title="Per headset" step=2
<mark class="you">Blue</mark> is you, <mark class="partner">orange</mark> your partner, <mark class="both">pink</mark> both.
:::
:::card icon=fade title="Temporal decay" step=3
Attention fades when you look away.
:::
:::

:::notes
HeedVision is a standards-compliant WebXR system built with React Three Fiber, and it runs on consumer headsets like the Meta Quest 3.

[click] Each of you leaves a trail of attention, and you press a controller button to show or hide it.

[click] In each headset, blue is you and orange is your partner, so your partner sees the same trails with the colours swapped. Pink is where you've both looked. Those colours are safe for deuteranopia and protanopia.

[click] And recording has temporal decay, so attention fades when you look away.
:::

---
id: bvh
layout: figure-text
chapter: System
time: 32
---

# Voxels collect the attention

::bvh steps=1

:::stack
:::card title="Wrap the chart"
A bounding volume hierarchy around its geometry.
:::
:::card title="Keep voxels that touch it" step=1
Boxes rule out empty cells, so attention sticks to the chart.
:::
:::card title="A ray from each head, at 10 Hz" step=2
It hits the nearest voxel, which gains that person's attention.
:::
:::

:::notes
To make voxels for a chart, we first wrap its geometry in a bounding volume hierarchy, which is just boxes inside boxes.

[click] Then we lay a grid over it. The boxes quickly rule out most cells, and only cells touching the geometry become voxels, so attention sticks to the chart.

[click] Ten times a second, a ray goes out from each person's head and hits the nearest voxel, which gains attention for that person. Capture is head-based, so it works across consumer devices.
:::

---
id: live
layout: full
chapter: System
time: 30
---

# The real system, live

::live tag="Live · the HeedVision demo, forked"

:::notes
And this is the real system, running in the browser, with two headsets side by side over one shared set of voxels.

As I move this person around, you can see the trail build up in both views. And clicking the sphere hides or shows the voxels. In the headset, that's the controller button.
:::

---
id: prototypes
layout: three
chapter: System
align: center
time: 14
---

# The other three quadrants

::clip src="assets/video/proto-world-separated.mp4" poster="assets/video/proto-world-separated.jpg" title="World, separated" caption="A movable miniature" ratio=8/5 step=1
::clip src="assets/video/proto-camera-embedded.mp4" poster="assets/video/proto-camera-embedded.jpg" title="Camera, embedded" caption="Attention on the bounding box" ratio=8/5 step=2
::clip src="assets/video/proto-camera-separated.mp4" poster="assets/video/proto-camera-separated.jpg" title="Camera, separated" caption="A 2D panel beside the data" ratio=8/5 step=3
::caveat text="Proofs of concept, in VR only. Not part of the study." step=3

:::notes
[click] We also built functional prototypes of the other three quadrants: a miniature you can move,

[click] attention projected onto the bounding box,

[click] and a 2D panel beside the data. These are proofs of concept, and they weren't part of the study.
:::

---
id: part-study
layout: section
chapter: Study
image: assets/fig/section-study.jpg
time: 3
---

# Does it help?

## An exploratory study with 8 pairs

:::notes
So, does any of this help?
:::

---
id: hunt
layout: figure-text
chapter: Study
time: 32
---

# A treasure hunt

::hunt steps=1

:::stack
:::card title="8 co-located pairs"
16 participants, shared AR, 10-minute sessions.
:::
:::card title="Targets" step=1
5% of voxels.
:::
:::card title="Visible up close" step=2
From the correct angle, within 10 cm.
:::
:::card title="With CAAV" step=3 tone=both
Each person's attention, coloured on the voxels.
:::
:::

:::notes
We evaluated this with a treasure hunt. We had sixteen participants in eight co-located pairs, in shared AR on the Quest 3, free to talk, with ten minutes per session.

[click] They searched for white targets hidden in a 3D visualization, and five percent of the voxels are targets.

[click] A target only becomes visible when you look at it from the correct angle, within ten centimetres.

[click] And in the CAAV condition, voxels change colour to show where each person has looked.
:::

---
id: study
layout: figure-strip
chapter: Study
time: 34
---

# 2×2 mixed design

:::row wide
::image src="assets/fig/study-terrain.jpg" fit=cover caption="Terrain × CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the terrain, with attention voxels coloured blue, orange and pink."
::image src="assets/fig/study-scatter.jpg" fit=cover caption="Scatter × No-CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the scatterplot, with nothing showing where either has looked."
:::

:::row wide
:::card title="Within pairs"
Terrain or Scatter.
:::
:::card title="Between pairs"
CAAV or No-CAAV, four pairs per cell.
:::
:::card title="Measures"
Target discovery, coverage, normalized redundancy, target gain.
:::
:::

:::notes
Every pair searched a terrain of Mount Bruno and a scatterplot of a hundred uniformly distributed points. The terrain has natural landmarks. The scatterplot has none, which is why we chose uniform points. Each pair used CAAV for one and no CAAV for the other, so visualization type varies within pairs, attention visualization varies between pairs, and there are four pairs per cell.

We measured target discovery, the percentage of targets found. Coverage, the percentage of space explored. Normalized redundancy, which uses Shannon entropy to capture duplicated exploration. And target gain, the pair's target count divided by the mean of the two individuals' counts. This is an exploratory study with eight pairs, so we report bootstrap confidence intervals and effect sizes.
:::

---
id: scatter
layout: full
chapter: Results
time: 42
---

# Scatterplot: less redundancy, more targets

::plot src=assets/fig/plot-scatter.svg alt="Four panels, No-CAAV against CAAV on the scatterplot. Target discovery 62.4 versus 78.5 percent, with each pair shown as a dot. Coverage 67.1 versus 76.5 percent. Normalized redundancy 11.3 versus 3.3 percent. Target gain 1.19 versus 1.33, with each pair shown as a dot."

::caveat text="Dots: pairs. Bars: means. Targets BCa 95% CI [−0.012, +0.293]. Redundancy Δ = −0.058, exact p = 0.257: directional. Redrawn from Figs. 7, 8, 12."

:::notes
First the scatterplot, where there's nothing to navigate by. Each dot here is a pair, and the bar is the mean.

Pairs with CAAV found 78.5 percent of targets, against 62.4 percent without. That's a g of 1.12, though the confidence interval just spans zero, so we treat it cautiously. They covered 76.5 percent of the space, versus 67.1.

Normalized redundancy dropped from 11.3 percent to 3.3 percent, about a 70 percent reduction. That one's directional, with an exact permutation p of 0.257, and some redundancy can be a good thing, like checking a partner's findings. Target gain was 1.33 with CAAV and 1.19 without, and that interval spans zero too.
:::

---
id: terrain
layout: two
chapter: Results
time: 54
---

# Terrain: largest gain, more redundancy

::plot src=assets/fig/plot-terrain.svg alt="Two panels, No-CAAV against CAAV on the terrain. Target gain 1.19 versus 1.46, with each pair shown as a dot and all four CAAV pairs above the No-CAAV mean. Normalized redundancy 4.0 versus 14.9 percent."
::plot src=assets/fig/plot-terrain-maps.svg step alt="Figure 9 of the paper, redrawn. Left, the terrain's gradient, darker where it is steeper. Right, aggregated attention over all terrain conditions, brightest along the same ridge, with the steepest quarter of the terrain outlined."

::caveat text="Target gain BCa 95% CI [0.112, 0.450], p = 0.029. Gradient and attention: Pearson r = 0.490, Spearman ρ = 0.561, both p < 0.0001. Redrawn from Figs. 8, 9, 12."

:::notes
Terrain looks different. CAAV pairs found 26 percent of targets versus 19.6, and that interval spans zero as well. But target gain gives us our strongest result: 1.46 with CAAV against 1.19 without. That's a difference of 0.277, with a confidence interval from 0.112 to 0.450, a g of 1.67, and a permutation p of 0.029. All four CAAV pairs outperformed the no-CAAV mean.

At the same time, redundancy went up, from 4 percent to 14.9 percent. That's the reverse of the scatterplot.

[click] These maps help explain it. On the left is the terrain's gradient, its peaks, ridges and valleys. On the right is where attention went, across all terrain conditions. They correlate, with a Pearson r of 0.49. The landmarks guide both people toward the same features, and attention visualization then highlights that convergence rather than preventing it.
:::

---
id: strategies
layout: grid
chapter: Results
time: 26
---

# Six strategies

:::card icon=split title="Spatial division" tone=you cite="P3"
> We cut the space into top and bottom, and one search for top another search for the bottom.
:::
:::card icon=scan title="Systematic search" tone=both cite="P12"
> I took one half and systematically searched through it.
:::
:::card icon=palette title="Visual feedback" tone=partner cite="P14"
> Used the voxel system to avoid redundant searches.
:::
:::card icon=chat title="Verbal coordination" cite="P13"
> We tried to coordinate verbally by describing positions relative to the Scatter structure.
:::
:::card icon=flag title="Landmark navigation" cite="P10"
> We used landmarks and described roughly in which area we found the targets.
:::
:::card icon=align title="Physical synchronization" cite="P6"
> We placed the Scatter in the same location in the room using the yellow triangle.
:::

:::notes
Our thematic analysis found six collaborative strategies. On the top row are the ones CAAV enabled: spatial division, where each person takes a region, systematic search, and visual feedback, where you use the colours to stay out of each other's way. On the bottom are what pairs fell back on: talking positions through, using landmarks, and lining up their copies in the room.
:::

---
id: conditions
layout: figure-text
chapter: Results
time: 32
---

# By condition, and a clear preference

:::stack
:::heat
| Strategy | Scatter No‑CAAV | Scatter CAAV | Terrain No‑CAAV | Terrain CAAV |
|---|---|---|---|---|
| Spatial division | 2 | 4 | 3 | 2 |
| Landmark navigation | 2 | 0 | 3 | 5 |
| Systematic search | 0 | 4 | 1 | 2 |
| Verbal coordination | 3 | 0 | 1 | 1 |
| Visual feedback | 0 | 2 | 0 | 5 |
| Physical synchronization | 2 | 0 | 0 | 0 |
:::
:::quote who="P8"
we have no verbal communication during the condition where we have [CAAV]
:::
:::

:::stack
::stat value="93.8%" label="preferred CAAV conditions" tone=both
::stat value="24%" label="lower overall workload" sub="NASA TLX, 2.79 vs. 3.69" tone=you
::stat value="74.38" label="mean SUS" sub="benchmark 68" tone=orange
:::

:::notes
This table counts those strategies by condition. Visual feedback doesn't appear at all without CAAV. And in the scatterplot, CAAV replaced verbal coordination entirely. As one participant put it, “we have no verbal communication during the condition where we have CAAV.” That may mean a lower coordination cost, but also less joint discussion, so we read it with caution.

And people liked it. 93.8 percent preferred the CAAV conditions. NASA TLX showed 24 percent lower overall workload, and the mean SUS score was 74.38, above the 68 benchmark.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 34
---

# Thank you

:::card title="It depends on context" tone=orange
CAAV effectiveness depends critically on visualization context.
:::
:::card title="Scatterplots" tone=both
Reduced redundant exploration, and emergent coordination strategies.
:::
:::card title="Terrain" tone=partner
A large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.
:::

:::notes
So, to wrap up. We introduced collaborative attention-aware visualizations, a design space for them, and HeedVision as one concrete instance.

Our study gives initial evidence that CAAV effectiveness depends critically on visualization context. In abstract, discrete spaces like scatterplots, CAAVs reduced redundant exploration and enabled emergent coordination strategies. On terrain, we saw a large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.

These are co-located pairs doing visual search, so whether this extends to richer activities like sensemaking remains open. And we offer the design space as a preliminary generative framework rather than a prescription.

The code takes you to the paper, the video and these slides. Thank you.
:::
