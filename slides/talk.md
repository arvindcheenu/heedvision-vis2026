---
title: HeedVision
subtitle: Attention Awareness in Collaborative Immersive Analytics Environments
kicker: Full paper · TVCG
authors: Arvind Srinivasan, Niklas Elmqvist
affiliation: Aarhus University
venue: IEEE VIS 2026 · Boston · November 9–13
contacts: **Arvind Srinivasan** · arvind@cs.au.dk; Niklas Elmqvist · elm@cs.au.dk
url: https://heedvision.arvindchee.nu/talk/
duration: 9

# Live layer. Turn these off if the venue runs its own Q&A.
questions: on      # on | off | a link to the venue's Q&A tool
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
HOW THIS FILE WORKS

Each slide starts with `---`. Optional settings go between two `---` lines:
  id        stable name (used in links, questions and posters)
  layout    title | section | content (default) | end
  chapter   label in the footer band
  kicker    small line above the headline
  columns   body split, e.g. `7 5` or `1 1 1`
  rows      row split, e.g. `2 1`
  time      seconds you plan to spend (speaker view pacing)

Then:
  # Headline         one sentence: the point of the slide
  ## Dek             optional supporting line
  components         see below
  :::notes … :::     what you say

Components (any of them takes `step` to appear on a click, `wide` to span
all columns, `tall` to span two rows, and `tone=you|partner|both|brand`):
  ::stat value="70%" label="…" sub="…"
  ::compare label="…" a=11.3 b=3.3 a-label="…" b-label="…" unit="%" change="−70%"
  ::dots n=15 of=16 label="…"
  ::image src="…" alt="…" caption="…" fit=cover|contain
  ::video src="…" poster="…" caption="…" fit=contain live=<demo name>
  :::card label="…" title="…" (steps: list items appear one by one) … :::
  :::quote who="…" … :::
  :::steps reveal tones="you partner both"  - **Title** — text  :::
  :::stack … :::   :::row … :::   (put components under or beside each other)
  ::glyph type=joint|distributed|sequential|cumulative
  ::demo steps     ::designspace steps   ::caveat text="…"   ::qr   ::logos
  :::questions … :::  (live questions; shows its own content when questions are off)

Make your own with :::define, then use it like any other component.
-->

:::define callout
<div class="tile c-callout">

{{content}}

</div>
:::

---
id: title
layout: title
chapter: Motivation
time: 21
---

:::notes
Hi, I'm Arvind Srinivasan from Aarhus University, and this is joint work with Niklas Elmqvist.

I'll talk about HeedVision, which makes attention visible when people analyze data together in mixed reality. To follow along or leave a question on any slide, scan the code.
:::

---
id: hook
chapter: Motivation
kicker: A familiar problem
columns: 7 5
time: 27
---

# Two analysts share one 3D scatterplot, but not what they've already looked at

::image src="assets/fig/scatter-no-caav.jpg" alt="Two participants in headsets searching a 3D scatterplot with no attention cues." caption="Study photo · no attention cues"

:::stack
:::quote who="P7, without attention cues" step
had to double-check everything the other person looked at
:::
:::card step
So they talk instead. *“Did you check the back?”* *“Which back?”*
:::
:::

:::notes
Picture two analysts in headsets, searching the same 3D scatterplot. Each sees the data. Neither sees what the other has already looked at.

[click] One of our participants put it simply: they had to double-check everything their partner looked at.

[click] Or they talk. “Did you check the back?” “Which back?” And they still search the same points twice.
:::

---
id: gap
chapter: Motivation
kicker: Why it's hard
columns: 1 1 1
time: 31
---

# At a desk you can point at a shared screen. In a headset, you can't.

:::card label="At a desk" title="Group awareness"
Seeing what collaborators are doing is what lets a team split up work. *Gutwin & Greenberg, 1998*
:::

:::card label="In AR and VR" title="Separate viewpoints" tone=partner step
Everyone stands somewhere else, and attention is spread across the room.
:::

:::card label="Our prior work" title="Attention-aware vis" tone=you step
Tracks where *one* viewer looked and feeds it back into the display. Not built for groups.
:::

