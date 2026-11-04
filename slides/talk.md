---
talk: https://heedvision.arvindchee.nu/talk/
site: https://heedvision.arvindchee.nu/
duration: 9.8      # minutes, for presenter-view pacing
plugins: hv-live   # slides/plugins/<name>.js and .css

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
  # Title         the `title` slot
  ## Subtitle     the `subtitle` slot
  ::name::        everything after this line goes in the `name` slot
  :::notes … :::  what you say; [click] marks a build

Components work in any slot:
  ::figure src= alt= caption= fit=contain|cover     ::plot src= alt= caption=
  ::video src= poster=     ::stat value= label= sub=     :::quote who= … :::
  ::qr label=auto          ::authors                     ::logos
  :::row … :::             :::stack … :::                ::live
Add `step` to one to show it on a click.
-->

---
id: title
layout: title
time: 26
---

:::notes
Hi everyone, I'm Arvind Srinivasan, and I will be presenting this work titled HeedVision, Attention Awareness in Collaborative Immersive Analytics Environments, coauthored with Niklas Elmqvist.

In this work, we show how people analyzing data together in augmented reality can see where each of them has already looked, by colouring the data itself, and we study when that helps. The QR code takes you to the paper, the video and these slides.
:::

---
id: problem
layout: side-figure
time: 42
---

# Who looked where?

::figure::
::figure src=assets/fig/no-caav.jpg alt="Two people in headsets search a floating 3D scatterplot together. Nothing shows where either has looked." fit=contain

::side::
**Group awareness**

The ability to perceive the activities of collaborators in a shared space

**Harder in immersive 3D**

- Multiple viewpoints
- Distributed spatial attention
- Real-time coordination

:::notes
Here are two people in a shared AR space, searching the same 3D scatterplot. Each of them knows where they've looked. Neither knows where the other has.

What's missing is group awareness, the ability to perceive the activities of collaborators in a shared space. That's how people coordinate and make sense of data together. And in immersive 3D it gets especially hard, because you have multiple viewpoints, attention spread out through the space, and all of it has to happen in real time.

People have shown collaborators' focus of attention on desktops and large displays, but few have done it over time in immersive environments.
:::

---
id: caav
layout: columns
time: 62
---

# CAAV

## Collaborative Attention-Aware Visualization

::one::
### Capture

RQ1 · How should the attention of multiple viewers be captured in real time?

<span class="muted">Distinguish users while tracking attention</span>

::two::
### Record

RQ2 · How should it be recorded over time?

<span class="muted">Identity-aware accumulators: sum, maximum, difference, count</span>

::three::
### Display

RQ3 · How should it be displayed?

<span class="muted">Attention intensity and user identity</span>

:::notes
Attention-aware visualizations address part of this, but for one person. They measure a single viewer's attention over time, and change the display to encourage exploration or support reflection.

We extend that to many analysts, and we call these collaborative attention-aware visualizations, or CAAVs. They track, record and revisualize the collective attention of multiple users over time.

It's the same three parts as before, but each one brings new problems, and those gave us our three research questions. How should the attention of multiple viewers be captured in real time? Now you have to tell users apart while tracking them all at once. How should it be recorded over time? We keep attention per person, and add ways to aggregate it: sum, maximum, difference and count. And how should it be displayed? You have to show how much attention and whose, in a way that supports coordination rather than self-reflection.
:::

---
id: design-space
layout: side-figure
time: 66
---

# Design space

::figure::
::figure src=assets/fig/design-space.svg caption="Fig. 2" alt="Figure 2 of the paper: a two by two grid of world space or camera space against embedded or separated presentation, with triggering by always-on, explicit or implicit. The world-space embedded quadrant is marked evaluated; the others implemented."

::side::
**Presentation**

Embedded or separated

**Situatedness**

World space or camera space

**Triggering**

Always-on, explicit or implicit

<strong class="accent">HeedVision</strong>

World-space, embedded, explicit

