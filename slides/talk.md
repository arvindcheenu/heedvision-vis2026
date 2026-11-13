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
duration: 10.4    # minutes, for presenter-view pacing

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
  ::frame src="…" poster="…" title="…"   a live page in a frame; the PDF shows the poster
  ::glyph type=joint|distributed|sequential|cumulative   a small drawing of one kind of collective attention
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
time: 17
---

:::notes
Hello everyone, I'm Arvind Srinivasan, a third year PhD candidate at the Center for Anytime Anywhere Analytics, in Aarhus University under Prof. Niklas Elmqvist, and in this talk, I’ll be presenting HeedVision, Attention Awareness in Collaborative Immersive Analytics Environments.
:::

---
id: motivation
layout: text-figure
chapter: Motivation
time: 36
---

# Searching a 3D space together

:::items steps
- **Few reference points.** One bump looks much like the next.
- **Hard to describe.** Positions are difficult to put into words.
- **Too much for one person.** So you bring in a colleague.
:::

::image src="assets/fig/motiv-molecule.jpg" fit=cover alt="The grey molecular surface of the CHK2 kinase on black, with a small red inhibitor sitting in a pocket."

::caveat text="Example: O'Connor et al., multi-user VR for molecular dynamics, Science Advances 2018. Image: Human CHK2 in complex with benzimidazole carboxamide inhibitor, BaptisteGrandGrand, Wikimedia Commons, CC BY-SA 4.0. Adapted: labels removed, background changed; adaptation CC BY-SA 4.0."

:::notes
Imagine yourself in the shoes of a chemist in a headset, walking around a protein, looking for the right pocket where a drug could fit. Unless you know where to look (the annotated spot), for an untrained eye, every bump looks like the next.

[click] In scenarios like these, it's hard to say where they've already been, even to themselves.

[click] So with too many candidates to search alone, you bring in a colleague. And that brings us to the second problem.
:::

---
id: problem
layout: figure-text
chapter: Motivation
time: 31
---

# Who looked where?

::demo modes="none,who" steps=2 bare tag="Simulated"

:::items steps=1
- **Group awareness.** The ability to perceive the activities of collaborators in a shared space.
- **Harder in immersive 3D.** Multiple viewpoints, distributed spatial attention, real-time coordination.
- **What if the space remembered?**
:::

::caveat text="Gutwin and Greenberg call this workspace awareness: an up-to-the-moment understanding of others' interaction with a shared workspace (CSCW 1998, CHI 1998)."

:::notes
Say these circles represent where each of you is looking, and neither can see the other's. You can't tell what your colleague has already checked. That's a group awareness problem.

[click] Immersive 3D makes it worse thanks to the added need of synchronizing viewpoints as you and your partner could stand in different places, making coordination difficult.

[click] So we asked: what if the space itself remembered who looked where?
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
For a single viewer, that idea already has a name.
:::

---
id: caav
layout: three
chapter: Idea
time: 49
---

# Collaborative attention-aware visualization

:::card icon=eye title="Capture" class=col step=1
Distinguish between users while tracking attention simultaneously.

<span class="rq-tag">RQ1</span><span class="rq">How should the attention of multiple viewers on a visualization be captured in real time?</span>
:::

:::card icon=layers title="Record" class=col step=2
Identity-aware accumulators, with sum, maximum, difference and count.

<span class="rq-tag">RQ2</span><span class="rq">How should the attention of multiple viewers on a visualization be recorded over time?</span>
:::

:::card icon=palette title="Revisualize" class=col step=3
Encode both attention intensity and user identity.

<span class="rq-tag">RQ3</span><span class="rq">How should the attention of multiple viewers on a visualization be displayed?</span>
:::

:::notes
Our prior work, Attention-aware visualization, captured, recorded and revisualized one viewer's attention over time. And with this paper, we extend it to more than one, and we call it collaborative attention-aware visualization, or CAAV. The three parts stay, though each a bit more specified guiding the questions we wanted to ask.

[click] In the Capture phase, since attention can't be measured directly, you need a proxy that works for everyone at once.

[click] In the Record phase, you now need a running total per person, and a way to combine them.

[click] In the Revisualize phase, while it supports reflection for one viewer, for a team it now has to support coordination.
:::

---
id: kinds
layout: full
columns: 1 1 1 1
chapter: Idea
time: 17
---

# Kinds of collective attention

:::card title="Joint"
::glyph type=joint
Both look at the same thing.
:::

:::card title="Distributed"
::glyph type=distributed
They split up the space.
:::

:::card title="Sequential"
::glyph type=sequential
One builds on where the other looked.
:::