:::notes
In CSCW this is called group awareness: seeing what your collaborators are doing, which is what lets a team divide the work.

[click] In immersive 3D it gets harder. Everyone has their own viewpoint, and attention is spread around the room.

[click] In our earlier work on attention-aware visualizations, we tracked where a viewer had looked and fed it back into the display. But that serves one person.
:::

---
id: part-idea
layout: section
chapter: Idea
time: 6
---

# From one viewer to many

## Collaborative attention-aware visualization

:::notes
So the question is how to carry that idea over to a group.
:::

---
id: caav
chapter: Idea
kicker: The idea · CAAV
time: 34
---

# Every stage of attention-aware vis gets a new job when a group is watching

:::steps reveal tones="you partner both"
- **Capture** — Track everyone at once, and know who is who. *RQ1*
- **Record** — Keep one memory per person per spot, and combine them. *RQ2*
- **Display** — Show *whose* attention, not just how much. *RQ3*
:::

:::notes
An attention-aware visualization has three stages: capture attention, record it over time, and display it.

Collaborative attention-aware visualizations, or CAAVs, keep those stages, but each one gets a group job. [click] Capture has to track everyone at once and know who is who. [click] Recording keeps one memory per person per spot and combines them. [click] And the display has to show whose attention it is, not just how much. These are our three research questions.
:::

---
id: kinds
chapter: Idea
kicker: RQ1 · Capture
columns: 1 1 1 1
time: 30
---

# Two viewers create four kinds of attention that one viewer never has

:::card step
::glyph type=joint
### Joint
We look at the same thing
:::

:::card step
::glyph type=distributed
### Distributed
We split up the space
:::

:::card step
::glyph type=sequential
### Sequential
I build on where you looked
:::

:::card step
::glyph type=cumulative
### Cumulative
Everything the team has covered
:::

:::notes
With two people, attention comes in four kinds that a single viewer never has. [click] Joint, when we look at the same thing. [click] Distributed, when we split up. [click] Sequential, when I build on where you looked. [click] And cumulative: everything the team has covered so far.

We capture it through proxies like pointing, head direction or eye tracking, each tagged with who it came from.
:::

---
id: record
chapter: Idea
kicker: RQ2 · Record
time: 35
---

# Each person leaves a trace that fades, and how you combine traces changes the picture

::demo steps

:::notes
Here's recording, as a simulation. Each cell keeps a separate value for each person. It grows while someone looks at it and fades over time, a bit like short-term memory. In HeedVision these values live in voxels on the visualization itself.

How you combine them changes the picture. [click] Sum shows total coverage. [click] Max, the strongest individual focus. [click] Difference, who owns which area. [click] And count, how many people have been there. [click] Back to who looked where.
:::

---
id: design-space
chapter: Idea
kicker: RQ3 · Display
time: 39
---

# Where attention appears is a design choice: 4 placements × 3 triggers

::designspace steps badge="HeedVision · evaluated" highlight=world-embedded trigger=explicit

:::notes
For display, we propose a design space. [click] One axis is presentation: embed attention in the visualization, or show it in a separate view, like a miniature. [click] The other is situatedness: anchor it in the shared world, or attach it to your own camera.

[click] Across those four placements sit three triggers: always on, on request, or automatic. That's twelve configurations.

[click] HeedVision takes the world-space, embedded corner, with explicit triggering. Both people share one frame of reference, so they can say “look at that orange patch.”
:::

---
id: part-system
layout: section
chapter: System
time: 5
---

# HeedVision

## One corner built for the study, three as prototypes

:::notes
Next, how we built it.
:::

---
id: heedvision
chapter: System
kicker: The system
columns: 1 1 1
rows: 2 1
time: 45
---

# HeedVision paints attention onto the data as coloured voxels

::video src="assets/video/heedvision.mp4" poster="assets/video/heedvision.jpg" caption="From the video figure" fit=contain live=heedvision wide

::stat value="10 Hz" label="a ray from each head marks the voxel it hits" tone=you step

::stat value="3 colours" label="blue for you, orange for your partner, pink for both" tone=both step

::stat value="0.2–0.5 s" label="to sync both headsets, in the Quest 3 browser" tone=partner step

