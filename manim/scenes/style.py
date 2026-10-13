"""Shared look for every COMP90054 Manim clip (same colours as the website's js/ui/scene.js).

LaTeX (BasicTeX + dvisvgm) is installed: use MathTex for formulas (split into substrings so each
part can be coloured and transformed) and DecimalNumber for changing numbers. Chinese text must
stay in Text(font=CN_FONT) because the LaTeX setup has no CJK fonts.
"""
import os

# LaTeX lives in /Library/TeX/texbin, which only login shells have on PATH (tip from the 90051 session)
if '/Library/TeX/texbin' not in os.environ.get('PATH', ''):
    os.environ['PATH'] = '/Library/TeX/texbin:' + os.environ.get('PATH', '')

from manim import *

config.background_color = "#14161b"

BG = "#14161b"
PANEL = "#1b1e25"
GRID = "#2c313b"
LINE = "#4a505c"
TEXT = "#ece9e1"
DIM = "#8e939c"

V_COL = "#58C4DD"      # state value V, path cost g, closed list
Q_COL = "#5CD0B3"      # action value Q
R_COL = "#F4D345"      # reward r
GAMMA_COL = "#83C167"  # discount gamma, f = g + h
G_COL = "#F0AC5F"      # return G, heuristic h
ALPHA_COL = "#9A72AC"  # learning rate alpha, weights w
NEG_COL = "#FC6255"    # TD error delta, negative values
TARGET_COL = "#D147BD" # targets
OPEN_COL = "#FF862F"   # policy / open list

CN_FONT = "PingFang SC"


def cn(s, size=28, color=TEXT, **kw):
    """Chinese (or mixed) text."""
    return Text(s, font=CN_FONT, font_size=size, color=color, **kw)


def mono(s, size=26, color=TEXT, **kw):
    """Formula-like text in a clean Latin font (Unicode maths such as γ, Σ, ←, ⁺)."""
    return Text(s, font="Helvetica Neue", font_size=size, color=color, **kw)


def num(x, digits=3, size=24, color=TEXT):
    """A number as Text (rebuild it to change the value; DecimalNumber needs LaTeX)."""
    return Text(f"{x:.{digits}f}".replace("-", "−"), font="Helvetica Neue", font_size=size, color=color)


def caption(scene, s, old=None, size=26):
    """Bottom caption that replaces the previous one. Returns the new mobject."""
    new = cn(s, size=size, color=TEXT).to_edge(DOWN, buff=0.35)
    if old is None:
        scene.play(FadeIn(new, shift=UP * 0.15), run_time=0.6)
    else:
        scene.play(FadeOut(old, shift=UP * 0.15), FadeIn(new, shift=UP * 0.15), run_time=0.6)
    return new


def tex(*parts, size=40, colors=None, **kw):
    """MathTex split into parts; colors maps part index -> colour, e.g. tex(r"V(s)", r"=", r"\\max_a", colors={0: V_COL})."""
    m = MathTex(*parts, font_size=size, color=TEXT, **kw)
    for i, c in (colors or {}).items():
        m[i].set_color(c)
    return m