:::card title="Cumulative"
::glyph type=cumulative
Everything the team has covered.
:::

:::notes
With several people, attention comes in kinds a single viewer never has. Joint, when both look at the same thing. Distributed, when they split up. Sequential, when one builds on the other. And cumulative, everything the team has covered.
:::

---
id: record
layout: figure-text
chapter: Idea
time: 24
---

# Recording collective attention

::demo steps=1 snapshot bare tag="Simulated"

:::items steps=1 uncover=off
- **Count.** Number of analysts who attended.
- **Sum.** Total collective attention.
- **Maximum.** Highest individual attention.
- **Difference.** Balance of attention between members.
- **Per user.** <mark class="you">Blue</mark> you, <mark class="partner">orange</mark> partner, <mark class="both">pink</mark> both.
:::

:::notes
How you combine each person's record decides which kinds you see. Count shows joint attention.

[click] Sum shows the cumulative.

[click] Maximum, whoever looked hardest.

[click] Difference, how the work was divided.

[click] And a colour per person keeps identity visible. Where colours blend, both have looked. That's what HeedVision uses.
:::

---
id: design-space
layout: full
chapter: Idea
time: 43
---

# Display: a design space

::designspace steps badge="HeedVision" highlight=world-embedded trigger=explicit

:::notes
For display, we organized the options into a preliminary design space.

[click] Attention is either embedded in the visualization or shown in a separate view. And it sits in world space, fixed in the room you share.

[click] Or in camera space, attached to your own view: always visible, but no longer lined up with the room.

[click] Then triggering: always on, on request, or decided by the system.

[click] HeedVision is embedded, in world space, on request. That gives both people the same frame of reference, so one can say “look at that orange region.”
:::

---
id: part-system
layout: section
chapter: System
time: 3
---

# System

## One corner built and evaluated

:::notes
So let's look at that corner.
:::

---
id: heedvision
layout: figure-text
chapter: System
time: 28
---

# HeedVision: colour per user

::hv steps=1

:::items steps=1
- **WebXR.** React Three Fiber, on headsets like the Meta Quest 3.
- **Explicit.** Point at a chart and press a controller button to show or hide attention.
- **Per headset.** <mark class="you">Blue</mark> is you, <mark class="partner">orange</mark> your partner, <mark class="both">pink</mark> both.
- **Opacity and decay.** More attention, more opaque. It fades when you look away.
:::

:::notes
HeedVision runs in the browser, on consumer headsets, with nothing to install.

[click] Attention stays hidden until you ask for it, so it's out of the way while you search.

[click] You are always blue and your partner orange. Where you've both looked, they blend to pink.

[click] And like memory, it builds while you look, and fades once you move on.
:::

---
id: bvh
layout: figure-text
chapter: System
time: 31
---

# Voxels collect the attention

::bvh steps=1

:::items steps=1
- **Wrap the chart.** A bounding volume hierarchy around its geometry.
- **Keep voxels that touch it.** Boxes rule out empty cells.
- **A ray from each head, at 10 Hz.** It hits the nearest voxel, which gains that person's attention.
:::

:::notes
Underneath, the chart becomes a grid of invisible voxels. A bounding volume hierarchy, boxes inside boxes, makes that fast.

[click] Only cells that touch the geometry become voxels, so attention lands on the chart and not on the empty space around it.

[click] The Quest 3 has no eye tracking, so we use head direction. That's coarse, but for coordination the general area matters more than the exact point.
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
That was one corner.

[click] The design space has three more.
:::

---
id: prototypes
layout: three
chapter: System
time: 18
---

# The other three quadrants

::clip src="assets/video/proto-world-separated.mp4" poster="assets/video/proto-world-separated.jpg" title="World, separated" caption="A movable miniature" ratio=8/5
::clip src="assets/video/proto-camera-embedded.mp4" poster="assets/video/proto-camera-embedded.jpg" title="Camera, embedded" caption="Attention on the bounding box" ratio=8/5
::clip src="assets/video/proto-camera-separated.mp4" poster="assets/video/proto-camera-separated.jpg" title="Camera, separated" caption="A 2D panel beside the data" ratio=8/5
::caveat text="Proofs of concept: VR only, synchronized locally between browser tabs. Not formally evaluated."

:::notes
We built proofs of concept for those. A movable miniature, like a minimap, for cluttered scenes. A projection onto the bounding box, for a guided tour. And a flat panel, for a colleague who joins later. They aren't evaluated yet.
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
Back to HeedVision. Does it help?
:::

---
id: hunt
layout: figure-text
columns: 3 2
chapter: Study
time: 54
---

