---
title: HeedVision
subtitle: Attention Awareness in Collaborative Immersive Analytics Environments
kicker: Full paper · TVCG
authors: Arvind Srinivasan, Niklas Elmqvist
photos: assets/people/arvind.jpg, assets/people/niklas.jpg
venue: IEEE VIS 2026 · Boston · November 9–13
contacts: **Arvind Srinivasan** · arvind@cs.au.dk; Niklas Elmqvist · elm@cs.au.dk
url: https://heedvision.arvindchee.nu/talk/
site: https://heedvision.arvindchee.nu/   # where the QR code points when asking is off
duration: 9.9     # minutes, for presenter-view pacing; the slot allows 10 at most

# Live layer. Turn these off if the venue runs its own Q&A.
questions: off     # on | off | a link to the venue's Q&A tool (the presenter view can also switch it off)
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
HOW THIS FILE WORKS

Each slide starts with `---`. Optional settings go between two `---` lines:
  id        stable name (used in links and questions)
  layout    title | section | photo | content (default) | end
  image     section and photo: the picture behind the slide (credit: a source line;
            cite: on a photo slide, the paper behind its example)
  chapter   label in the footer band
  kicker    running head, for wayfinding only: `RQ2 · Record`, `Result 1 · Scatterplot`
  columns   body split, e.g. `7 5` or `1 1 1`
  rows      row split, e.g. `2 1`, or `1 auto` for a row that fits its content
  align     center = tiles keep their natural height, centred on the slide
  time      seconds you plan to spend (presenter view pacing)
  backup    yes = a spare slide for Q&A: listed in the script, skipped when presenting

Then:
  # Headline         one sentence: the point of the slide
  ## Dek             optional supporting line
  components         see below
  :::notes … :::     what you say

Components (any of them takes `step` to appear on a click, `step=2` to fix
its click number, `wide` to span all columns, `tall` to span two rows, and
`tone=you|partner|both|brand`):
  ::stat value="70%" label="…" sub="…"
  ::compare label="…" a=11.3 b=3.3 a-label="…" b-label="…" unit="%" change="−70%"
  ::dots n=15 of=16 label="…"
  ::image src="…" alt="…" caption="…" fit=cover|contain
  ::video src="…" poster="…" caption="…" fit=contain live=<demo name>
  :::card label="…" title="…" icon=eye cite="…" (steps: list items appear one by one) … :::
        (icons: eye layers palette pin person search gauge toggle fade)
  :::quote who="…" … :::
  :::steps reveal tones="you partner both" icons="eye layers palette"  - **Title** — text {RQ1 | the question}  :::
  :::stack … :::   :::row … :::   (put components under or beside each other)
  ::glyph type=joint|distributed|sequential|cumulative
  ::demo modes="count,sum,max,diff,who" steps snapshot bare tag="…"
        (simulation; modes in click order, plus `none`; `snapshot` freezes one
         recorded session so every mode shows the same data; `bare` hides the buttons)
  ::layers src="a.png, b.png, c.png" captions="A | B | C" steps
        (images that build one over the other)
  ::bvh steps   ::hunt steps   ::hv steps   (explainer animations; `steps=2` starts at click 2)
  ::live tag="…"  (the HeedVision demo, forked: two headsets side by side; drag a view, scroll, click the sphere)
  ::clip src="…" poster="…" title="…" caption="…" ratio=8/5   (looping video, caption below)
  ::venn a=1.19 b=1.46 a-label="…" b-label="…"   (what a pair gain means, as overlapping finds)
  ::art name=split   (line illustration)
  Colour words: <mark class="you">blue</mark>, <mark class="partner">orange</mark>, <mark class="both">pink</mark>
  ::designspace highlight="…" badge="…" done="…" done-badge="…" trigger=explicit steps
        (quadrants: world-embedded world-separated camera-embedded camera-separated)
  ::caveat text="…"   ::qr   ::logos
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
time: 26
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
id: scenario
chapter: Motivation
columns: 7 5
time: 24
---

# Two analysts search one 3D space, but neither can see where the other has looked

::demo modes="none,who" steps=3 bare tag="Two analysts, simulated"

:::stack
:::card label="Minute 2" step=1
> Did you check the back?
>
> Which back?
:::
:::card label="Minute 10" step=2
Both searched the same cluster twice. Nobody looked underneath.
:::
:::card tone=both step=3
What if the space remembered **who looked where**?
:::
:::

