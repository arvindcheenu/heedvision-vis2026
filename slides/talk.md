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
time: 15
---

:::notes
Hi everyone, I'm Arvind Srinivasan, and this is work with Niklas Elmqvist.

HeedVision shows people analyzing data together in mixed reality where each of them has already looked. The code takes you to the paper, the video and these slides.
:::

---
id: hook-up
layout: photo
chapter: Motivation
image: assets/fig/hook-cells.jpg
alt: A UMAP of single-cell RNA-seq data on black: thousands of cells in coloured clusters, with a few green cells scattered between them.
credit: UMAP of single-cell data · NIAID, public domain
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
credit: CHK2 kinase with an inhibitor in its pocket · BaptisteGrandGrand, CC BY-SA 4.0
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
credit: Partial map of the Internet, 2005 · The Opte Project, CC BY 2.5
cite: Cordeil et al., collaborative network analysis in VR, TVCG 2017
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
time: 22
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
So now there are two of you in the same space, and these circles show where you're each looking.

[click] Two minutes in: “Did you check the back?” “Which back?” An embedding doesn't have a back.

[click] Ten minutes in, you've both searched one cluster twice, and nobody's looked underneath it.

[click] So we asked, what if the space remembered who looked where?
:::

---
id: gap
chapter: Motivation
columns: 5 7
time: 27
---

# Teams split up work by seeing each other. Headsets take that away.

:::stack
:::card label="At a desk" title="Group awareness" cite="Gutwin & Greenberg, CHI 1998"
Seeing what others are doing is how a team divides the work.
:::
:::card label="In a headset" title="Separate viewpoints" tone=partner step
Everyone stands somewhere else, with no shared screen to point at.
:::
:::

:::card label="Our prior work" title="Attention-aware visualization" tone=you step cite="Srinivasan et al., TVCG 2025"
::image src="assets/fig/aav-teaser.jpg" fit=contain alt="The attention-aware visualization teaser: attention heatmaps on 3D bar charts, scatterplots and terrains, captured by headset orientation or eye tracking."
Tracks where *one* viewer looks over time, and changes the display in response. Built for one person.
:::

:::notes
At a desk, you can see what the other person is doing, and that's how a team divides up work. Gutwin and Greenberg called that group awareness.

[click] In a headset it's harder. You each stand somewhere else, with no shared screen to point at.

[click] We'd already worked on part of this. Our attention-aware visualizations track where someone looks over time and change the display in response, but we built those for one person.
:::

---
id: part-idea
layout: section
chapter: Idea
image: assets/fig/section-pair.jpg
time: 7
---

# From one viewer to many

## Collaborative attention-aware visualization

:::notes
So we took that idea from one viewer to many. We call it collaborative attention-aware visualization, or CAAV.
:::

---
id: caav
chapter: Idea
time: 28
---

# Every stage of attention-aware vis gets a new job when a group is watching

:::steps reveal tones="you partner both" icons="eye layers palette"
- **Capture** — Track everyone at once, and know who is who. {RQ1 | How should the attention of multiple viewers on a visualization be **captured in real time**?}
- **Record** — Keep one memory per person per spot, and combine them. {RQ2 | How should the attention of multiple viewers on a visualization be **recorded over time**?}
- **Display** — Show *whose* attention it is, as well as how much. {RQ3 | How should the attention of multiple viewers on a visualization be **displayed**?}
:::

:::notes
Attention-aware vis captures attention, records it and displays it. With a group, each stage changes, and that gave us our three research questions: how should the attention of multiple viewers be captured in real time, recorded over time, and displayed?

[click] Capture has to track everyone at once and know who is who.

[click] Recording keeps one memory per person per spot, and combines them.

[click] And the display has to show whose attention it is, as well as how much.
:::

---
id: kinds
chapter: Idea
kicker: RQ1 · Capture
columns: 1 1 1 1
time: 21
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
Start with capture. Two people create four kinds of attention that one viewer can't.