# A treasure hunt, in the real system

::live tag="Live demo"

:::items steps
- **8 co-located pairs.** 16 participants, shared AR on Meta Quest 3, 10-minute sessions.
- **Targets.** 5% of voxels.
- **Visible up close.** From the correct angle, within 10 cm.
- **With CAAV.** Voxels show where each person has looked.
:::

:::notes
To find out, we ran a treasure hunt. This is the real system, live in the browser, as two headsets side by side. Pairs shared a room, in AR, so they could see and talk to each other.

[click] Targets are spread so that no region is richer than another. The pair has to search everywhere.

[click] And a target only appears when you're close, at the right angle. Somebody has to go and look.

[click] With CAAV, voxels take on colour as each person looks. Let me move one of them, and the trail builds up in both views.
:::

---
id: study
layout: figure-strip
chapter: Study
time: 37
---

# Two visualizations, with and without CAAV

:::row wide
::image src="assets/fig/study-terrain.jpg" fit=cover caption="Terrain × CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the terrain, with attention voxels coloured blue, orange and pink."
::image src="assets/fig/study-scatter.jpg" fit=cover caption="Scatter × No-CAAV" alt="From Figure 5 of the paper: a pair in headsets looking at the scatterplot, with nothing showing where either has looked."
:::

:::row wide
:::items
- **2 × 2 design.** Visualization × CAAV.
- **4 pairs per condition.** Counterbalanced.
- **Analysis.** Bootstrap 95% CIs, Hedges' *g*.
:::
:::items
- **Discovery, coverage.** % targets, % space.
- **Coverage efficiency.** Discovery ÷ coverage.
- **Redundancy.** Normalized Shannon entropy.
- **Target gain.** Pair ÷ mean individual.
:::
:::

:::notes
We chose two visualizations on purpose. The terrain is a real mountain, with peaks and valleys to navigate by. The scatterplot is a hundred uniform points, so its structure gives you nothing to split the work by. Each pair searched both, one with CAAV and one without.

We measured what they found and covered, how much of each other's search they repeated, and how the pair's total compares with each member's. With four pairs per condition this is exploratory, so I'll be careful about what I claim.
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
The short answer: it depends.
:::

---
id: scatter
layout: full
chapter: Results
time: 27
---

# Scatterplot: directional benefits

::plot src=assets/fig/plot-scatter.svg alt="Four panels, No-CAAV against CAAV on the scatterplot. Target discovery 62.4 versus 78.5 percent, with each pair shown as a dot. Coverage 67.1 versus 76.5 percent. Normalized redundancy 11.3 versus 3.3 percent. Target gain 1.19 versus 1.33, with each pair shown as a dot."

::caveat text="Dots: pairs. Bars: means. Targets Δ = +16.1 pp, BCa 95% CI [−0.012, +0.293], *g* = 1.12. Redundancy BCa CI [−0.172, −0.002], exact *p* = 0.257: directional. Coverage efficiency 1.027 vs. 0.920. Redrawn from Figs. 7, 8 and the text."

:::notes
First the scatterplot. Each dot is a pair, each bar a mean.

With CAAV, pairs found more targets, covered more space, and repeated far less of each other's search. Without it, one participant “had to double-check everything the other person looked at.”

Now the caution. The intervals are wide, and the one for targets just includes zero. So we call these directional.
:::

---
id: terrain
layout: two
chapter: Results
time: 42
---

# Terrain: largest gain, more redundancy

::plot src=assets/fig/plot-terrain.svg alt="Two panels, No-CAAV against CAAV on the terrain. Target gain 1.19 versus 1.46, with each pair shown as a dot and all four CAAV pairs above the No-CAAV mean. Normalized redundancy 4.0 versus 14.9 percent."
::plot src=assets/fig/plot-terrain-maps.svg step alt="Figure 9 of the paper, redrawn. Left, the terrain's gradient, darker where it is steeper. Right, aggregated attention over all terrain conditions, brightest along the same ridge, with the steepest quarter of the terrain outlined."

::caveat text="Target gain Δ = +0.277, BCa 95% CI [0.112, 0.450], *g* = 1.67, *p* = 0.029. Targets 26.0% vs. 19.6%, coverage 24.6% vs. 18.8%: CIs span zero. Gradient and attention: Pearson *r* = 0.490, Spearman *ρ* = 0.561, both *p* < 0.0001. Redrawn from Figs. 8, 9 and the text."

:::notes
On terrain, the picture changes. Target gain is the result we trust most. Pairs with CAAV got more out of working together, the interval stays clear of zero, and every CAAV pair beat the average without it.