:::notes
Now there are two of you. These circles show where you're each looking, but you can't see each other's.

[click] Two minutes in, one of you asks, “Did you check the back?” and the other says, “Which back?”

[click] Ten minutes in, you've both searched one cluster twice, and nobody's looked underneath it.

[click] So we asked, what if the space remembered who looked where, and coloured it like this?
:::

---
id: gap
chapter: Motivation
columns: 5 7
time: 30
---

# Teams split up work by seeing each other's work. Separate 3D viewpoints make that harder.

:::stack
:::card label="At a desk" title="Workspace awareness" cite="Gutwin & Greenberg, CHI 1998"
Knowing who is where and what they are doing is how a team coordinates.
:::
:::card label="In a headset" title="Separate viewpoints" tone=partner step
Everyone sees the data from somewhere else, and seeing your partner doesn't show what they've covered.
:::
:::

:::card label="Our prior work" title="Attention-aware visualization" tone=you step cite="Srinivasan et al., TVCG 2025"
::image src="assets/fig/aav-teaser.jpg" fit=contain alt="The attention-aware visualization teaser: attention heatmaps on 3D bar charts, scatterplots and terrains, captured by headset orientation or eye tracking."
Tracks where *one* viewer looks over time, and changes the display in response. Built for one person.
:::

:::notes
Why does this happen? At a desk, you can see where the other person is working and what they're doing, and that's how a team coordinates. Gutwin and Greenberg called that workspace awareness.

[click] In a headset it's harder. You each see the data from somewhere else, and even side by side, seeing your partner doesn't show you what they've covered.

[click] Our earlier attention-aware visualizations track where someone looks over time and change the display in response, but we built them for one person.
:::

---
id: part-idea
layout: section
chapter: Idea
image: assets/fig/section-idea.jpg
time: 6
---

# From one viewer to many

## Collaborative attention-aware visualization

:::notes
So we took that idea from one viewer to many, and we call it collaborative attention-aware visualization.
:::

---
id: caav
chapter: Idea
time: 28
---

# Capture, record and display each need new answers when several people are viewing

:::steps reveal tones="you partner both" icons="eye layers palette"
- **Capture** — Track everyone at once, and know who is who. {RQ1 | How should the attention of multiple viewers on a visualization be **captured in real time**?}
- **Record** — Keep one memory per person per spot, and combine them. {RQ2 | How should the attention of multiple viewers on a visualization be **recorded over time**?}
- **Display** — Show *whose* attention it is, as well as how much. {RQ3 | How should the attention of multiple viewers on a visualization be **displayed**?}
:::

:::notes
Attention-aware vis captures, records and displays attention, and with a group each stage changes. That gives us our three research questions.

[click] First, how should the attention of multiple viewers be captured in real time? You have to track everyone at once and know who is who.

[click] Second, how should it be recorded over time, with one value per person?

[click] And third, how should it be displayed, so you see whose attention it is as well as how much?
:::

---
id: kinds
chapter: Idea
kicker: RQ1 · Capture
columns: 1 1 1 1
time: 23
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
Start with capture, because two people create four kinds of attention that one viewer can't.

[click] Joint is when we look at the same thing.

[click] Distributed is when we split up the space.

[click] Sequential is when I build on where you looked.

[click] And cumulative is everything the team has covered. You capture them through pointing, head direction or eye tracking, tagged by person.
:::

---
id: record
chapter: Idea
kicker: RQ2 · Record
time: 29
---

# One simulated session, combined five ways: each way shows a different pattern

::demo steps snapshot tag="One simulated session"

:::notes
For recording, each spot keeps one value per person, which grows while you look and fades when you stop. Here is one simulated session, combined five ways.

Count is how many people looked.

[click] Sum is total attention, so you see coverage.

[click] Max is the stronger of the two.

[click] With difference, shared spots fade out, so you see how the work got divided.

[click] And who adds colour: <mark class="you">blue</mark> for you, <mark class="partner">orange</mark> for your partner, <mark class="both">pink</mark> for both. HeedVision shows that one.
:::

---
id: design-space
chapter: Idea
kicker: RQ3 · Display
time: 30
---