[click] Joint: we look at the same thing.

[click] Distributed: we split up the space.

[click] Sequential: I build on where you looked.

[click] And cumulative: everything the team has covered. You capture it through pointing, head direction or eye tracking, tagged with who it came from.
:::

---
id: record
chapter: Idea
kicker: RQ2 · Record
time: 30
---

# One recorded session, combined five ways: each way shows a different pattern

::demo steps snapshot tag="One recorded session"

:::notes
For recording, each spot keeps one value per person, which grows while you look and fades when you stop. This is one session of two people, shown five ways.

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
time: 32
---

# Where attention appears is a design choice: 4 placements × 3 triggers

::designspace steps badge="HeedVision · tested" highlight=world-embedded trigger=explicit

:::notes
Then where do you show all this? For display, we laid out a design space.

[click] Attention can sit in the visualization or in a separate view,

[click] anchored in the shared world or to your own camera. So that's four placements.

[click] Then three triggers: always on, on request, or automatic.

[click] HeedVision is world-space, embedded, on request. Embedding keeps attention on the data, a shared world lets you say “look at that orange patch,” and your partner knows where you mean. The button keeps the trail out of the way.
:::

---
id: part-system
layout: section
chapter: System
image: assets/fig/terrain-caav-photo.jpg
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
time: 28
---

# HeedVision colours the data wherever each person has looked

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
HeedVision runs in the browser on a Quest 3, on a framework called Spatialstrates, so both headsets share one scene. When you look at something, both copies change.

[click] The trail is recorded all along, but it stays hidden until you press a button.

[click] Then <mark class="you">blue</mark> is you, <mark class="partner">orange</mark> is your partner, <mark class="both">pink</mark> is both. Those colours hold up under common colour blindness.

[click] The longer you look, the more solid the voxel gets, and when you leave, it fades.
:::

---
id: bvh
chapter: System
columns: 7 5
time: 37
---

# A bounding volume hierarchy turns any chart into voxels that collect attention

::bvh steps=1

:::stack
:::card label="1 · Wrap the chart in boxes"
Nested boxes around its geometry, built once.
:::
:::card label="2 · Keep voxels that touch it" step=1
Boxes rule out empty space fast, so attention sticks to the data.
:::
:::card label="3 · A ray, 10 times a second" step=2
Straight out of each headset, it hits the nearest voxel, which gains attention, then fades.
:::
:::

:::notes
Under the hood, when a chart loads, we wrap its geometry in a bounding volume hierarchy, which is just boxes inside boxes. We only have to build that once.

[click] Then we lay a grid over it. The boxes rule out most cells without testing a triangle, and only cells touching the geometry become voxels. So attention sticks to the data.

[click] Ten times a second, a ray goes straight out of the centre of each headset's view. It hits the nearest voxel, which gains attention for that person and then fades. We use head direction because the Quest 3 has no eye tracking.
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
time: 20
---

# Each prototype suits a different kind of teamwork

::clip src="assets/video/proto-world-separated.mp4" poster="assets/video/proto-world-separated.jpg" title="World · separated" caption="A miniature you can move, for cluttered scenes" ratio=8/5 step

::clip src="assets/video/proto-camera-embedded.mp4" poster="assets/video/proto-camera-embedded.jpg" title="Camera · embedded" caption="Attention projected onto the box, for guided tours" ratio=8/5 step

::clip src="assets/video/proto-camera-separated.mp4" poster="assets/video/proto-camera-separated.jpg" title="Camera · separated" caption="A 2D panel beside the data, for handoffs" ratio=8/5 step

::caveat text="VR only, synced locally between browser tabs, and not part of the study."

:::notes
[click] There's a miniature you can move, like a minimap, for cluttered scenes.

[click] There's attention projected onto the bounding box, which suits a guided tour, where everyone shares one viewpoint.

[click] And there's a 2D panel beside the data, good for handoffs, when someone joins later. These run in VR only, and they weren't in the study.
:::

