---
talk: https://heedvision.arvindchee.nu/talk/
site: https://heedvision.arvindchee.nu/
duration: 9.5      # minutes, for presenter-view pacing
plugins: hv-field, hv-explain, hv-live   # slides/plugins/<name>.js and .css

# Live layer: delete these lines to run without it.
questions: off     # on | off | a link to the venue's Q&A tool
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
Each slide starts with `---`, then `key: value` lines and a closing `---`.
  id      stable name, used in links and questions
  layout  a name from slides/layouts.json (draw new ones in the editor: npm run dev)
  time    seconds you plan to spend

Then the slide's content, filling its layout's slots:
  # Title         the `title` slot. **Bold** is black, the rest grey.
  ::name::        everything after this line goes in the `name` slot
  :::notes … :::  what you say; [click] marks a build

Components work in any slot:
  ::figure src= alt= caption= fit=contain|cover     ::plot src= alt= caption=
  ::video src= poster=     ::stat value= label= sub=     :::quote who= … :::
  :::heat … :::  a table whose numbers tint their cells
  :::magic steps=1 …fenced blocks… :::  Shiki Magic Move, one block per click
  :::block step=1 icon=eye … :::    :::card icon= title= who= tone= … :::
  :::grid cols=3 … :::     :::row … :::    :::stack … :::
  ::qr label=auto          ::authors       ::logos
  ::demo  ::ambient  ::bvh  ::hunt  ::hv  ::live   (from the plugins)
Add `step` to one to show it on a click, `step=2` to fix its click number.
-->

---
id: title
title: Title
layout: title
time: 24
---

:::notes
Hi everyone, I'm Arvind Srinivasan, and I will be presenting this work titled HeedVision, Attention Awareness in Collaborative Immersive Analytics Environments, coauthored with Niklas Elmqvist.

In this work, we show how people analyzing data together in augmented reality can see where each of them has already looked, by colouring the data itself, and we study when that helps. The QR code takes you to the paper, the video and these slides.
:::

---
id: motive-cells
layout: photo
time: 9
---

# **Some data has no up,**

::figure::
::figure src=assets/fig/motiv-cells.jpg fit=cover alt="An illustrated UMAP of single-cell RNA-seq data on black: thousands of cells in coloured clusters, with a few green cells scattered between them."

::side::
**A biologist** searches an embedding of thousands of cells for one rare type.

::credit::
Legetth et al., CellexalVR, iScience 2021. Image: Single Cell RNA Seq, illustrated UMAP, Ryan Kissinger, courtesy of NIAID (NIH BioArt 767), public domain, background changed.

:::notes
Picture a biologist in a headset, inside an embedding of thousands of cells, looking for one rare type. Nothing in there is up or down.
:::

---
id: motive-molecule
layout: photo
time: 10
---

# **no landmarks,**

::figure::
::figure src=assets/fig/motiv-molecule.jpg fit=cover alt="The grey molecular surface of the CHK2 kinase on black, with a small red inhibitor sitting in a pocket."

::side::
**A chemist** searches a protein's surface for the pocket where a drug fits.

::credit::
O'Connor et al., multi-user VR for molecular dynamics, Science Advances 2018. Image: [Human CHK2 in complex with benzimidazole carboxamide inhibitor](https://commons.wikimedia.org/wiki/File:Human_CHK2_in_complex_with_benzimidazole_carboxamide_inhibitor.png), BaptisteGrandGrand, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Adapted: labels removed, background changed; adaptation CC BY-SA 4.0.

:::notes
Or a chemist going around a protein, looking for the pocket where a drug fits. Every bump looks like the next one, so there's nothing to navigate by.
:::

---
id: motive-network
layout: photo
time: 10
---

# **and too much to search alone.**

::figure::
::figure src=assets/fig/motiv-network.jpg fit=cover alt="The Opte Project's map of the Internet: a dense web of coloured lines between hosts, with one hub magnified."

::side::
**An analyst** searches thousands of hosts for the one that's been compromised.