# Where attention appears is a design choice: 4 placements × 3 triggers

::designspace steps badge="HeedVision · tested" highlight=world-embedded trigger=explicit

:::notes
For display, we laid out a design space.

[click] Attention can be embedded in the visualization or separated into its own view. In world space, both stay fixed in the space you share.

[click] In camera space, they follow your own view instead, so that's four placements.

[click] Each can be triggered three ways: always on, on request, or automatically.

[click] HeedVision is world-space, embedded, on request. Embedding keeps attention on the chart, and in a shared world you can say “look at that orange region.”
:::

---
id: part-system
layout: section
chapter: System
image: assets/fig/section-system.jpg
time: 4
---

# HeedVision

## One corner built and tested, three as prototypes

:::notes
That corner is the one we built and tested.
:::

---
id: heedvision
chapter: System
columns: 7 5
time: 31
---

# HeedVision colours the chart wherever each person has looked

::hv steps=1

:::stack
:::card icon=toggle title="On request" step=1
Press a button to show the trail. Press again to hide it.
:::
:::card icon=palette title="Who looked" step=2
<mark class="you">Blue</mark> is you, <mark class="partner">orange</mark> your partner, <mark class="both">pink</mark> both of you.
:::
:::card icon=fade title="How much" step=3
The longer you look, the more solid a voxel gets. Leave it, and it fades.
:::
:::

:::notes
HeedVision divides each chart into small cubes called voxels, which collect attention. It runs in the browser on a Quest 3, and a framework called Spatialstrates keeps both headsets in one scene.

[click] Each of you leaves a trail of where you've looked, and it stays hidden until you press a button.

[click] Then <mark class="you">blue</mark> is you, <mark class="partner">orange</mark> is your partner, <mark class="both">pink</mark> is both. Those colours hold up under common colour blindness.

[click] The longer you look, the more solid the voxel gets, and when you leave, it fades.
:::

---
id: bvh
chapter: System
columns: 7 5
time: 33
---

# A bounding volume hierarchy turns a chart's geometry into voxels that collect attention

::bvh steps=1

:::stack
:::card label="1 · Wrap the chart in boxes"
Nested boxes around its geometry, built once.
:::
:::card label="2 · Keep voxels that touch it" step=1
Boxes rule out empty space fast, so attention sticks to the chart.
:::
:::card label="3 · A ray, 10 times a second" step=2
Straight out of each headset, it hits the nearest voxel, which gains attention, then fades.
:::
:::

:::notes
To make voxels for a chart, we first wrap its geometry in a bounding volume hierarchy, which is just boxes inside boxes.

[click] Then we lay a grid over it. The boxes quickly rule out most cells, and only cells touching the geometry become voxels, so attention sticks to the chart.

[click] Ten times a second, a ray goes out from the centre of each headset's view and hits the nearest voxel, which gains attention for that person and then fades. We use head direction because the Quest 3 has no eye tracking.
:::

---
id: prototypes
chapter: System
time: 8
---

# We also built the other three corners, as proofs of concept

::designspace highlight="world-separated camera-embedded camera-separated" badge="Proof of concept" done=world-embedded done-badge="HeedVision · tested" trigger=none

:::notes
To check that the design space gives you real designs, we also built the other three corners as proofs of concept.
:::

---
id: quadrants
chapter: System
columns: 1 1 1
align: center
time: 14
---

# Each prototype is aimed at a different kind of teamwork

::clip src="assets/video/proto-world-separated.mp4" poster="assets/video/proto-world-separated.jpg" title="World · separated" caption="A movable miniature, for cluttered scenes" ratio=8/5 step=1

::clip src="assets/video/proto-camera-embedded.mp4" poster="assets/video/proto-camera-embedded.jpg" title="Camera · embedded" caption="Attention on the box, for guided tours" ratio=8/5 step=2

::clip src="assets/video/proto-camera-separated.mp4" poster="assets/video/proto-camera-separated.jpg" title="Camera · separated" caption="A 2D panel beside the data, for handoffs" ratio=8/5 step=3

::caveat text="VR only, synced locally between browser tabs, and not part of the study." step=3

:::notes
[click] There's a miniature you can move, for cluttered scenes.

[click] There's attention projected onto the bounding box, which is aimed at guided tours.