---
id: part-study
layout: section
chapter: Study
image: assets/video/eval-scatter.jpg
time: 6
---

# Does it help?

## An exploratory study with 8 pairs

:::notes
So, does any of this help? We ran an exploratory study with eight pairs to find out.
:::

---
id: task
chapter: Study
columns: 1 1 1
rows: 5 2
time: 30
---

# The task: a treasure hunt for targets that light up only up close

::live wide tag="Live · the HeedVision demo, forked"

::stat value="10 min" label="per hunt, as a pair"

::stat value="5%" label="of voxels hide a target, lit only from within 10 cm"

::stat value="1 of 2" label="hunts had the cues on"

:::notes
The task was a treasure hunt. This is our demo, running live: two headsets, one shared scene. Wherever someone looks, voxels fill in. Your own are blue, your partner's are gold here, and shared ones are pink. Clicking the sphere hides your voxels, and participants had that same switch. Pairs got ten minutes per hunt.

Five percent of voxels hid a target, and a target lit up only from within ten centimetres. And one of their two hunts had the cues on.
:::

---
id: why-task
chapter: Study
columns: 1 1
rows: 1 1
time: 24
---

# A treasure hunt isolates what cues should change: how a pair splits up a space

:::card icon=pin label="The unknown is where" tone=you
Targets could be anywhere, so the pair must decide who covers what. A filter would skip the search entirely.
:::

:::card icon=person label="No expertise needed" tone=partner step cite="Synthetic tasks: Cockburn et al. 2006 · Wong et al. 2015"
A simple probe of moving, sharing attention and dividing work, with no domain knowledge to muddy it.
:::

:::card icon=search label="Like real exploration" tone=both step cite="Grinstein et al. 2002 · Pirolli & Card 2005 · Prouzeau et al. 2017 · Marguet et al. 2025"
Needle-in-a-haystack search is common in exploratory analysis, and visual search is a standard probe in immersive analytics.
:::

:::card icon=gauge label="Clear to measure" step
Targets found, space covered and overlap give plain numbers from a 10-minute hunt.
:::

:::notes
Why a treasure hunt? The only unknown is where the targets are, so the pair has to decide who covers what. If they could filter the data, there'd be no search at all.

[click] It needs no domain expertise.

[click] It's like the needle-in-a-haystack search in exploratory analysis, and it's a standard probe in immersive analytics.

[click] And it gives us plain numbers: targets found, space covered, overlap.
:::

---
id: study
chapter: Study
columns: 1 1
rows: 2 1
time: 32
---

# 16 people in 8 pairs searched two spaces, with cues in one and not the other

::video src="assets/video/eval-scatter.mp4" poster="assets/video/eval-scatter.jpg" caption="Scatterplot · 100 random points"

::video src="assets/video/eval-terrain.mp4" poster="assets/video/eval-terrain.jpg" caption="Terrain · Mt. Bruno"

:::card label="Why random points" step
No clusters or landmarks, so nothing but the cues can guide the split. **4 pairs** with cues, **4** without.
:::

:::card label="Why terrain" step
Peaks and valleys to talk about: do cues still help when a space has landmarks? **4 pairs** with cues, **4** without.
:::

::caveat text="Space–cue pairing and order counterbalanced. Exploratory: 4 pairs per cell."

:::notes
We had sixteen graduate students in eight pairs, in the same room, in AR, free to talk. Each pair searched two spaces, with cues in one.

[click] A scatterplot of a hundred random points, with no landmarks, so only the cues could guide the split.

[click] And a terrain of Mount Bruno, to ask whether cues still help when a space has landmarks of its own. We counterbalanced which space had the cues, and the order. That leaves four pairs per condition, so please read these numbers as trends.
:::

---
id: scatter
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 15
---

# Without landmarks, pairs duplicated 70% less and found more targets

::compare label="Duplicated search" a=11.3 b=3.3 a-label="Cues off" b-label="Cues on" change="−70%" tone=both