:::notes
For the display question, we laid out this design space. This figure shows the revisualizing part of it, along three dimensions.

Presentation: attention can be embedded in the visualization, or separated into a view of its own. Situatedness: it can sit in world space, where it stays fixed in the space you share, or in camera space, where it follows your own view. That gives us these four quadrants. And triggering: it can be always on, explicit, where you ask to see it, or implicit, where the system decides.

HeedVision is the top left, world-space and embedded, with explicit triggering. We also built proof-of-concept prototypes of the other three quadrants, but the top left is the one we evaluated. Embedding keeps attention on the chart itself, and because you share the world, you can say “look at that orange region.”
:::

---
id: heedvision
layout: stage
time: 78
---

# HeedVision

## WebXR, React Three Fiber, Meta Quest 3

::stage::
::live

::foot::
Head-based capture at 10 Hz, voxels with temporal decay. <span style="color:#2f7fd1">Blue</span> local, <span style="color:#e08a1e">orange</span> partner, <span class="accent">pink</span> both.

:::notes
This is HeedVision, and it's the real thing running in the browser, with two headsets side by side over one shared set of voxels.

It's a standards-compliant WebXR system, built with React Three Fiber, and it runs on consumer headsets like the Meta Quest 3.

Capture is head-based, so it works across consumer devices, and we track at 10 hertz. Recording uses voxels. We divide the visualization into voxels, a bounding volume hierarchy finds the voxel your head ray hits, and each voxel accumulates attention per person, with temporal decay.

Display is the colour on the voxels. Blue is you, orange is your partner, and where you've both looked it turns pink. Those colours are safe for deuteranopia and protanopia. As I move this person around, you can see the trail build up. And clicking the sphere hides or shows the voxels. In the headset that's a controller button, and that's our explicit trigger.
:::

---
id: study
layout: side-figure
time: 72
---

# Treasure hunt

::figure::
::figure src=assets/fig/study-setup.jpg caption="Fig. 5" alt="Figure 5 of the paper: a pair in the Terrain with CAAV condition, and a pair in the Scatter with No-CAAV condition."

::side::
**8 co-located pairs**

16 participants, shared AR, 10-minute sessions

**2×2 mixed design**

Terrain or Scatter, within pairs

CAAV or No-CAAV, between pairs

**Measures**

Target discovery, coverage, redundancy, target gain

:::notes
We evaluated this with a treasure hunt. We had sixteen participants in eight co-located pairs, in shared AR on the Quest 3, free to talk. In each ten-minute session they searched for white targets hidden in a 3D visualization. A target only becomes visible when you look at it from the correct angle, within ten centimetres, and five percent of the voxels are targets.

It's a two by two mixed design. Every pair searched a terrain of Mount Bruno and a scatterplot of a hundred uniformly distributed points. The terrain has natural landmarks. The scatterplot has none, which is why we chose uniform points. Each pair used CAAV for one and no CAAV for the other, so visualization type varies within pairs, attention visualization varies between pairs, and there are four pairs per cell.

We measured target discovery, the percentage of targets found. Coverage, the percentage of space explored. Normalized redundancy, which uses Shannon entropy to capture duplicated exploration. And target gain, the pair's target count divided by the mean of the two individuals' counts. This is an exploratory study with eight pairs, so we report bootstrap confidence intervals and effect sizes.
:::

---
id: scatter
layout: stage
time: 64
---

# Scatterplot

## Less redundancy, more targets

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
time: 72
---

# Terrain

## Largest gain, more redundancy

::left::
::plot src=assets/fig/plot-terrain.svg alt="Two panels, No-CAAV against CAAV on the terrain. Target gain 1.19 versus 1.46, with each pair shown as a dot and all four CAAV pairs above the No-CAAV mean. Normalized redundancy 4.0 versus 14.9 percent."

::right::
::plot src=assets/fig/plot-terrain-maps.svg step alt="Figure 9 of the paper, redrawn. Left, the terrain's gradient, darker where it is steeper. Right, aggregated attention over all terrain conditions, brightest along the same ridge, with the steepest quarter of the terrain outlined."