[click] And there's a 2D panel beside the data, aimed at handoffs. They weren't in the study.
:::

---
id: part-study
layout: section
chapter: Study
image: assets/fig/section-study.jpg
time: 9
---

# Does it help?

## An exploratory study with 8 pairs

:::notes
So, does any of this help? We ran an exploratory study with eight pairs, and from here on I'll call the coloured trail the cues.
:::

---
id: task
chapter: Study
columns: 1 1 1
rows: 5 2
time: 29
---

# The task: a treasure hunt for targets that light up only up close

::live wide tag="Live · the HeedVision demo, forked"

::stat value="10 min" label="per hunt, as a pair"

::stat value="5%" label="of voxels hide a target" sub="lit only from within 10 cm"

::stat value="1 of 2" label="hunts had the cues on"

:::notes
The task was a treasure hunt, where a pair searches a 3D chart for hidden targets. This is our demo, running live with two headsets. Wherever someone looks, voxels fill in, blue for you, gold here for your partner, and pink for both. Clicking the sphere hides your voxels, and participants had that same switch.

Five percent of voxels hid a target, which lit up only from within ten centimetres. Each pair did two ten-minute hunts, one with the cues on.
:::

---
id: why-task
chapter: Study
columns: 1 1
rows: 1 1
time: 15
---

# A treasure hunt isolates what cues should change: how a pair splits up a space

:::card icon=pin label="The unknown is where" tone=you
Targets could be anywhere, so the pair must decide who covers what. We study the cases a filter can't solve.
:::

:::card icon=person label="No expertise needed" tone=partner step cite="Synthetic tasks: Wong et al. 2015 · Prouzeau et al. 2017"
A simple probe of moving, sharing attention and dividing work, with no domain knowledge to muddy it.
:::

:::card icon=search label="Abstracts real foraging" tone=both step cite="Pirolli & Card 2005"
Hunting through masses of data for what matters is the foraging loop of analysis. This keeps the coverage problem, not the analysis.
:::

:::card icon=gauge label="Clear to measure" step
Targets found, space covered and overlap give plain numbers from a 10-minute hunt.
:::

:::notes
Why a treasure hunt? The only unknown is where the targets are, so the pair has to decide who covers what.

[click] It needs no domain expertise.

[click] It abstracts the foraging in real analysis.

[click] And it gives us plain numbers to compare.
:::

---
id: study
chapter: Study
columns: 1 1
rows: 2 1
time: 31
---

# 16 people in 8 pairs searched two spaces, with cues in one and not the other

::video src="assets/video/eval-scatter.mp4" poster="assets/video/eval-scatter.jpg" caption="Scatterplot · 100 random points" fit=contain

::video src="assets/video/eval-terrain.mp4" poster="assets/video/eval-terrain.jpg" caption="Terrain · Mt. Bruno" fit=contain

:::card label="Why random points" step
No clusters, so the data itself offers no obvious way to split it. **4 pairs** with cues, **4** without.
:::

:::card label="Why terrain" step
Peaks and valleys to talk about: do cues still help when a space has landmarks? **4 pairs** with cues, **4** without.
:::

::caveat text="Co-located AR, free to talk. Space varied within pairs, cues between pairs; pairing and order counterbalanced. Exploratory."

:::notes
We had sixteen graduate students in eight pairs, in the same room, in AR, free to talk. Each pair searched two spaces, with cues in one.

[click] One was a scatterplot of a hundred random points, with no clusters to guide the split.

[click] The other was a terrain of Mount Bruno, to ask whether cues still help when a space has landmarks of its own. Cues on versus off compares different pairs, four against four, so read my numbers as directional, except one I'll point out.
:::

---
id: measures
chapter: Study
columns: 1 1
rows: 1 1
time: 17
---

# We compared pairs with and without cues on four measures

:::card icon=search title="Targets found" tone=you
The share of the hidden targets the pair found in a hunt.
:::

:::card icon=layers title="Duplicated search" tone=both
How much partners looked at the same places: normalized redundancy from Shannon entropy, 1 − H / Hmax.
:::

:::card icon=person title="Pair gain" tone=partner
Targets the pair found, divided by what its stronger member found. 1.46× means 46% more.
:::

:::card icon=gauge title="Workload"
NASA TLX composite on a 1–7 scale, after each hunt.
:::

