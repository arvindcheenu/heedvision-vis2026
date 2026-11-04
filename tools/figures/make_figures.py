#!/usr/bin/env python3
"""Draws the result plots in slides/assets/fig/ from tools/figures/data/.

    python3 tools/figures/make_figures.py

The numbers are the paper's. Plots are SVG with live text, so they take the
site's fonts and accent colour when the deck inlines them (the `::plot` component).
Fork it: swap the CSVs and the panel definitions at the bottom.
"""
import csv
import re
from pathlib import Path

import matplotlib

matplotlib.use("svg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch
from scipy.ndimage import gaussian_filter

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE.parent.parent / "slides" / "assets" / "fig"

ACCENT = "#ff00aa"  # placeholder, swapped for var(--accent) on write
INK, MUTED, GREY, LINE = "#111111", "#6e6e6b", "#8d8d8a", "#cfcfca"
plt.rcParams.update({
    "svg.fonttype": "none", "font.family": "DejaVu Sans", "font.size": 30,
    "axes.edgecolor": LINE, "axes.linewidth": 2, "axes.labelcolor": MUTED,
    "xtick.color": INK, "ytick.color": MUTED, "text.color": INK,
    "xtick.major.size": 0, "ytick.major.size": 6, "ytick.major.width": 2, "ytick.major.pad": 8,
})

pairs = list(csv.DictReader(open(DATA / "per_pair.csv")))
conds = {r["condition"]: r for r in csv.DictReader(open(DATA / "conditions.csv"))}


def per_pair(geom, caav, col, f=lambda v: v):
    return [f(float(r[col])) for r in pairs if r["geometry"] == geom and r["caav_label"] == caav]


def spread(values, width=0.13):
    """Side-by-side offsets for dots with near values (no randomness)."""
    order = np.argsort(values)
    span = (max(values) - min(values)) or 1
    out = np.zeros(len(values))
    for rank, i in enumerate(order):
        close = [j for j in order[:rank] if abs(values[i] - values[j]) < span * 0.1]
        out[i] = width * ((len(close) + 1) // 2) * (1 if len(close) % 2 else -1)
    return out


def panel(ax, title, stat, off, on, ylim, ticks, fmt, base=0):
    """No-CAAV and CAAV side by side. Lists are per-pair dots with a mean bar; scalars are stems."""
    for x, vals, color in ((0, off, GREY), (1, on, ACCENT)):
        if isinstance(vals, list):
            ax.scatter(x + spread(vals), vals, s=300, color=color, alpha=0.6, linewidths=0, zorder=2, clip_on=False)
            mean = float(np.mean(vals))
            ax.hlines(mean, x - 0.28, x + 0.28, color=color, linewidth=7, zorder=3)
        else:
            mean = vals
            ax.vlines(x, base, mean, color=color, linewidth=7, zorder=2)
            ax.scatter([x], [mean], s=440, color=color, zorder=3, clip_on=False)
        ax.annotate(fmt(mean), (x + 0.33, mean), va="center", fontsize=34, fontweight="bold", color=INK if color == GREY else ACCENT)
    ax.set_xlim(-0.5, 2.0)
    ax.set_ylim(*ylim)
    ax.set_xticks([0, 1], ["No-CAAV", "CAAV"])
    ax.set_yticks(ticks)
    ax.tick_params(axis="x", labelsize=30, pad=14)
    ax.tick_params(axis="y", labelsize=26)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines["bottom"].set_visible(True)
    ax.set_title(title, loc="left", fontsize=36, fontweight="bold", pad=62, color=INK)
    ax.text(0, 1.05, stat, transform=ax.transAxes, fontsize=28, color=MUTED, va="bottom")


def write(fig, name):
    path = OUT / f"{name}.svg"
    fig.savefig(path, transparent=True)
    plt.close(fig)
    svg = path.read_text()
    svg = svg.replace(ACCENT, "var(--accent)")
    for hex_, var in ((INK, "--plot-ink"), (MUTED, "--plot-muted"), (GREY, "--plot-grey"), (LINE, "--plot-line")):
        svg = svg.replace(hex_, f"var({var})")
    svg = svg.replace("'DejaVu Sans'", "var(--font-body)").replace("DejaVu Sans", "var(--font-body)")
    # drop metadata; size comes from the slide
    svg = svg.split("<metadata>")[0] + svg.split("</metadata>")[1]
    svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg, flags=re.S)
    svg = re.sub(r'<\?xml[^>]*\?>\s*', "", svg)
    svg = re.sub(r'(<svg[^>]*?) width="[^"]*" height="[^"]*"', r"\1", svg, count=1)
    path.write_text(svg)
    print("wrote", path.relative_to(HERE.parent.parent))


def pct(v): return f"{v:.1f}%"
def x2(v): return f"{v:.2f}"
def nr(v): return f"{v * 100:.1f}%"
def gain(v): return v + 1


def cond(geom, col):
    return float(conds[f"{geom}_no_voxels"][col]), float(conds[f"{geom}_voxels"][col])


TARGET = dict(ylim=(0, 100), ticks=[0, 25, 50, 75, 100], fmt=pct)
COVER = dict(ylim=(0, 100), ticks=[0, 25, 50, 75, 100], fmt=pct)
REDUND = dict(ylim=(0, 0.16), ticks=[0, 0.04, 0.08, 0.12, 0.16], fmt=nr)
GAIN = dict(ylim=(1, 1.6), ticks=[1, 1.2, 1.4, 1.6], fmt=x2, base=1)


def tick_fmt(ax, kind):
    if kind == "nr":
        ax.set_yticklabels([f"{t * 100:.0f}" for t in ax.get_yticks()])
    if kind == "gain":
        ax.set_yticklabels([f"{t:.1f}" for t in ax.get_yticks()])


def targets(ax, g, stat):
    panel(ax, "Target discovery (%)", stat, per_pair(g, "No CAAV", "target_pct", lambda v: v * 100), per_pair(g, "CAAV", "target_pct", lambda v: v * 100), **TARGET)


def coverage(ax, g, stat):
    a, b = cond(g, "voxel_coverage_pct")
    panel(ax, "Coverage (%)", stat, a, b, **COVER)


def redundancy(ax, g, stat):
    a, b = cond(g, "normalized_redundancy")
    panel(ax, "Redundancy (%)", stat, a, b, **REDUND)
    tick_fmt(ax, "nr")


def tgain(ax, g, stat):
    panel(ax, "Target gain", stat, per_pair(g, "No CAAV", "coord_gain", gain), per_pair(g, "CAAV", "coord_gain", gain), **GAIN)
    tick_fmt(ax, "gain")


# ---------------------------------------------------------------- slides: Figs 7, 8, 10, 12
OUT.mkdir(parents=True, exist_ok=True)

fig, axs = plt.subplots(1, 4, figsize=(1744 / 72, 700 / 72))
fig.subplots_adjust(left=0.035, right=0.995, top=0.77, bottom=0.1, wspace=0.26)
targets(axs[0], "scatter", "Δ = +16.1 pp, g = 1.12")
coverage(axs[1], "scatter", "per condition")
redundancy(axs[2], "scatter", "normalized, ≈ 70% lower")
tgain(axs[3], "scatter", "Δ = +0.138")
write(fig, "plot-scatter")

fig, axs = plt.subplots(1, 2, figsize=(860 / 72, 700 / 72))
fig.subplots_adjust(left=0.08, right=0.995, top=0.77, bottom=0.1, wspace=0.3)
tgain(axs[0], "terrain", "Δ = +0.277, g = 1.67")
redundancy(axs[1], "terrain", "normalized")
write(fig, "plot-terrain")

# ---------------------------------------------------------------- Fig 9, redrawn
height = np.loadtxt(DATA / "terrain_height.csv", delimiter=",")
attention = np.loadtxt(DATA / "attention_fig9.csv", delimiter=",")
gy, gx = np.gradient(height)
grad = np.hypot(gx, gy)
cmap_grey = matplotlib.colors.LinearSegmentedColormap.from_list("g", ["#ffffff", "#1d1d1f"])

fig, axs = plt.subplots(1, 2, figsize=(840 / 72, 700 / 72))
fig.subplots_adjust(left=0.01, right=0.99, top=0.77, bottom=0.02, wspace=0.05)
ims = [axs[0].imshow(grad, cmap=cmap_grey, interpolation="nearest", origin="upper"),
       axs[1].imshow(attention, cmap="viridis", interpolation="nearest", origin="upper")]
for ax, im in zip(axs, ims):  # rounded, like every other image on the slides
    im.set_clip_path(FancyBboxPatch((-0.5, -0.5), 24, 24, boxstyle="round,pad=0,rounding_size=1.2", transform=ax.transData))
# the paper's landmark threshold (75th percentile of the gradient, 42.98), lightly smoothed to draw
axs[1].contour(gaussian_filter(grad, 0.8), levels=[42.98], colors="white", linewidths=2)
for ax, t, s in ((axs[0], "Terrain gradient", "peaks, ridges, valleys"), (axs[1], "Attention", "outline: steepest quarter")):
    ax.set_xticks([]); ax.set_yticks([])
    ax.spines[:].set_visible(False)
    ax.set_title(t, loc="left", fontsize=36, fontweight="bold", pad=62, color=INK)
    ax.text(0, 1.05, s, transform=ax.transAxes, fontsize=28, color=MUTED, va="bottom")
write(fig, "plot-terrain-maps")