::credit::
Pairs analysing networks in HMD and CAVE: Cordeil et al., TVCG 2017. Image: [Partial map of the Internet, January 2005](https://commons.wikimedia.org/wiki/File:Internet_map_1024.jpg), The Opte Project, [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/), background changed.

:::notes
Or imagine a network analyst going through thousands of hosts for the one that's been compromised. That's too much for one person, so you bring in a colleague.
:::

---
id: problem
layout: canvas
time: 30
---

# **Who looked where?** One space, two people.

::canvas::
::demo modes="none,who" steps=1 alt="Two simulated gazes wander over a grid. First nothing records where they looked; then the cells show it in blue, orange and pink."

::side::
:::stack
:::block icon=person
**Group awareness.** The ability to perceive the activities of collaborators in a shared space.
:::
:::block icon=layers
**Harder in immersive 3D.** Multiple viewpoints, distributed spatial attention, real-time coordination.
:::
:::block icon=palette step=1
<strong class="accent">What if the space remembered?</strong>
:::
:::

:::notes
Now there are two of you, in the same 3D space. These circles show where you're each looking, and neither of you can see the other's.

What's missing is group awareness, the ability to perceive the activities of collaborators in a shared space. And in immersive 3D it gets especially hard, with multiple viewpoints, attention spread through the space, and all of it happening in real time.

[click] So what if the space remembered who looked where, and coloured it like this? People have shown collaborators' focus on desktops and large displays, but few have done it over time in immersive environments.
:::

---
id: caav
layout: columns
time: 44
---

# **CAAV.** Collaborative Attention-Aware Visualization.

::band::
:::magic steps=1 lang=text
```text
How should the attention of multiple viewers on a visualization
be captured in real time?
```
```text
How should the attention of multiple viewers on a visualization
be recorded over time?
```
```text
How should the attention of multiple viewers on a visualization
be displayed?
```
:::

::one::
### Capture

**RQ1.** Distinguish between users while tracking attention simultaneously.

::two::
:::block step=1
### Record

**RQ2.** Identity-aware accumulators, with sum, maximum, difference and count.
:::

::three::
:::block step=2
### Display

**RQ3.** Encode both attention intensity and user identity.
:::

:::notes
Attention-aware visualizations address part of this, but for one person. They measure a single viewer's attention over time and change the display to encourage exploration or support reflection. We extend that to many analysts, and we call these collaborative attention-aware visualizations, or CAAVs. They track, record and revisualize the collective attention of multiple users over time.

That brings new problems, and three research questions. How should the attention of multiple viewers on a visualization be captured in real time? Now you have to tell users apart while tracking them all at once.

[click] How should it be recorded over time? We keep attention per person, and add ways to aggregate it.

[click] And how should it be displayed? You have to show how much attention and whose, in a way that supports coordination rather than self-reflection.
:::

---
id: record
layout: canvas
time: 36
---

# **Record.** One session, five views.

::canvas::
::demo steps=1 snapshot alt="One simulated session of two people's attention on a grid, shown as count, sum, maximum, difference and who."

::side::
:::magic steps=1 class=c-code
```python
# how many people looked
a, b = voxel.attention
show = count(a, b)
```
```python
# total coverage
a, b = voxel.attention
show = a + b
```
```python
# the strongest focus
a, b = voxel.attention
show = max(a, b)
```
```python
# division of labor
a, b = voxel.attention
show = abs(a - b)
```
```python
# whose attention
a, b = voxel.attention
show = blend(blue * a,
             orange * b)
```
:::

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
layout: side-figure
time: 38
---

# **Design space.** Three dimensions.

::figure::
::figure src=assets/fig/design-space.svg plate caption="Fig. 2" alt="Figure 2 of the paper: a two by two grid of world space or camera space against embedded or separated presentation, with triggering by always-on, explicit or implicit. The world-space embedded quadrant is marked evaluated; the others implemented."

::side::
**Presentation.** Embedded or separated.

**Situatedness.** World space or camera space.

**Triggering.** Always-on, explicit or implicit.

<strong class="accent">HeedVision.</strong> <span class="ink">World-space, embedded, explicit.</span>

:::notes
For display, we laid out this design space, along three dimensions.

Presentation: attention can be embedded in the visualization, or separated into a view of its own. Situatedness: it can sit in world space, where it stays fixed in the space you share, or in camera space, where it follows your own view. And triggering: always on, explicit, where you ask to see it, or implicit, where the system decides.

HeedVision is the top left, world-space and embedded, with explicit triggering. Embedding keeps attention on the chart itself, and because you share the world, you can say “look at that orange region.”
:::

---
id: heedvision
layout: canvas
time: 28
---

# **HeedVision.** Color per user, in the shared world.

::canvas::
::hv steps=1

::side::
:::stack
:::block icon=toggle step=1
**Explicit.** A controller button shows or hides attention.
:::
:::block icon=palette step=2
In each headset, <span class="you">**blue**</span> is you, <span class="partner">**orange**</span> your partner, <span class="both">**pink**</span> both.
:::
:::block icon=fade step=3
**Temporal decay.** Attention fades when you look away.
:::
:::

:::notes
That top-left corner is HeedVision. It's a standards-compliant WebXR system built with React Three Fiber, and it runs on consumer headsets like the Meta Quest 3.

[click] Each of you leaves a trail of attention, and you press a controller button to show or hide it.

[click] In each headset, blue is you and orange is your partner, so your partner sees the same trails with the colours swapped. Pink is where you've both looked. Those colours are safe for deuteranopia and protanopia.

[click] And recording has temporal decay, so attention fades when you look away.
:::

---
id: voxels
layout: canvas
time: 34
---

# **Voxels.** Where attention is collected.

::canvas::
::bvh steps=1

::side::
:::magic steps=1 class=c-code
```python
# wrap the chart's geometry
bvh = build_bvh(chart)
```
```python
# wrap the chart's geometry
bvh = build_bvh(chart)

# keep the cells touching it
voxels = bvh.touching(grid)
```
```python
# keep the cells touching it
voxels = bvh.touching(grid)

# from each head, at 10 Hz
hit = voxels.nearest(head_ray)
hit.attention[user] += gain
```
:::

:::notes
To make voxels for a chart, we first wrap its geometry in a bounding volume hierarchy, which is just boxes inside boxes.

[click] Then we lay a grid over it. The boxes quickly rule out most cells, and only cells touching the geometry become voxels, so attention sticks to the chart.

[click] Ten times a second, a ray goes out from each person's head and hits the nearest voxel, which gains attention for that person. Capture is head-based, so it works across consumer devices.
:::

---
id: live
layout: stage
time: 32
---

# **Live.** Two headsets, one shared scene.

::stage::
::live

::foot::
Drag a view to move that person. Click the sphere to toggle their voxels.

:::notes
And this is the real system, running in the browser, with two headsets side by side over one shared set of voxels.

As I move this person around, you can see the trail build up in both views. And clicking the sphere hides or shows the voxels. In the headset, that's the controller button.
:::

---
id: prototypes
layout: stage
time: 16
---

# **Prototypes.** The other three quadrants.

::stage::
:::row
::video fit=cover src=assets/video/proto-world-separated.mp4 poster=assets/video/proto-world-separated.jpg caption="World, separated"
::video fit=cover src=assets/video/proto-camera-embedded.mp4 poster=assets/video/proto-camera-embedded.jpg caption="Camera, embedded"
::video fit=cover src=assets/video/proto-camera-separated.mp4 poster=assets/video/proto-camera-separated.jpg caption="Camera, separated"
:::

::foot::
Proofs of concept, in VR only. Not part of the study.

:::notes
We also built functional prototypes of the other three quadrants: a miniature you can move, attention projected onto the bounding box, and a 2D panel beside the data. These are proofs of concept, and they weren't part of the study.
:::

---
id: hunt
layout: canvas
time: 34
---

# **Treasure hunt.** A visual search task.

::canvas::
::hunt steps=1

::side::
:::stack
:::block icon=person
**8 co-located pairs.** 16 participants, shared AR, 10-minute sessions.
:::
:::block icon=search step=1
**Targets.** 5% of voxels.
:::
:::block icon=eye step=2
**Visible up close.** From the correct angle, within 10 cm.
:::
:::block icon=palette step=3
**With CAAV.** Each person's attention, colored on the voxels.
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
layout: pair
time: 36
---

# **Study.** 2×2 mixed design.

::left::
::figure src=assets/fig/study-terrain.jpg fit=cover focus="50% 22%" caption="Terrain × CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the terrain, with attention voxels coloured blue, orange and pink."

::right::
::figure src=assets/fig/study-scatter.jpg fit=cover focus="50% 22%" caption="Scatter × No-CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the scatterplot, with nothing showing where either has looked."

::one::
**Within pairs.** Terrain or Scatter.

::two::
**Between pairs.** CAAV or No-CAAV, four pairs per cell.

::three::
**Measures.** Target discovery, coverage, normalized redundancy, target gain.

:::notes
Every pair searched a terrain of Mount Bruno and a scatterplot of a hundred uniformly distributed points. The terrain has natural landmarks. The scatterplot has none, which is why we chose uniform points. Each pair used CAAV for one and no CAAV for the other, so visualization type varies within pairs, attention visualization varies between pairs, and there are four pairs per cell.

We measured target discovery, the percentage of targets found. Coverage, the percentage of space explored. Normalized redundancy, which uses Shannon entropy to capture duplicated exploration. And target gain, the pair's target count divided by the mean of the two individuals' counts. This is an exploratory study with eight pairs, so we report bootstrap confidence intervals and effect sizes.
:::

---
id: scatter
layout: stage
time: 42
---

# **Scatterplot.** Less redundancy, more targets.

::stage::
::plot src=assets/fig/plot-scatter.svg alt="Four panels, No-CAAV against CAAV on the scatterplot. Target discovery 62.4 versus 78.5 percent, with each pair shown as a dot. Coverage 67.1 versus 76.5 percent. Normalized redundancy 11.3 versus 3.3 percent. Target gain 1.19 versus 1.33, with each pair shown as a dot."

::foot::
Dots: pairs. Bars: means. Targets BCa 95% CI [−0.012, +0.293]. Redundancy Δ = −0.058, exact p = 0.257: directional. Redrawn from Figs. 7, 8, 12.

:::notes
First the scatterplot, where there's nothing to navigate by. Each dot here is a pair, and the bar is the mean.

Pairs with CAAV found 78.5 percent of targets, against 62.4 percent without. That's a g of 1.12, though the confidence interval just spans zero, so we treat it cautiously. They covered 76.5 percent of the space, versus 67.1.

Normalized redundancy dropped from 11.3 percent to 3.3 percent, about a 70 percent reduction. That one's directional, with an exact permutation p of 0.257, and some redundancy can be a good thing, like checking a partner's findings. Target gain was 1.33 with CAAV and 1.19 without, and that interval spans zero too.
:::

---
id: terrain
layout: two-plots
time: 56
---

# **Terrain.** Largest gain, more redundancy.

::left::
::plot src=assets/fig/plot-terrain.svg alt="Two panels, No-CAAV against CAAV on the terrain. Target gain 1.19 versus 1.46, with each pair shown as a dot and all four CAAV pairs above the No-CAAV mean. Normalized redundancy 4.0 versus 14.9 percent."

::right::
::plot src=assets/fig/plot-terrain-maps.svg step alt="Figure 9 of the paper, redrawn. Left, the terrain's gradient, darker where it is steeper. Right, aggregated attention over all terrain conditions, brightest along the same ridge, with the steepest quarter of the terrain outlined."

::foot::
Target gain BCa 95% CI [0.112, 0.450], p = 0.029. Gradient and attention: Pearson r = 0.490, Spearman ρ = 0.561, both p < 0.0001. Redrawn from Figs. 8, 9, 12.

:::notes
Terrain looks different. CAAV pairs found 26 percent of targets versus 19.6, and that interval spans zero as well. But target gain gives us our strongest result: 1.46 with CAAV against 1.19 without. That's a difference of 0.277, with a confidence interval from 0.112 to 0.450, a g of 1.67, and a permutation p of 0.029. All four CAAV pairs outperformed the no-CAAV mean.

At the same time, redundancy went up, from 4 percent to 14.9 percent. That's the reverse of the scatterplot.

[click] These maps help explain it. On the left is the terrain's gradient, its peaks, ridges and valleys. On the right is where attention went, across all terrain conditions. They correlate, with a Pearson r of 0.49. The landmarks guide both people toward the same features, and attention visualization then highlights that convergence rather than preventing it.
:::

---
id: strategies-cards
layout: cards
time: 28
---

# **Six strategies.** In their own words.

::cards::
:::grid cols=3
:::card icon=split title="Spatial division" tone=you who="P3"
We cut the space into top and bottom, and one search for top another search for the bottom.
:::
:::card icon=scan title="Systematic search" tone=both who="P12"
I took one half and systematically searched through it.
:::
:::card icon=palette title="Visual feedback" tone=partner who="P14"
Used the voxel system to avoid redundant searches.
:::
:::card icon=chat title="Verbal coordination" who="P13"
We tried to coordinate verbally by describing positions relative to the Scatter structure.
:::
:::card icon=flag title="Landmark navigation" who="P10"
We used landmarks and described roughly in which area we found the targets.
:::
:::card icon=align title="Physical synchronization" who="P6"
We placed the Scatter in the same location in the room using the yellow triangle.
:::
:::

:::notes
Our thematic analysis found six collaborative strategies. On the top row are the ones CAAV enabled: spatial division, where each person takes a region, systematic search, and visual feedback, where you use the colours to stay out of each other's way. On the bottom are what pairs fell back on: talking positions through, using landmarks, and lining up their copies in the room.
:::

---
id: strategies
layout: side-figure
time: 34
---

# **By condition.** And a clear preference.

::figure::
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

::side::
:::stack
::stat value="93.8%" label="preferred CAAV conditions" class=tone-both
::stat value="24%" label="lower overall workload" sub="NASA TLX, 2.79 vs. 3.69" class=tone-you
::stat value="74.38" label="mean SUS" sub="benchmark 68" class=tone-partner
:::

:::notes
This table counts those strategies by condition. Visual feedback doesn't appear at all without CAAV. And in the scatterplot, CAAV replaced verbal coordination entirely. As one participant put it, “we have no verbal communication during the condition where we have CAAV.” That may mean a lower coordination cost, but also less joint discussion, so we read it with caution.

And people liked it. 93.8 percent preferred the CAAV conditions. NASA TLX showed 24 percent lower overall workload, and the mean SUS score was 74.38, above the 68 benchmark.
:::

---
id: takeaways
layout: closing
time: 34
---

# **It depends on context.**

::body::
**CAAV effectiveness depends critically on visualization context.**

<span class="both">**Scatterplots.**</span> Reduced redundant exploration, and emergent coordination strategies.

<span class="partner">**Terrain.**</span> A large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.

Exploratory study of co-located pairs in visual search.

:::notes
So, to wrap up. We introduced collaborative attention-aware visualizations, a design space for them, and HeedVision as one concrete instance.

Our study gives initial evidence that CAAV effectiveness depends critically on visualization context. In abstract, discrete spaces like scatterplots, CAAVs reduced redundant exploration and enabled emergent coordination strategies. On terrain, we saw a large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.

These are co-located pairs doing visual search, so whether this extends to richer activities like sensemaking remains open. And we offer the design space as a preliminary generative framework rather than a prescription.

The code takes you to the paper, the video and these slides. Thank you.
:::