:::notes
Before the numbers, here's what we measured. Targets found is the share of hidden targets a pair found. Duplicated search is how much partners looked at the same places. Pair gain divides what the pair found by what its stronger member found. And workload is the NASA TLX.
:::

---
id: scatter
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 9
---

# On random points, pairs with cues tended to duplicate less and find more

::compare label="Duplicated search" a=11.3 b=3.3 max=17 a-label="Cues off" b-label="Cues on" change="−70%" tone=both

::compare label="Targets found" a=62.4 b=78.5 max=100 a-label="Cues off" b-label="Cues on" change="+16 pts" tone=you step

::caveat text="Exploratory: 4 vs 4 pairs. A direction, not a reliable difference (targets p = .11, duplicated search p = .26)."

:::notes
On the scatterplot, pairs with cues had 3.3 percent duplicated search, against 11.3 without.

[click] Pairs with cues also found more targets: 78.5 percent against 62.4.
:::

---
id: terrain
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
time: 27
---

# On terrain, pairs with cues tended to duplicate more, and attention gathered on the peaks

::compare label="Duplicated search" a=4.0 b=14.9 max=17 a-label="Cues off" b-label="Cues on" change="×3.7" tone=partner

::layers src="assets/fig/terrain-gradient.png, assets/fig/terrain-attention.png, assets/fig/terrain-overlay.png" captions="Steepness: the landmarks | Where pairs looked | Both together" steps alt="A 24 by 24 map of terrain steepness; an attention heatmap from all terrain sessions builds over it, then their overlay shows attention gathered on the steep parts."

::caveat text="Exploratory: 4 vs 4 pairs, not a reliable difference (p = .77). The map pools all terrain sessions."

:::notes
On the terrain the direction flipped. Pairs with cues had about 15 percent duplicated search, against 4 without, though that difference isn't reliable.

This map offers a clue. Here's the terrain's steepness, which is where its landmarks are.

[click] Over it is where pairs looked, across all terrain sessions.

[click] And here are both together. Attention gathers on the peaks, which drew both people to the same places, and pairs with cues often made deliberate second passes.
:::

---
id: teamwork
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
align: center
time: 21
---

# On terrain, pairs with cues got more out of working together

::compare label="Targets found by the pair, vs. its stronger member" a=1.19 b=1.46 unit="×" a-label="Cues off" b-label="Cues on" change="+0.28" tone=you

::venn a=1.19 b=1.46 a-label="Cues off" b-label="Cues on" label="What that means: less overlap in what partners found" note="If both partners found as many, the pink share is what each found that the other also found." step

::caveat text="Exact p = .029, Δ +0.28, 95% CI [0.11, 0.45], uncorrected. Exploratory: 4 vs 4 pairs."

:::notes
But terrain also gave us our one result with statistical support, at an exact p of .029. With cues, a pair found 1.46 times the targets its stronger member found, against 1.19 without.

[click] If both partners found equally many, their finds overlapped by about half with cues, instead of four fifths. So the cues helped here too.
:::

---
id: strategies-cues
chapter: Study
kicker: Result 3 · Strategies
columns: 1 1 1
time: 28
---

# With cues, people split the space, swept it in order and read the colours

:::card icon=split title="Spatial division" tone=you cite="P3 · scatterplot, with cues"
Each takes a region. People did it in every condition, most with cues on the scatterplot.

> We cut the space into top and bottom, and one search for top another search for the bottom.
:::

:::card icon=scan title="Systematic search" tone=both step cite="P12 · scatterplot, with cues"
Sweep your own region in order, then check what is still blank.

> I took one half and systematically searched through it.
:::

:::card icon=palette title="Visual feedback" tone=partner step cite="P14 · terrain, with cues"
Read the colours to see what is covered. Only possible with cues; most common on terrain.

> Used the voxel system to avoid redundant searches.
:::

:::notes
From questionnaires and interviews we also found six strategies, and three stood out with cues. The first is spatial division, where each person takes a region. As one person put it, “We cut the space into top and bottom.”

[click] The second is systematic search, where you sweep your own region in order.

[click] The third is reading the colours to stay out of each other's way. On the scatterplot, one participant told us they didn't talk at all.
:::

---
id: strategies-without
chapter: Study
kicker: Result 3 · Strategies
columns: 1 1 1
time: 19
---

