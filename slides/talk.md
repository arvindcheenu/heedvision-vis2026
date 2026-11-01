---
title: HeedVision
subtitle: Attention Awareness in Collaborative Immersive Analytics Environments
kicker: Full paper · TVCG
authors: Arvind Srinivasan, Niklas Elmqvist
affiliation: Aarhus University
venue: IEEE VIS 2026 · Boston · November 9–13
contacts: **Arvind Srinivasan** · arvind@cs.au.dk; Niklas Elmqvist · elm@cs.au.dk
url: https://heedvision.arvindchee.nu/talk/
duration: 9.5     # minutes, for presenter-view pacing; the slot allows 10 at most

# Live layer. Turn these off if the venue runs its own Q&A.
questions: on      # on | off | a link to the venue's Q&A tool
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---

<!--
HOW THIS FILE WORKS

Each slide starts with `---`. Optional settings go between two `---` lines:
  id        stable name (used in links and questions)
  layout    title | section | content (default) | end
  chapter   label in the footer band
  kicker    small line above the headline
  columns   body split, e.g. `7 5` or `1 1 1`
  rows      row split, e.g. `2 1`, or `1 auto` for a row that fits its content
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
  :::card label="…" title="…" (steps: list items appear one by one) … :::
  :::quote who="…" … :::
  :::steps reveal tones="you partner both"  - **Title** — text  :::
  :::stack … :::   :::row … :::   (put components under or beside each other)
  ::glyph type=joint|distributed|sequential|cumulative
  ::demo modes="count,sum,max,diff,who" steps snapshot bare tag="…"
        (simulation; modes in click order, plus `none`; `snapshot` freezes one
         recorded session so every mode shows the same data; `bare` hides the buttons)
  ::layers src="a.png, b.png, c.png" captions="A | B | C" steps
        (images that build one over the other)
  ::bvh steps   ::hunt steps   (explainer animations; `steps=2` starts at click 2)
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
time: 18
---

:::notes
Hi, I'm Arvind Srinivasan from Aarhus University, and this is joint work with Niklas Elmqvist.

HeedVision makes attention visible when people analyze data together in mixed reality. Scan the code to follow along or ask a question on any slide.
:::

---
id: scenario
chapter: Motivation
kicker: Imagine
columns: 7 5
time: 38
---

# Two analysts search one 3D space, but neither can see where the other has looked

::demo modes="none,who" steps=3 bare tag="Two analysts, simulated"

:::stack
:::card label="Minute 2" step=1
*“Did you check the back?”*
*“Which back?”*
:::
:::card label="Minute 10" step=2
Both searched the same cluster twice. Nobody looked underneath.
:::
:::card tone=both step=3
What if the space remembered **who looked where**?
:::
:::

:::notes
Imagine you and a colleague in headsets, hunting for a few rare outliers in a 3D embedding, say a UMAP of cell data. These two circles are where each of you is looking.

[click] Two minutes in: “Did you check the back?” “Which back?” An embedding has no back, and no landmarks to name.

[click] Ten minutes in, you've both searched the same cluster, and nobody looked underneath.

[click] Now imagine the space remembered who looked where. That's this talk.
:::

---
id: gap
chapter: Motivation
kicker: Why it's hard
columns: 1 1 1
time: 24
---

# Teams split up work by seeing each other. Headsets take that away.

:::card label="At a desk" title="Group awareness"
Seeing what collaborators are doing is what lets a team divide the work. *Gutwin & Greenberg, 1998*
:::

:::card label="In a headset" title="Separate viewpoints" tone=partner step
Everyone stands somewhere else. There's no shared screen to point at.
:::

:::card label="Our prior work" title="Attention-aware vis" tone=you step
Tracks where *one* viewer looked and feeds it back into the display. Built for one person.
:::

:::notes
This is group awareness: seeing what collaborators are doing, which lets a team divide the work.

[click] In a headset it's harder. Everyone has their own viewpoint, and no shared screen to point at.