::foot::
Target gain BCa 95% CI [0.112, 0.450]. Gradient and attention: Pearson r = 0.490, Spearman ρ = 0.561, both p < 0.0001. Redrawn from Figs. 8, 9, 12.

:::notes
Terrain looks different. CAAV pairs found 26 percent of targets versus 19.6, and that interval spans zero as well. But target gain gives us our strongest result: 1.46 with CAAV against 1.19 without. That's a difference of 0.277, with a confidence interval from 0.112 to 0.450, a g of 1.67, and a permutation p of 0.029. All four CAAV pairs outperformed the no-CAAV mean.

At the same time, redundancy went up, from 4 percent to 14.9 percent. That's the reverse of the scatterplot.

[click] These maps help explain it. On the left is the terrain's gradient, its peaks, ridges and valleys. On the right is where attention went, across all terrain conditions. They correlate, with a Pearson r of 0.49. The landmarks guide both people toward the same features, and attention visualization then highlights that convergence rather than preventing it. Participants also made deliberate second passes over areas they'd explored.
:::

---
id: strategies
layout: side-figure
time: 62
---

# Six strategies

::figure::
| Strategy | Scatter No‑CAAV | Scatter CAAV | Terrain No‑CAAV | Terrain CAAV |
|---|---|---|---|---|
| Spatial division | 2 | 4 | 3 | 2 |
| Landmark navigation | 2 | 0 | 3 | 5 |
| Systematic search | 0 | 4 | 1 | 2 |
| Verbal coordination | 3 | 0 | 1 | 1 |
| Visual feedback | 0 | 2 | 0 | 5 |
| Physical synchronization | 2 | 0 | 0 | 0 |

:::quote who="P8"
we have no verbal communication during the condition where we have [CAAV]
:::

::side::
:::stack
::stat value="93.8%" label="preferred CAAV conditions"
::stat value="24%" label="lower overall workload" sub="NASA TLX, 2.79 vs. 3.69"
::stat value="74.38" label="mean SUS" sub="benchmark 68"
:::

:::notes
Beyond the numbers, our thematic analysis found six collaborative strategies, and this table counts them by condition.

With CAAV, pairs moved to spatial division, systematic search and visual feedback. Visual feedback doesn't appear at all without CAAV. Without it on the scatterplot, pairs coordinated verbally, and some used physical synchronization, aligning markers in the room. Terrain has landmark navigation with or without CAAV, which helps explain why CAAV added less there.

In the scatterplot, CAAV replaced verbal coordination entirely. As one participant put it, “we have no verbal communication during the condition where we have CAAV.” That may mean a lower coordination cost, but it may also mean less joint discussion, so we read it with caution.

And people liked it. 93.8 percent preferred the CAAV conditions. NASA TLX showed 24 percent lower overall workload, 2.79 versus 3.69 on a one to seven scale, and the mean SUS score was 74.38, above the 68 benchmark.
:::

---
id: takeaways
layout: closing
time: 44
---

# Takeaways

::body::
**CAAV effectiveness depends on visualization context**

**Scatterplots:** reduced redundant exploration, emergent coordination strategies

**Terrain:** a large coordination gain, even as attention visualization sometimes interfered with natural coordination cues

<span class="muted">Exploratory study of co-located pairs in visual search</span>

:::notes
So, to wrap up. We introduced collaborative attention-aware visualizations, a design space for them, and HeedVision as one concrete instance.

Our study gives initial evidence that CAAV effectiveness depends critically on visualization context. In abstract, discrete spaces like scatterplots, CAAVs reduced redundant exploration and enabled emergent coordination strategies. On terrain, we saw a large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.

These are co-located pairs doing visual search, so whether this extends to richer activities like sensemaking remains open. And we offer the design space as a preliminary generative framework rather than a prescription. Its remaining configurations still need systematic evaluation.

The code takes you to the paper, the video and these slides. Thank you.
:::