# Without cues, some pairs fell back on talk, landmarks and lining up in the room

:::card icon=chat title="Verbal coordination" cite="P13 · scatterplot, no cues"
Describe positions out loud. 3 of 8 people on the scatterplot without cues; none with them.

> We tried to coordinate verbally by describing positions relative to the Scatter structure.
:::

:::card icon=flag title="Landmark navigation" step cite="P10 · terrain, no cues"
Use peaks and clusters as reference points: on terrain with or without cues, on the scatterplot only without them.

> We used landmarks and described roughly in which area we found the targets.
:::

:::card icon=align title="Physical synchronization" step cite="P6 · scatterplot, no cues"
Line both copies up in the room, so pointing means the same thing. One pair, without cues.

> We placed the Scatter in the same location in the room using the yellow triangle.
:::

:::notes
Without cues, some pairs fell back on the other three. They talked positions through.

[click] They used landmarks: on the terrain with or without cues, and on the scatterplot only with the cues off.

[click] And one pair lined up their two copies in the room, so pointing meant the same to both.
:::

---
id: people
chapter: Study
columns: 1 1 1
rows: 1 1
time: 23
---

# 15 of 16 people preferred working with the cues

::dots n=15 of=16 label="preferred working with cues" tone=both tall

::stat value="−19 / +19%" label="workload with cues: scatterplot / terrain (NASA TLX)" sub="neither reliable"

::stat value="75%" label="of the time, people kept the cues on"

:::quote who="P7, with cues" tone=both step
I can see what the other guy and I did!
:::

:::quote who="P1, the one who preferred no cues" step
It increase[d] redundant search due to visual noise
:::

:::notes
Fifteen of sixteen people preferred working with cues, and they kept the cues on three quarters of the time. Workload trended a fifth lower with cues on the scatterplot and a fifth higher on terrain, neither reliably.

[click] One said, “I can see what the other guy and I did!”

[click] The one person who preferred no cues said they added redundant search through visual noise.
:::

---
id: takeaway
chapter: Takeaways
columns: 7 5
time: 29
---

# Our hypothesis: cues help most where the space gives you little to point at

:::card label="Where we'd expect help" tone=you
- Abstract spaces without landmarks
- Large spaces you must cover fully
- Places that are hard to describe out loud

*e.g. t-SNE and UMAP embeddings, molecules, 3D networks*
:::

:::card label="Where we'd expect less" step
- Data with its own landmarks
- Scenes that are already busy
:::

:::notes
So back to our biologist, chemist and analyst. We didn't test those domains, so this is a hypothesis: cues should help most where the space gives you little to point at, where you have to cover all of it, and where a place is hard to describe out loud.

[click] Where the data has its own landmarks, or the scene is already busy, we'd expect less benefit and more clutter, although our one supported result did come from the terrain.
:::

---
id: next
chapter: Takeaways
columns: 1 1
time: 20
---

# A first step, with clear limits

:::card label="Limits"
- Tested with pairs only; we expect colour to stop scaling past ~4
- Head direction, a coarse proxy for eye gaze
- One search task, one dataset per space, 4 vs 4 pairs
- Measures are proxies: awareness itself wasn't tested
- A no-cue baseline can't separate history from live gaze
:::

:::card label="Next" tone=both step
- Test the three prototypes
- Gentler decay, and cues that appear on their own
- Attention to data items, not just space
- Remote and asynchronous teams
:::

:::notes
This is a first step. We tested pairs only, we used head direction as a proxy for gaze, and it was one search task with no cues as our only baseline.

[click] Next we want to test the prototypes, gentler decay and cues that appear on their own, attention to data items, and remote teams.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 5
---

# Thank you

## Paper, video and slides

::image src="assets/fig/terrain-caav-photo.jpg" alt="Two study participants in headsets look up at a terrain covered in blue, orange and pink attention voxels." caption="Terrain with HeedVision cues"

:::notes
Thanks for listening. Everything is behind the QR code, and I'm happy to take questions.
:::

---
id: backup-hunt
chapter: Backup
backup: yes
kicker: Backup · The task, step by step
columns: 7 5
---

# How the treasure hunt played out

::hunt steps