[click] Our earlier attention-aware visualizations tracked where a viewer looked and fed it back into the display. But only for one person.
:::

---
id: part-idea
layout: section
chapter: Idea
time: 4
---

# From one viewer to many

## Collaborative attention-aware visualization

:::notes
So: how do we carry that idea over to a group?
:::

---
id: caav
chapter: Idea
kicker: The idea · CAAV
time: 26
---

# Every stage of attention-aware vis gets a new job when a group is watching

:::steps reveal tones="you partner both"
- **Capture** — Track everyone at once, and know who is who. *RQ1*
- **Record** — Keep one memory per person per spot, and combine them. *RQ2*
- **Display** — Show *whose* attention, not just how much. *RQ3*
:::

:::notes
Attention-aware visualizations capture attention, record it, and display it. Collaborative ones, CAAVs, give each stage a group job. [click] Capture tracks everyone and knows who is who. [click] Recording keeps one memory per person per spot. [click] And the display shows whose attention it is. These are our three research questions.
:::

---
id: kinds
chapter: Idea
kicker: RQ1 · Capture
columns: 1 1 1 1
time: 22
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
Two people create kinds of attention one viewer never has. [click] Joint: we look at the same thing. [click] Distributed: we split up. [click] Sequential: I build on where you looked. [click] And cumulative: everything the team has covered.

We capture it through proxies like pointing, head direction or eye tracking, each tagged with who it came from.
:::

---
id: record
chapter: Idea
kicker: RQ2 · Record
time: 40
---

# One recorded session, combined five ways: each way shows a different pattern

::demo steps snapshot tag="One recorded session"

:::notes
Recording. Here is one recorded session of two people. Each spot keeps one value per person that grows while someone looks and fades over time. Same data, combined five ways.

Count: how many people looked here. Just grey squares.

[click] Sum: faint where attention was brief, solid where heavy. That shows coverage.

[click] Max: the stronger of the two.

[click] Difference: shared spots fade. That shows division of labour.

[click] And Who adds colour: blue for you, orange for your partner, pink for both. That's what HeedVision shows.
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
For display, a design space. [click] Embed attention in the visualization, or in a separate view. [click] Anchor it in the shared world, or to your own view.

[click] And three triggers: always on, on request, or automatic.

[click] HeedVision takes the world-space, embedded corner, on request: embedding keeps context, a shared world lets people say “look at that orange patch,” and a button keeps the trail out of the way. We'll come back to the other corners.
:::

---
id: part-system
layout: section
chapter: System
time: 4
---

# HeedVision

## One corner built and tested, three as prototypes

:::notes
Here's how we built it.
:::

---
id: heedvision
chapter: System
kicker: The system
columns: 1 1 1
rows: 2 1
time: 28
---

# HeedVision paints attention onto the data as coloured voxels

::video src="assets/video/heedvision.mp4" poster="assets/video/heedvision.jpg" caption="From the video figure" fit=contain live=heedvision wide

::stat value="1 button" label="shows the trail only when you ask, so it never clutters the search" tone=you step

::stat value="3 colours" label="blue you, orange partner, pink both; safe for common colour blindness" tone=both step

::stat value="Opacity" label="more attention, more solid; it fades as time passes" tone=partner step

:::notes
HeedVision runs in the Meta Quest 3 browser, built with WebXR and React Three Fiber, with both headsets sharing one scene.

[click] The trail stays hidden until you press a button.

[click] Then you see blue where you looked, orange for your partner, pink for both, colours chosen to stay distinct with common colour blindness.

[click] The more attention, the more solid the voxel.
:::

---
id: bvh
chapter: System
kicker: Under the hood
columns: 7 5
time: 40
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
Each head's ray hits the nearest voxel, which gains attention, then fades.
:::
:::

:::notes
Under the hood. When a chart loads, we wrap its geometry in a bounding volume hierarchy: boxes inside boxes.

[click] Then we lay a grid over it. The boxes rule out most cells without testing a single triangle, and only cells touching the geometry become voxels. So attention sticks to the data, on one grid both headsets share.

