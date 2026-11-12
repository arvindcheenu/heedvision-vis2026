---
title: HeedVision
subtitle: Attention Awareness in Collaborative Immersive Analytics Environments
authors: Arvind Srinivasan, Niklas Elmqvist
photos: assets/people/arvind.jpg, assets/people/niklas.jpg
affiliations: Aarhus University, Aarhus University
venue: IEEE VIS 2026 · Boston · November 9–13
contacts: **Arvind Srinivasan** · arvind@cs.au.dk; Niklas Elmqvist · elm@cs.au.dk
open-to-work: Open to work · Postdoc · Industry
slug: Third-year PhD student, open to postdoc and industry positions
url: https://heedvision.arvindchee.nu/talk/
site: https://heedvision.arvindchee.nu/   # where the QR code points when asking is off
bullet: vis       # vis | triangle | dot | square | dash | none | a path to an image
duration: 9.6     # minutes, for presenter-view pacing

# Live layer: delete these lines to run without it.
questions: on      # on | off | a link to the venue's Q&A tool
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
HOW THIS FILE WORKS

Each slide starts with `---`. Settings go between two `---` lines:
  id        stable name, used in links and questions
  chapter   the section it belongs to, shown in the navigation at the top
  layout    full | two | three | figure-text | text-figure | grid | figure-strip
            title | section | end
  time      seconds you plan to spend (presenter view pacing)
  qa        on = always show the top questions on this slide
  columns, rows   optional: split the body differently, e.g. `columns: 3 2`

Then:
  # Title            short
  blocks             one per cell of the layout, in order
  :::notes … :::     what you say; [click] marks a build