::compare label="Targets found" a=62.4 b=78.5 a-label="Cues off" b-label="Cues on" change="+16 pts" tone=you step

::caveat text="Exploratory: 4 pairs per condition, so a trend, not a significant result."

:::notes
In the scatterplot, the trend favours the cues. Duplicated search dropped from 11.3 percent to 3.3, about 70 percent less.

[click] And pairs found more targets: 78.5 percent against 62.4, so sixteen points more. Again, these are trends, not significant results.
:::

---
id: terrain
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
time: 23
---

# On a landscape, overlap went up 3.7×, because peaks pulled both partners in

::compare label="Duplicated search" a=4.0 b=14.9 a-label="Cues off" b-label="Cues on" change="×3.7" tone=partner

::layers src="assets/fig/terrain-gradient.png, assets/fig/terrain-attention.png, assets/fig/terrain-overlay.png" captions="Steepness: the landmarks | Where pairs looked | Both together" steps alt="A 24 by 24 map of terrain steepness; an attention heatmap from all terrain sessions builds over it, then their overlay shows attention gathered on the steep parts."

::caveat text="Exploratory: 4 pairs per condition."

:::notes
On the terrain it went the other way. Duplicated search went from 4 percent to about 15, so 3.7 times as much.

This map shows why. Here's the terrain's steepness, which is where its landmarks are.

[click] Over it, where pairs looked.

[click] And both together. Peaks pulled both people to the same places, the voxels showed that, and pairs went back for second passes.
:::

---
id: teamwork
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
align: center
time: 21
---

# Yet terrain is where working together paid off most

::compare label="Targets found by the pair, vs. its average member" a=1.19 b=1.46 unit="×" a-label="Cues off" b-label="Cues on" change="+23%" tone=you

::venn a=1.19 b=1.46 a-label="Cues off" b-label="Cues on" label="What that means: less overlap in what partners found" note="If both partners found as many, the pink share is what each found that the other also found." step

:::notes
But terrain also gave us our clearest result. With cues, a pair found 1.46 times what its average member found, against 1.19 without, so 23 percent higher.

[click] Put another way, partners' finds overlapped by about half with cues, instead of four fifths. So the cues helped here too. The landscape just already gave people a lot to go on.
:::

---
id: strategies-cues
chapter: Study
kicker: Result 3 · Strategies
columns: 1 1 1
time: 31
---

# With cues, pairs split the space and let the colours keep score

:::card icon=split title="Spatial division" tone=you cite="P3 · scatterplot, with cues"
Each takes a region. Pairs did it in every condition, most with cues on the scatterplot.

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
We also wanted to know how pairs actually worked together, and from questionnaires and interviews we found six strategies. With cues, they split the space. Pairs did that in every condition, but most of all with cues on the scatterplot. As one person put it, “We cut the space into top and bottom.”

[click] They swept their own part in order.

[click] And they read the colours to stay out of each other's way. On the scatterplot, one participant told us they didn't talk at all.
:::

---
id: strategies-without
chapter: Study
kicker: Result 3 · Strategies
columns: 1 1 1
time: 23
---

# Without cues, pairs fell back on talk, the room, and any landmarks the data had

:::card icon=chat title="Verbal coordination" cite="P13 · scatterplot, no cues"
Describe positions out loud. Common without cues on the scatterplot; gone with them.

> We tried to coordinate verbally by describing positions relative to the Scatter structure.
:::

:::card icon=flag title="Landmark navigation" step cite="P10 · terrain, no cues"
Use peaks and clusters as reference points: on terrain always, on the scatterplot only without cues.

> We used landmarks and described roughly in which area we found the targets.
:::

:::card icon=align title="Physical synchronization" step cite="P6 · scatterplot, no cues"
Line both copies up in the room, so pointing means the same thing. Only without cues.

> We placed the Scatter in the same location in the room using the yellow triangle.
:::