[click] Ten times a second, a ray along each head hits the nearest voxel and adds to that person's value, which then fades. Head direction, because the Quest 3 has no eye tracking.
:::

---
id: prototypes
chapter: System
kicker: Back to the design space
time: 10
---

# We also built the other three corners, as proofs of concept

::designspace highlight="world-separated camera-embedded camera-separated" badge="Proof of concept" done=world-embedded done-badge="HeedVision · tested" trigger=none

:::notes
Back to the design space. HeedVision is the corner we tested. To show the space produces real designs, we also built the other three.
:::

---
id: quadrants
chapter: System
kicker: The three prototypes
columns: 1 1 1
rows: 5 1
time: 25
---

# Each prototype suits a different kind of teamwork

::image src="assets/fig/q-world-separated.jpg" alt="A small replica of the terrain floats beside the main view, showing attention." caption="World · separated: a miniature, for cluttered scenes" step

::image src="assets/fig/q-camera-embedded.jpg" alt="Attention projected onto the faces of the terrain's bounding box." caption="Camera · embedded: projections, for guided tours" step

::image src="assets/fig/q-camera-separated.jpg" alt="A 2D panel beside the terrain shows the attention map." caption="Camera · separated: a 2D panel, for handoffs" step

::caveat text="VR only, synced locally between browser tabs, and not part of the study."

:::notes
[click] A miniature you can move around, like a minimap, for scenes too cluttered to read directly.

[click] Projections on the faces of the bounding box, for when everyone shares one viewpoint, like a guided tour.

[click] And a 2D panel, which suits handoffs: someone joining later sees where you have been. These run in VR only, and we haven't evaluated them.
:::

---
id: part-study
layout: section
chapter: Study
time: 4
---

# Does it help?

## An exploratory study with 8 pairs

:::notes
Then the real question: does it help?
:::

---
id: task
chapter: Study
kicker: The task · a treasure hunt
columns: 7 5
time: 36
---

# Pairs hunted for hidden targets that only light up when you look closely

::hunt steps=1

:::stack
::stat value="10 min" label="per hunt, as a pair"
::stat value="5%" label="of voxels hide a target, spread so no region is richer" step=1
::stat value="10 cm" label="a target lights up only this close, from the right side" step=2
:::

:::notes
Our task was a treasure hunt. Each pair had ten minutes to find hidden white targets.

[click] Targets were five percent of the voxels, spread so no region was richer than another. You had to cover everything.

[click] And a target only lit up from within ten centimetres, from the right side, so you couldn't scan from afar.

[click] In one of their two hunts, the pair had the cues on.
:::

---
id: why-task
chapter: Study
kicker: Why a treasure hunt
columns: 1 1
rows: 1 1
time: 32
---

# A treasure hunt isolates what cues should change: how a pair splits up a space

:::card label="The unknown is where" tone=you
Targets could be anywhere, so the pair must decide who covers what. Filtering would skip the search entirely.
:::

:::card label="No expertise needed" step
A simple probe of moving, sharing attention and dividing work, with no domain knowledge to muddy it.
:::

:::card label="Like real exploration" step
Needle-in-a-haystack search is common in exploratory analysis, and a standard probe in immersive analytics.
:::

:::card label="Clear to measure" step
Targets found, space covered and overlap give plain numbers from a 10-minute hunt.
:::

:::notes
Why a treasure hunt? Our question is how a pair divides a space, and here the only unknown is where the targets are. The pair must decide who covers what; a filter would skip the search.

[click] It needs no domain expertise, so nothing else muddies the coordination.

[click] It mirrors needle-in-a-haystack search in exploratory analysis, and visual search is a standard probe in immersive analytics.

[click] And it gives clear numbers in ten minutes.
:::

---
id: study
chapter: Study
kicker: The study
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
Sixteen graduate students in eight pairs, co-located in AR and free to talk. Each pair searched two spaces, with cues in one.

[click] A scatterplot of a hundred random points, without clusters, so only the cues could guide the split.