:::notes
HeedVision runs in the headset's browser, built with WebXR and React Three Fiber on the Meta Quest 3. Each visualization is split into voxels, and only voxels that touch the data collect attention.

[click] Ten times a second, a ray along each person's head direction marks the voxel it hits. Head direction is our gaze proxy, since the Quest 3 has no eye tracking.

[click] Press a button and the voxels appear: blue where you looked, orange for your partner, pink for both. More attention, more opaque.

[click] And the two headsets stay in sync within a fraction of a second.
:::

---
id: quadrants
chapter: System
kicker: The other three corners
columns: 1 1 1
rows: 5 1
time: 19
---

# The other three placements work too, as prototypes

::image src="assets/fig/q-world-separated.jpg" alt="A small replica of the terrain floats beside the main view, showing attention." caption="World · separated: a miniature"

::image src="assets/fig/q-camera-embedded.jpg" alt="Attention projected onto the faces of the terrain's bounding box." caption="Camera · embedded: projections" step

::image src="assets/fig/q-camera-separated.jpg" alt="A 2D panel beside the terrain shows the attention map." caption="Camera · separated: a 2D panel" step

::caveat text="VR-only prototypes with local sync. Not part of the study."

:::notes
To show the design space generates designs, we built the other three corners too: a miniature you can move, [click] projections on the faces of the bounding box, [click] and a 2D overview panel. These are VR-only prototypes, and we didn't evaluate them.
:::

---
id: part-study
layout: section
chapter: Study
time: 5
---

# Does it help?

## An exploratory study with 8 pairs

:::notes
Then the real question: does it help?
:::

---
id: study
chapter: Study
kicker: The treasure hunt
columns: 5 7
time: 47
---

# 8 pairs hunted for hidden targets in two kinds of space

::video src="assets/video/eval-terrain.mp4" poster="assets/video/eval-terrain.jpg" caption="Terrain, through the headset" tall

:::row
::stat value="16" label="people in 8 co-located pairs"
::stat value="10 min" label="per search; targets are 5% of voxels"
:::

:::card label="Each pair: cues on in one space, off in the other" step
| | Cues on | Cues off |
|---|---|---|
| **Scatterplot** · no landmarks | 4 pairs | 4 pairs |
| **Terrain** · peaks and valleys | 4 pairs | 4 pairs |
:::

:::notes
We ran an exploratory study with eight co-located pairs in AR. Their task was a treasure hunt: find hidden targets that only glow when you look at them from close by, ten minutes per search. Targets made up five percent of the voxels, spread so no region was easier.

[click] We used two spaces: a scatterplot of a hundred random points, deliberately without landmarks, and a terrain of Mount Bruno, with peaks and valleys to talk about. Each pair had attention cues in one space and not the other. So each condition has four pairs, and I'll read the numbers as trends.
:::

---
id: scatter
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 23
---

# Without landmarks, pairs duplicated 70% less and found more targets

::compare label="Duplicated search" a=11.3 b=3.3 a-label="Cues off" b-label="Cues on" change="−70%" tone=both

::compare label="Targets found" a=62.4 b=78.5 a-label="Cues off" b-label="Cues on" change="+16 pts" tone=you step

::caveat text="Directional, not significant: 4 pairs per condition (redundancy: permutation p = .26)."

:::notes
In the scatterplot, the trend favours the cues. Duplicated search, measured as normalized redundancy, dropped from 11.3 to 3.3 percent: about 70 percent less.

[click] And pairs found more of the targets, 78.5 versus 62.4 percent, sixteen points more.

With four pairs per condition, these are directional, not significant.
:::

---
id: scatter-talk
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 30
---

# The colours did the coordinating, so pairs stopped talking about where to look

:::quote who="P8, with cues"
we have no verbal communication during the condition where we have [CAAV]
:::

:::quote who="P7, on dividing the space" step
split into front/back faces for each of us
:::

::caveat text="Less talk can mean lower coordination cost, or less shared discussion. We read it with care."

:::notes
The way they coordinated changed too. One participant said they had no verbal communication at all with the cues on: the colours did the work.

[click] Pairs split the space up front, “front and back faces for each of us”, and used the colours to stick to the plan. Less talk can mean lower cost, but also less discussion, so we read it with care.
:::