Blocks (`step` shows one on a click, `step=2` fixes its click number, `wide` spans all columns):
  :::items steps … :::                   bullets, one per click, the current one highlighted
                                         (`steps=2` starts at click 2; `uncover=off` keeps all visible;
                                         `bullet=dot` changes this list's bullet)
  :::card title="…" icon=eye cite="…" tone=both … :::   a heading with text under it; `> a quote` works inside
  ::stat value="70%" label="…" sub="…" tone=both        a number
  ::image src="…" alt="…" caption="…" fit=cover         a picture
  ::plot src="…" alt="…"                 an SVG plot
  ::clip src="…" poster="…" title="…"    a looping video
  :::quote who="…" … :::                 a quote
  :::heat … :::                          a table whose numbers tint their cells
  ::caveat text="…"                      a footnote
  :::stack … :::  :::row … :::  :::grid cols=3 … :::    under, beside, or in a grid
  ::demo  ::bvh  ::hv  ::live  ::designspace            the animations
  ::designspace next="world-separated" next-badge="…"   on a click, moves the highlight to these quadrants

Math: $x^2$ and $$x^2$$. Diagrams: a fenced ```mermaid block. Research questions: <span class="rq">…</span>.
Colours and type for every slide are at the top of shared/hv.css and slides/css/deck.css.
-->

---
id: title
layout: title
chapter: Motivation
time: 18
---

:::notes
Hi everyone, I'm Arvind Srinivasan, and this is HeedVision, joint work with Niklas Elmqvist.

When people analyze data together in augmented reality, we colour the data itself to show where each of them has already looked. And we study when that helps.
:::

---
id: motivation
layout: text-figure
chapter: Motivation
time: 25
---

# Searching an abstract 3D space

:::items steps
- **No up.** A 3D embedding has no natural orientation.
- **Few landmarks.** One cluster looks much like the next.
- **Too much for one person.** So you bring in a colleague.
:::

::image src="assets/fig/motiv-cells.jpg" fit=cover alt="A UMAP embedding of single-cell data: thousands of points in coloured clusters, with a few green points scattered between them."

::caveat text="Example: Legetth et al., CellexalVR, iScience 2021. Image: Single Cell RNA Seq, illustrated UMAP, Ryan Kissinger, courtesy of NIAID (NIH BioArt 767), public domain, background changed."

:::notes
Picture an analyst in a headset, inside a 3D embedding of thousands of data points, looking for one rare cluster. Nothing in there is up or down.

[click] There are few landmarks, because one cluster looks much like the next.

[click] And it's too much to search alone, so you bring in a colleague.
:::

---
id: problem
layout: figure-text
chapter: Motivation
time: 32
---

# Who looked where?

::demo modes="none,who" steps=2 bare tag="Simulated"

:::items steps=1
- **Group awareness.** The ability to perceive the activities of collaborators in a shared space.
- **Harder in immersive 3D.** Multiple viewpoints, distributed spatial attention, real-time coordination.
- **What if the space remembered?**
:::

:::notes
Now there are two of you in the same space. These circles show where you're each looking, and neither of you can see the other's. What's missing is group awareness: the ability to perceive what your collaborators are doing.

[click] In immersive 3D that's harder. Everyone has a different viewpoint, and everything happens in real time.

[click] So what if the space remembered who looked where, and coloured it like this?
:::

---
id: part-idea
layout: section
chapter: Idea
time: 5
---

# Idea

## From one viewer to many

:::notes
So we took attention-aware visualization from one viewer to many.
:::

---
id: caav
layout: three
chapter: Idea
time: 37
---

# Collaborative attention-aware visualization

:::card icon=eye title="Capture" class=col
Distinguish between users while tracking attention simultaneously.

<span class="rq-tag">RQ1</span><span class="rq">How should the attention of multiple viewers on a visualization be captured in real time?</span>
:::

:::card icon=layers title="Record" class=col step=1
Identity-aware accumulators, with sum, maximum, difference and count.

<span class="rq-tag">RQ2</span><span class="rq">How should the attention of multiple viewers on a visualization be recorded over time?</span>
:::

:::card icon=palette title="Revisualize" class=col step=2
Encode both attention intensity and user identity.

<span class="rq-tag">RQ3</span><span class="rq">How should the attention of multiple viewers on a visualization be displayed?</span>
:::

:::notes
Attention-aware visualizations measure one viewer's attention over time and change the display in response. We extend that to several analysts, and we call these collaborative attention-aware visualizations, or CAAVs.

That gives us three questions. How do you capture the attention of several viewers at once, and tell them apart?

[click] How do you record it over time? We keep attention per person.

[click] And how do you display it? You have to show how much attention, and whose, so that people can coordinate.
:::

---
id: record
layout: figure-text
chapter: Idea
time: 31
---

# Record: one session, five views

::demo steps=1 snapshot bare tag="Simulated"

:::items steps=1 uncover=off
- **Count.** How many people looked.
- **Sum.** Total coverage.
- **Maximum.** The strongest focus.
- **Difference.** The division of labor.
- **Who.** <mark class="you">Blue</mark> you, <mark class="partner">orange</mark> partner, <mark class="both">pink</mark> both.
:::

:::notes
Each voxel keeps one value per person. It grows while you look and decays when you stop. Count is how many people looked.

[click] Sum is total coverage.

[click] Maximum is the strongest focus.

[click] Difference shows the division of labor.

[click] And with colour you see whose attention it is: blue for you, orange for your partner, pink for both. That's the one HeedVision shows.
:::

---
id: design-space
layout: full
chapter: Idea
time: 39
---

# Display: a design space

::designspace steps badge="HeedVision" highlight=world-embedded trigger=explicit

:::notes
For display, we laid out a design space.

[click] Attention can be embedded in the visualization, or shown in a separate view. And it can sit in world space, fixed in the room you share.

[click] Or in camera space, where it follows your own view.

[click] Then triggering: always on, explicit, where you ask for it, or implicit, where the system decides.

[click] HeedVision is world-space and embedded, with explicit triggering. Because you share the world, you can say “look at that orange region.”
:::

---
id: part-system
layout: section
chapter: System
time: 5
---

# System

## One corner built and evaluated

:::notes
That corner is the one we built and evaluated.
:::

---
id: heedvision
layout: figure-text
chapter: System
time: 27
---

# HeedVision: colour per user

::hv steps=1

:::items steps=1
- **WebXR.** React Three Fiber, on headsets like the Meta Quest 3.
- **Explicit.** A controller button shows or hides attention.
- **Per headset.** <mark class="you">Blue</mark> is you, <mark class="partner">orange</mark> your partner, <mark class="both">pink</mark> both.
- **Temporal decay.** Attention fades when you look away.
:::

:::notes
HeedVision runs in the browser with WebXR, on consumer headsets like the Meta Quest 3.

[click] Each of you leaves a trail of attention, and a controller button shows or hides it.

[click] In each headset, blue is you and orange is your partner. Pink is where you've both looked.

[click] And attention fades when you look away.
:::

---
id: bvh
layout: figure-text
chapter: System
time: 30
---

# Voxels collect the attention

::bvh steps=1

:::items steps=1
- **Wrap the chart.** A bounding volume hierarchy around its geometry.
- **Keep voxels that touch it.** Boxes rule out empty cells.
- **A ray from each head, at 10 Hz.** It hits the nearest voxel, which gains that person's attention.
:::

:::notes
To turn a chart into voxels, we wrap its geometry in a bounding volume hierarchy, which is just boxes inside boxes.

[click] Only the grid cells that touch the geometry become voxels, so attention sticks to the chart.

[click] Ten times a second, a ray from each person's head hits the nearest voxel, and that voxel gains attention for that person. The details are in the paper.
:::

---
id: design-space-others
layout: full
chapter: System
time: 6
---

# Display: a design space

::designspace badge="HeedVision" highlight=world-embedded trigger=explicit next="world-separated camera-embedded camera-separated" next-badge="Prototype"

:::notes
That's HeedVision's corner.

[click] The design space has three more.
:::

---
id: prototypes
layout: three
chapter: System
time: 16
---

# The other three quadrants

::clip src="assets/video/proto-world-separated.mp4" poster="assets/video/proto-world-separated.jpg" title="World, separated" caption="A movable miniature" ratio=8/5
::clip src="assets/video/proto-camera-embedded.mp4" poster="assets/video/proto-camera-embedded.jpg" title="Camera, embedded" caption="Attention on the bounding box" ratio=8/5
::clip src="assets/video/proto-camera-separated.mp4" poster="assets/video/proto-camera-separated.jpg" title="Camera, separated" caption="A 2D panel beside the data" ratio=8/5
::caveat text="Proofs of concept, in VR only. Not part of the study."

:::notes
We also built proof-of-concept prototypes of those: a miniature you can move, attention on the bounding box, and a 2D panel beside the data. They run in VR only, and they weren't part of the study.
:::

---
id: part-study
layout: section
chapter: Study
time: 3
---

# Study

## Does it help?

:::notes
So, does it help?
:::

---
id: hunt
layout: figure-text
columns: 3 2
chapter: Study
time: 53
---

# A treasure hunt, in the real system

::live tag="Live demo"

:::items steps
- **8 co-located pairs.** 16 participants, shared AR, 10-minute sessions.
- **Targets.** 5% of voxels.
- **Visible up close.** From the correct angle, within 10 cm.
- **With CAAV.** Voxels show where each person has looked.
:::

:::notes
We evaluated it with a treasure hunt. This is the real system running in the browser, with two headsets side by side. We had sixteen participants in eight co-located pairs, with ten minutes per session.

[click] They searched for targets hidden in a 3D visualization. Five percent of the voxels are targets.

[click] A target only shows up when you look from the correct angle, within ten centimetres.

[click] And with CAAV, voxels change colour to show where each person has looked. As I move this person around, you can see the trail build up in both views.
:::

---
id: study
layout: figure-strip
chapter: Study
time: 39
---

# Two sessions per pair

:::row wide
::image src="assets/fig/study-terrain.jpg" fit=cover caption="Terrain × CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the terrain, with attention voxels coloured blue, orange and pink."
::image src="assets/fig/study-scatter.jpg" fit=cover caption="Scatter × No-CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the scatterplot, with nothing showing where either has looked."
:::

:::row wide
:::items
- **Each pair.** One visualization with CAAV, the other without.
- **Per visualization.** 4 pairs with CAAV, 4 without.
:::
:::items
- **Target discovery, coverage.** Percentage of targets found, and of space explored.
- **Normalized redundancy.** Overlap in exploration.
- **Target gain.** Pair ÷ mean individual.
:::
:::

:::notes
Every pair searched a terrain, which has natural landmarks, and a scatterplot of a hundred uniform points, which has none. Each pair did two sessions, one visualization with CAAV and the other without. So for each visualization, we compare four pairs with CAAV against four without.

We measured targets found and space covered. Normalized redundancy, which is how much the two explored the same places. And target gain, which compares the pair with its two members on their own. It's an exploratory study, so we report effect sizes and confidence intervals.
:::

---
id: part-results
layout: section
chapter: Results
time: 3
---

# Results

## It depends on the space

:::notes
Here's what we found.
:::

---
id: scatter
layout: full
chapter: Results
time: 32
---

# Scatterplot: directional benefits

::plot src=assets/fig/plot-scatter.svg alt="Four panels, No-CAAV against CAAV on the scatterplot. Target discovery 62.4 versus 78.5 percent, with each pair shown as a dot. Coverage 67.1 versus 76.5 percent. Normalized redundancy 11.3 versus 3.3 percent. Target gain 1.19 versus 1.33, with each pair shown as a dot."

::caveat text="Dots: pairs. Bars: means. Targets BCa 95% CI [−0.012, +0.293]. Redundancy exact *p* = 0.257: directional. Redrawn from Figs. 7, 8 and the text."

:::notes
First the scatterplot, where there's nothing to navigate by. Each dot is a pair, and the bar is the mean.

Pairs with CAAV found about seventy-eight percent of the targets, against sixty-two without. But the confidence interval just spans zero, so we treat that cautiously.

Redundancy dropped from about eleven percent to three, and that is also only directional. Coverage and target gain point the same way, and the exact numbers are in the paper.
:::

---
id: terrain
layout: two
chapter: Results
time: 43
---

# Terrain: largest gain, more redundancy

::plot src=assets/fig/plot-terrain.svg alt="Two panels, No-CAAV against CAAV on the terrain. Target gain 1.19 versus 1.46, with each pair shown as a dot and all four CAAV pairs above the No-CAAV mean. Normalized redundancy 4.0 versus 14.9 percent."
::plot src=assets/fig/plot-terrain-maps.svg step alt="Figure 9 of the paper, redrawn. Left, the terrain's gradient, darker where it is steeper. Right, aggregated attention over all terrain conditions, brightest along the same ridge, with the steepest quarter of the terrain outlined."

::caveat text="Target gain BCa 95% CI [0.112, 0.450], *p* = 0.029. Gradient and attention: Pearson *r* = 0.490, Spearman *ρ* = 0.561, both *p* < 0.0001. Redrawn from Figs. 8, 9 and the text."

:::notes
Terrain looks different. Target gain is our strongest result: 1.46 with CAAV against 1.19 without. Here the confidence interval stays above zero, and all four CAAV pairs beat the no-CAAV mean.

But redundancy went up, from four percent to about fifteen. That's the reverse of the scatterplot.

[click] These maps help explain it. On the left is the terrain's gradient: its peaks, ridges and valleys. On the right is where attention went. The two correlate. The landmarks pull both people to the same features, and the colours show that convergence, but they don't prevent it.
:::

---
id: strategies
layout: grid
chapter: Results
time: 25
---

# Six strategies

:::card icon=split title="Spatial division" tone=both cite="P3"
> We cut the space into top and bottom, and one search for top another search for the bottom.
:::
:::card icon=scan title="Systematic search" tone=both cite="P12"
> I took one half and systematically searched through it.
:::
:::card icon=palette title="Visual feedback" tone=both cite="P14"
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
::caveat text="Top row, in pink: the coordination patterns that came with CAAV conditions."

:::notes
We identified six collaborative strategies. In pink, on top, are the three that came with the CAAV conditions: dividing the space, searching it systematically, and using the colours as feedback. Below: talking, navigating by landmarks, which terrain pairs did with or without CAAV, and lining up the charts in the room, which we saw only without it.
:::

---
id: conditions
columns: 3 2
rows: 3 2
chapter: Results
time: 32
---

# By condition, and a clear preference

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
::caveat text="Participant counts per strategy, by pair. Participants may appear under more than one strategy."

:::quote who="P8"
we have no verbal communication during the condition where we have [CAAV]
:::

:::row wide
::stat value="93.8%" label="preferred CAAV conditions"
::stat value="24%" label="lower overall workload" sub="NASA TLX, 2.79 vs. 3.69. On terrain, directionally higher."
::stat value="74.38" label="mean SUS" sub="benchmark 68"
:::

:::notes
On the scatterplot, CAAV replaced verbal coordination entirely. As one participant put it, “we have no verbal communication during the condition where we have CAAV.” That may mean a lower coordination cost, but also less joint discussion, so we read it with caution.

And people liked it. Fifteen of our sixteen participants preferred the CAAV conditions. Overall workload was lower with CAAV, though on terrain it leaned higher. And usability was above the usual benchmark.
:::

---
id: limits
layout: two
chapter: Takeaways
time: 22
---

# Limitations and future work

:::card title="Limitations" class=head-lg
:::items
- **Scale.** Voxels get expensive at high resolutions or with many users.
- **Proxy.** Head orientation is coarser than eye tracking.
- **Scope.** Synchronous, co-located pairs, in visual search.
- **Baseline.** Only no attention visualization.
:::
:::

:::card title="Future work" class=head-lg step=1
:::items
- **Tasks and teams.** Diverse tasks, larger teams, selective sharing.
- **Baselines.** Shared gaze rays, pointer trails, manual markers, minimaps.
- **Prototypes.** The other three quadrants, in networked AR.
- **Semantic attention.** Recording at the level of data elements.
:::
:::

:::notes
This is an exploratory first step. We tracked heads, not eyes. We studied co-located pairs doing visual search. And our only baseline was no attention visualization.

[click] Next, we want other tasks and larger teams, and baselines like shared gaze rays or pointer trails. The rest is on the slide.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 53
---

# Thank you for your attention

## Takeaways

:::items steps
- **CAAV effectiveness depends critically on visualization context.** Initial evidence, in visual search.
- **Scatterplots.** Reduced redundant exploration, and emergent coordination strategies.
- **Terrain.** A large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.
:::

:::notes
To wrap up. Our study gives initial evidence, in visual search, that how well CAAVs work depends on the visualization.

[click] On scatterplots, where there are no landmarks, pairs repeated less of each other's search, and found new ways to coordinate.

[click] On terrain, pairs gained the most from working together, even though the colours sometimes got in the way of the natural cues.

[click] The QR code takes you to the paper and these slides. And one last thing. I'm in the third year of my PhD, so if all goes well, Niklas will soon successfully fire me. That means I'm looking for what comes next, and I'm open to postdoc and industry positions. So come find me. Thank you.
:::