[click] And a terrain of Mount Bruno, full of landmarks: do cues still help when the space has its own? Four pairs per cell, so read the numbers as trends.
:::

---
id: scatter
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 22
---

# Without landmarks, pairs duplicated 70% less and found more targets

::compare label="Duplicated search" a=11.3 b=3.3 a-label="Cues off" b-label="Cues on" change="−70%" tone=both

::compare label="Targets found" a=62.4 b=78.5 a-label="Cues off" b-label="Cues on" change="+16 pts" tone=you step

::caveat text="Exploratory: 4 pairs per condition, so a trend, not a significant result."

:::notes
In the scatterplot, the trend favours the cues. Duplicated search dropped from 11.3 to 3.3 percent: about 70 percent less.

[click] And pairs found more of the targets, 78.5 versus 62.4 percent, sixteen points more.

With four pairs per condition, these are trends, not significant results.
:::

---
id: scatter-talk
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 20
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
Coordination changed too. One participant said that with cues, they didn't talk at all.

[click] Pairs split the space up front and used the colours to stick to the plan. Less talk can mean lower cost, or less discussion.
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

::layers src="assets/fig/terrain-gradient.png, assets/fig/terrain-attention.png, assets/fig/terrain-overlay.png" captions="Steepness: the landmarks | Where pairs looked | Both together" steps alt="A 24 by 24 map of terrain steepness; an attention heatmap from all terrain sessions builds over it, then their overlay shows attention gathered on the steep parts."

::caveat text="Exploratory: 4 pairs per condition."

:::notes
On the terrain, duplicated search went up with cues, from 4 to about 15 percent.

Why? This is the terrain's steepness, its landmarks. [click] Over it, where pairs looked. [click] Attention gathers on the steep parts: peaks pulled both people to the same places, the voxels showed it, and pairs went back for second passes.
:::

---
id: teamwork
chapter: Study
kicker: Result 2 · Terrain
columns: 1 1
time: 20
---

# Yet terrain is where working together paid off most

::compare label="Targets found by the pair, vs. its average member" a=1.19 b=1.46 unit="×" a-label="Cues off" b-label="Cues on" change="+23%" tone=you

::dots n=4 of=4 label="pairs with cues beat the average pair without" tone=you step

:::notes
Yet terrain gave our clearest result. With cues, a pair found 1.46 times what its average member found alone, against 1.19 without.

[click] All four pairs with cues beat the no-cue average. So the cues didn't fail here. The landscape already offered cues of its own.
:::

---
id: people
chapter: Study
kicker: What people said
columns: 1 1 1
time: 20
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
Fifteen of sixteen preferred the conditions with cues. Workload was about a quarter lower overall, though higher in terrain, and people kept the cues on three quarters of the time.

[click] Some made a game of it: a nice blue side and a nice orange side with very little overlap.
:::

---
id: takeaway
chapter: Takeaways
kicker: Takeaway
columns: 7 5
time: 24
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
Back to our two analysts in the embedding. Attention cues seem most useful where the space gives you nothing to point at: embeddings, molecules, 3D networks, when you must cover all of it.

[click] Where the data has its own landmarks, the cues add to what people already use, and to the clutter.
:::

---
id: next
chapter: Takeaways
kicker: Limits and next steps
columns: 1 1
time: 24
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
This is a first step: pairs, head direction, one task, colours that stop scaling past four. Our only baseline was no cues, so gaze rays or pointer trails might give part of this.

[click] Next: test the prototypes, cues that fade or appear on their own, attention to data items, and remote teams.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 10
---

# Thank you

## Slides, script and your questions

::image src="assets/fig/terrain-caav-photo.jpg" alt="Two study participants in headsets look up at a terrain covered in blue, orange and pink attention voxels." caption="Terrain with HeedVision cues"

:::notes
Thank you. The slides, this script and a place for your questions are behind the code. I'm happy to take questions.
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
Blue for you, orange for your partner, pink for both, shown with a controller button as often as people liked.
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