:::notes
Without cues, pairs fell back on what they had. They talked positions through, which was common on the scatterplot and disappeared once the cues were on.

[click] They used landmarks: on the terrain with or without cues, and on the scatterplot only with the cues off.

[click] And some lined up both copies in the room, so that pointing meant the same thing to both.
:::

---
id: people
chapter: Study
columns: 1 1 1
rows: 1 1
time: 24
---

# 15 of 16 people preferred working with the cues

::dots n=15 of=16 label="preferred the conditions with cues" tone=both tall

::stat value="−24%" label="workload overall (NASA TLX)" sub="but it trended higher in terrain"

::stat value="75%" label="of the time, people kept the cues on"

:::quote who="P7, with cues" tone=both step
I can see what the other guy and I did!
:::

:::quote who="P1, the one who preferred no cues" step
It increase[d] redundant search due to visual noise
:::

:::notes
People liked it. Fifteen of sixteen preferred the conditions with cues. Workload was about a quarter lower overall on the NASA TLX, though higher on terrain, and people kept the cues on three quarters of the time.

[click] One said, “I can see what the other guy and I did!”

[click] The one person who preferred no cues said they increased redundant search because of visual noise.
:::

---
id: takeaway
chapter: Takeaways
columns: 7 5
time: 25
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
So back to our biologist, chemist and analyst. Cues look most useful where the space gives you nothing to point at, where you have to cover all of it, and where it's hard to describe a place out loud. Embeddings, molecules and 3D networks are all like that.

[click] Where the data has its own landmarks, or the scene is already busy, they add less, and they add clutter.
:::

---
id: next
chapter: Takeaways
columns: 1 1
time: 27
---

# A first step, with clear limits

:::card label="Limits"
- Pairs only; colours stop scaling past ~4 people
- Head direction, not eye tracking
- One task, 4 pairs per condition
- Only baseline: no cues at all
:::

:::card label="Next" tone=both step
- Test the three prototypes
- Cues that fade or appear on their own
- Attention to data items, not just space
- Remote and asynchronous teams
:::

:::notes
This is a first step. We only looked at pairs, and the colours stop scaling past about four people. We used head direction, not eye tracking. And it was one task, with four pairs per condition, and our only baseline was no cues at all.

[click] Next we want to test the three prototypes, try cues that fade or appear on their own, track attention to data items, and look at remote and asynchronous teams.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 7
---

# Thank you

## Slides, script and your questions

::image src="assets/fig/terrain-caav-photo.jpg" alt="Two study participants in headsets look up at a terrain covered in blue, orange and pink attention voxels." caption="Terrain with HeedVision cues"

:::notes
Thanks for listening. The paper, the video and these slides are behind the code, and I'm happy to take questions.
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
The hunt, step by step: the hidden targets, the rule that a target lights up only up close and from its open side, and how cues let the pair split the space.
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
To remove clusters that could guide the split on their own. Real embeddings have structure, so this is the hard case.
:::

:::card label="Why a button?"
Always-on cues risk clutter and the Midas touch. People still kept them on about 75% of the time.
:::

:::card label="Why only a no-cue baseline?"
It's a first step. Gaze rays, pointer trails or markers are the next comparison, to isolate the value of history.
:::

:::card label="More than two people?"
Colours hold for 2–4. Beyond that, colour per sub-group, or texture and outlines instead.
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

**Pair gain** · the pair's targets ÷ the mean of its two members' targets

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
Duplicated search is normalized redundancy from Shannon entropy. Pair gain divides the pair's targets by the mean of its members'. Coverage efficiency divides the share of targets found by the share of space covered. Statistics are bootstrap confidence intervals and exact permutation tests with four pairs per cell; the terrain pair gain is the one result with an interval clear of zero. These measures are proxies for group awareness: we did not test recall of the partner's activity.
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
Taps or clicks, pointer movement, head direction, eye tracking: more precise means more intrusive.
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