:::card label="Read it like this"
Two people search 100 random points. Targets are hidden until one of them gets close, from the right side. With cues on, each sees where the other has looked, and they split up.
:::

:::notes
Here's the hunt, step by step.

[click] These are the hidden targets, shown here for you.

[click] A target lights up only up close and from the correct angle.

[click] And with cues on, each person sees where the other has looked, so the pair splits the space.
:::

---
id: backup-why
chapter: Backup
backup: yes
kicker: Backup · Likely questions
columns: 1 1 1
rows: 1 1
---

# Why we built it this way

:::card label="Why head direction?"
The Quest 3 has no eye tracking. Head and gaze direction correlate strongly in VR, and pairs need *areas*, not exact fixations.
:::

:::card label="Why random scatter points?"
To remove clusters that could guide the split on their own. Real embeddings have structure, so this is an edge case: a pure abstract space.
:::

:::card label="Why a button?"
Always-on cues risk clutter and the Midas touch. People still kept them on about 75% of the time.
:::

:::card label="Why only a no-cue baseline?"
It's a first step. Gaze rays, pointer trails or markers are the next comparison, to isolate the value of history.
:::

:::card label="More than two people?"
We expect colours to hold for 2–4; we tested two. Beyond that, colour per sub-group, or texture and outlines instead.
:::

:::card label="Data already uses colour?"
We assumed colour was free. Otherwise, encode attention with texture, outline or animation.
:::

:::notes
Head direction: no eye tracking on the Quest 3, and head and gaze correlate strongly in VR. Random scatter: to take away clusters that could guide the split. Button: avoids clutter and the Midas touch; cues were still on about 75 percent of the time. Baseline: only no cues so far; gaze rays or pointer trails are next. Larger groups: colour per sub-group, or other channels. Data using colour: texture, outline or animation.
:::

---
id: backup-task
chapter: Backup
backup: yes
kicker: Backup · The task in detail
columns: 1 1
rows: 1 1
---

# How the treasure hunt worked

:::card label="Targets"
White voxels, invisible until seen from within 10 cm at the right angle. 5% of all voxels, placed with a fixed random seed.
:::

:::card label="Where they hid"
**Terrain**: on or near the surface. **Scatterplot**: anywhere in the volume around the points.
:::

:::card label="Each session"
Training before each condition, then 10 minutes of search. A short questionnaire after each; SUS and an interview at the end.
:::

:::card label="The cues"
<mark class="you">Blue</mark> for you, <mark class="partner">orange</mark> for your partner, <mark class="both">pink</mark> for both, shown with a controller button as often as people liked.
:::

:::notes
Targets were white voxels, invisible until seen from within ten centimetres at the right angle, five percent of all voxels, placed with a fixed seed. On the terrain they sat on or near the surface; in the scatterplot anywhere in the volume. Training came before each condition, a questionnaire after each, and SUS plus an interview at the end.
:::

---
id: backup-participants
chapter: Backup
backup: yes
kicker: Backup · Who took part
columns: 6 5
---

# 16 graduate students, in 8 co-located pairs

::image src="assets/fig/experiment-setup.jpg" fit=contain alt="Left: a pair studies the terrain with coloured attention voxels. Right: the same pair studies a scatterplot without cues." caption="One pair: terrain with cues, scatterplot without"

:::card label="Participants and design"
- CS, visualization and HCI students, 11 men and 5 women, ages 24–37
- Normal or corrected vision, no colour-vision deficiency
- From no mixed-reality experience to very experienced
- Quest 3 headsets, one 6 × 3 m room, free to talk
- Space varied within pairs, cues between pairs
:::

:::notes
Sixteen graduate students in computer science, visualization and HCI, aged 24 to 37, with normal or corrected vision and no colour-vision deficiency. Mixed-reality experience ranged from none to very experienced, and nobody knew the Mount Bruno terrain. Each pair searched both spaces, with cues in one; which space got cues, and the order, were counterbalanced. The study followed Aarhus University's ethics guidelines with written GDPR consent.
:::

---
id: backup-measures
chapter: Backup
backup: yes
kicker: Backup · How we measured
columns: 5 7
---

# What each number means

:::card label="Measures"
**Duplicated search** · normalized redundancy, from the Shannon entropy of where the pair looked

**Pair gain** · the pair's targets ÷ its stronger member's targets