But they also overlapped more, the opposite of the scatterplot. We saw deliberate second passes over places already covered.

[click] These maps suggest why. Left, darker means steeper: peaks, ridges, valleys. Right is where attention went, and it follows them. Landmarks draw both people to the same places, with or without CAAV. The colours show that, but don't stop it.
:::

---
id: strategies
layout: grid
chapter: Results
time: 27
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
We found six coordination strategies. The top row is what we saw more of with CAAV: splitting the space, searching methodically, and reading the colours. One pair made it a game, aiming for “a nice blue side and a nice orange side with very little overlap.”

Below: talking it through, steering by landmarks, and, only without CAAV, lining up the charts in the room.
:::

---
id: conditions
columns: 3 2
rows: 3 2
chapter: Results
time: 36
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
::stat value="93.8%" label="preferred CAAV conditions" sub="81.3% strongly agreed it improved collaboration."
::stat value="75.2%" label="of the session with attention shown" sub="All participants used the toggle."
::stat value="24%" label="lower overall workload" sub="NASA TLX, 2.79 vs. 3.69 of 7. On terrain, directionally higher."
::stat value="74.38" label="mean SUS" sub="SD 19.79. Benchmark 68."
:::

:::notes
Here they are by condition. On the scatterplot, verbal coordination drops to zero with CAAV. That may mean coordinating got cheaper. It may also mean less discussion and weaker common ground, so we don't count it as a win.

People did like it. All but one preferred CAAV, and described it as “seeing my partner's footsteps or breadcrumbs in real time.” Workload was lower overall, though on terrain it leaned the other way. And one participant kept it off for most of their session.
:::

---
id: limits
layout: two
chapter: Takeaways
time: 28
---

# Limitations and future work

:::card title="Limitations" class=head-lg
:::items
- **Scale.** Voxels get expensive at high resolutions or with many users.
- **Proxy.** Head orientation is coarser than eye tracking.
- **Scope.** Synchronous, co-located pairs, in visual search.
- **Baseline.** Only no attention visualization.
- **Awareness.** Measured through proxies, not directly.
:::
:::

:::card title="Future work" class=head-lg step=1
:::items
- **Tasks and teams.** Diverse tasks, larger teams, selective sharing.
- **Baselines.** Shared gaze rays, pointer trails, manual markers, minimaps.
- **Prototypes.** The other three quadrants, in networked AR.
- **Semantic attention.** Recording at the level of data elements.
- **Settings.** Remote and asynchronous collaboration.
:::
:::

:::notes
This is a first step, with limits. We tracked heads, not eyes. We studied pairs, in one room, on one kind of task. Our only baseline was no attention display, so we can't yet say whether the history is what helps, or any shared cue would. And we measured awareness only through behaviour.

[click] So next: other tasks, larger teams, and stronger baselines.
:::

---
id: thanks
layout: end
chapter: Takeaways
time: 60
---

# Thank you for your attention

## Takeaways

:::items steps
- **CAAV effectiveness depends critically on visualization context.** Initial evidence, in visual search.
- **Scatterplots.** Reduced redundant exploration, and emergent coordination strategies.
- **Terrain.** A large coordination gain, even as attention visualization sometimes interfered with natural coordination cues.
:::

:::notes
So, what to take away. How well CAAV works depends on the visualization. That's initial evidence, from one kind of task.

[click] In an abstract space with no landmarks, it helped pairs split the work and stop repeating each other.

[click] On terrain, pairs gained the most from working together. But the landmarks were already coordinating them, and the colours sometimes got in the way.

So, back to our two chemists. A protein's surface has few reference points, so we'd expect this to help there. That still needs testing on real tasks.

[click] The QR code takes you to the paper and these slides.
:::

---
id: toolkit
layout: text-figure
columns: 2 3
chapter: Takeaways
time: 25
---

# One more thing: the code is open source

:::items
- **caav.** A small library for adding these techniques to your own three.js and WebXR scenes.
- **Try it.** [heedvision.arvindchee.nu/toolkit](https://heedvision.arvindchee.nu/toolkit/)
- **Source.** [github.com/arvindcheenu/caav](https://github.com/arvindcheenu/caav), MIT License.
:::

::frame src="../toolkit/#try-it" poster="assets/fig/toolkit-playground.jpg" title="The caav toolkit playground: two people looking at one object, with their attention shown"

:::notes
One more thing. If you want these techniques in your own WebXR system, I've open sourced them as a small library called caav. This is its playground, running live on the slide.

And I'm in the third year of my PhD, so if all goes well, Niklas will soon successfully fire me. I'm open to postdoc and industry positions, so come find me. Thank you.
:::