---
id: terrain
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
time: 28
---

# On a landscape, overlap went up 3.7×, because peaks pulled both partners in

::compare label="Duplicated search" a=4.0 b=14.9 a-label="Cues off" b-label="Cues on" change="×3.7" tone=partner

::image src="assets/fig/terrain_contour_attention.png" fit=contain alt="Terrain gradient, attention heatmap and their overlay: attention concentrates on steep features." caption="Attention follows steep terrain · r = 0.49" step

:::notes
The terrain told a different story. With cues, duplicated search went up, from 4 to about 15 percent, 3.7 times as much.

[click] Attention followed the landscape: terrain steepness and attention correlate at r = 0.49. Peaks and ridges pulled both people to the same places, and the voxels made that overlap visible, so pairs went back for second passes.
:::

---
id: teamwork
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
time: 22
---

# Yet terrain is where working together paid off most

::compare label="Targets found by the pair, vs. its members alone" a=1.19 b=1.46 unit="×" a-label="Cues off" b-label="Cues on" change="+23%" tone=you

::stat value="p = .029" label="our strongest supported result" sub="all 4 pairs with cues beat the no-cue average"

:::notes
Yet terrain gave our strongest supported result. With cues, a pair found 1.46 times what its members found on their own, against 1.19 without. All four pairs with cues beat the no-cue average.

So this isn't the cues failing. The landscape already offered cues of its own.
:::

---
id: people
chapter: Study
kicker: What people said
columns: 1 1 1
time: 26
---

# 15 of 16 people preferred working with the cues

::dots n=15 of=16 label="preferred the conditions with cues" tone=both

:::stack
::stat value="−24%" label="workload overall (NASA TLX)" sub="but it trended higher in terrain"
::stat value="75%" label="of the time, people kept the cues on"
:::

:::quote who="P6, on the colours" step
a nice blue side and a nice orange side with very little overlap
:::

:::notes
Participants liked it. Fifteen of sixteen preferred the conditions with cues. Overall workload was about a quarter lower, though in terrain it trended higher, and people kept the cues on three quarters of the time.

[click] Some made a game of it: a nice blue side and a nice orange side with very little overlap.
:::

---
id: takeaway
chapter: Takeaways
kicker: Takeaway
columns: 7 5
time: 27
---

# Show attention where the space gives you nothing to point at

:::card label="Likely helps" tone=you
- Abstract spaces without landmarks
- Large spaces you must cover fully
- Places that are hard to describe out loud

*e.g. t-SNE and UMAP embeddings, molecules, 3D networks*
:::

:::card label="Less so" step
- Data with its own landmarks
- Scenes that are already busy
:::

:::notes
So, attention cues seem most useful where the space gives you nothing to point at: abstract data like embeddings, molecules or 3D networks, when you need to cover all of it and places are hard to describe.

[click] Where the data has its own landmarks, the cues add to what people already use, and to the clutter.
:::

---
id: next
chapter: Takeaways
kicker: Limits and next steps
columns: 1 1
time: 30
---

# A first step, with clear limits

:::card label="Limits"
- Pairs only; colours stop scaling past ~4 people
- Head direction, not eye tracking
- One task, 4 pairs per condition
- Only baseline: no cues at all
:::

:::card label="Next" tone=both step
- Cues that fade or appear on their own
- Attention to data items, not just space
- Remote and asynchronous teams
:::

:::notes
This is a first step. Pairs only, head direction instead of eye tracking, one task, and colours that stop scaling past about four people. And our only baseline was no cues at all, so gaze rays or pointer trails might give part of this benefit.

[click] Next: cues that fade or appear on their own, attention to data items, and remote and asynchronous teams.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 10
---

# Thank you

## Slides, script and your questions

:::questions
:::stack
::stat value="−70%" label="duplicated search without landmarks" tone=both
::stat value="1.46×" label="pair gain with cues, on terrain" tone=you
::stat value="15 / 16" label="people preferred the cues" tone=partner
:::
:::

:::notes
Thank you. The slides, this script and a place for your questions are behind the code. I'm happy to take questions.
:::