**Efficiency** · % targets found ÷ % space covered; above 1 beats a random search

**Workload** · NASA TLX, 1–7 · **Usability** · SUS
:::

:::card label="All results, by condition"
| | Scatter off | Scatter on | Terrain off | Terrain on |
|---|---|---|---|---|
| Targets found | 62.4% | 78.5% | 19.6% | 26.0% |
| Space covered | 67.1% | 76.5% | 18.8% | 24.6% |
| Duplicated search | 11.3% | 3.3% | 4.0% | 14.9% |
| Pair gain | 1.19× | 1.33× | 1.19× | 1.46× |
| Efficiency | 0.92 | 1.03 | 1.03 | 1.00 |

Terrain pair gain +0.28, 95% CI [0.11, 0.45], *p* = .029 · scatter duplication *p* = .26 · SUS 74.4
:::

:::notes
Duplicated search is normalized redundancy from Shannon entropy. Pair gain divides the pair's targets by its stronger member's. Coverage efficiency divides the share of targets found by the share of space covered. Statistics are bootstrap confidence intervals and exact permutation tests with four pairs per cell; the terrain pair gain is the one result that holds on both the interval and the exact test. These measures are proxies for group awareness: we did not test recall of the partner's activity.
:::

---
id: backup-impl
chapter: Backup
backup: yes
kicker: Backup · Implementation
columns: 1 1
rows: 1 1
---

# What it took to keep it fast

:::card label="Built on the web"
React Three Fiber with WebXR, in the Quest browser. Shared state through Spatialstrates, DashSpace, Webstrates and Varv.
:::

:::card label="Kept responsive"
Attention at 10 Hz while rendering at 60. One voxel per hit, not a neighbourhood. Updates batched every 200–500 ms.
:::

:::card label="Data-aware"
Only voxels touching geometry collect attention. A data-agnostic version would count every voxel the ray passes.
:::

:::card label="The prototypes"
Same attention model, VR only, synced between browser tabs with BroadcastChannel. Not evaluated.
:::

:::notes
HeedVision is built with React Three Fiber and WebXR and runs in the Quest browser, with shared state through Spatialstrates, DashSpace, Webstrates and Varv. To stay responsive, attention runs at 10 Hz while rendering runs at 60, each hit updates one voxel, and updates are batched every 200 to 500 milliseconds; the network is the bottleneck. Recording is data-aware: only voxels touching geometry count.
:::

---
id: backup-qual
chapter: Backup
backup: yes
kicker: Backup · What else people said
columns: 1 1
rows: 1 1
---

# People liked the trail, and asked for it to fade more gently

:::quote who="A participant"
seeing my partner's footsteps or breadcrumbs in real time
:::

:::quote who="P5"
it was orange where they looked and got pink if I looked at it as well
:::

:::card label="Challenges"
Clutter building up over time, some lag (*“The delay is too much”*, P2), and colours hiding unexplored marks.
:::

:::card label="Ratings"
SUS 74.4, above the 68 benchmark. Favourite: scatterplot with cues (50%), terrain with cues (43.8%).
:::

:::notes
People described the cues as breadcrumbs, and the colour coding as easy to read. The complaints were clutter over time, some lag, and colours hiding unexplored marks; one participant asked for the colours to fade without them noticing. Usability averaged 74.4 on SUS.
:::

---
id: backup-space
chapter: Backup
backup: yes
kicker: Backup · The design space
columns: 1 1
rows: 1 1
---

# The rest of the design space

:::card label="Capture"
Taps or clicks, pointer movement, head direction, eye tracking: each trades off precision, implementation complexity and intrusiveness.
:::

:::card label="Record"
Data-agnostic (where, in space) or data-aware (which marks). Combine with sum, max, difference or count, with decay.
:::

:::card label="Trigger"
Always on risks the Midas touch. Explicit leaves it to you. Implicit lets the system decide from context.
:::

:::card label="Who and when"
Asynchronous teams may want fading history for handoffs; remote teams need cues that tolerate lag.
:::

:::notes
Capture can use taps, pointers, head direction or eye tracking. Recording can be data-agnostic or data-aware, with four aggregations and decay. Triggering can be always on, explicit or implicit. And the collaboration mode matters: asynchronous teams may want fading history for handoffs, remote teams need cues that tolerate lag.
:::
