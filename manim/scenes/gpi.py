import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style import *

import numpy as np


class GPIZigZag(Scene):
    def construct(self):
        # The plane is (policy pi, value V): x = policy, y = value.
        # Blue line  V = v_pi        is a graph over x: for every pi there is one consistent V.
        # Orange line pi = greedy(V) is a graph over y: for every V there is one greedy pi.
        # So evaluation (pi fixed) is a vertical hop and improvement (V fixed) a horizontal hop.
        eval_slope = 0.22
        eval_intercept = 0.15
        x_star = (0.65 - eval_intercept) / (eval_slope + 0.42)  # the pair (V*, pi*) used since v1
        y_star = eval_slope * x_star + eval_intercept
        assert np.isclose(x_star, 0.78125)
        assert np.isclose(y_star, 0.321875)
        # Improvement line through the same optimum, steeper than the blue line, so the
        # alternating vertical/horizontal hops form a staircase that climbs into the corner
        # (values only go up, as the policy improvement theorem says).
        improve_slope = 0.66
        improve_intercept = y_star - improve_slope * x_star

        plane_origin = LEFT * 0.35 + DOWN * 0.25

        def point(x, y):
            return plane_origin + RIGHT * x + UP * y

        def eval_y(x):
            return eval_slope * x + eval_intercept

        def improve_y(x):
            return improve_slope * x + improve_intercept

        def improve_x(y):
            return (y - improve_intercept) / improve_slope

        optimum = point(x_star, y_star)
        assert np.isclose(y_star, improve_y(x_star))
        assert 0 < eval_slope / improve_slope < 0.5  # contraction of one evaluate+improve round

        # ---------- persistent process strip ----------
        strip_bg = RoundedRectangle(
            width=12.8, height=0.54, corner_radius=0.12,
            fill_color=PANEL, fill_opacity=0.96,
            stroke_color=GRID, stroke_width=1.5,
        ).to_edge(UP, buff=0.14)
        stage_labels = [
            cn("① 评估", size=20, color=V_COL),
            cn("② 改进", size=20, color=DIM),
            cn("③ 来回走", size=20, color=DIM),
            cn("④ VI 与 PI", size=20, color=DIM),
        ]
        stage_row = VGroup(*stage_labels).arrange(RIGHT, buff=0.78)
        stage_row.move_to(strip_bg.get_center())
        active_marker = Line(
            LEFT * 0.38, RIGHT * 0.38, color=V_COL, stroke_width=4
        ).next_to(stage_labels[0], DOWN, buff=0.035)
        self.add(strip_bg, stage_row, active_marker)
        stage_now = [0]

        def stage_anims(index, color):
            stage_now[0] = index
            animations = [label.animate.set_color(DIM) for label in stage_labels]
            animations.append(stage_labels[index].animate.set_color(color))
            animations.append(active_marker.animate.set_color(color).next_to(stage_labels[index], DOWN, buff=0.035))
            return animations

        def set_stage(index, color):
            self.play(*stage_anims(index, color), run_time=0.45)

        cap_box = [None]

        def cap_anims(text):
            new = cn(text, size=26).to_edge(DOWN, buff=0.35)
            old = cap_box[0]
            cap_box[0] = new
            if old is None:
                return [FadeIn(new, shift=UP * 0.15)]
            return [FadeOut(old, shift=UP * 0.15), FadeIn(new, shift=UP * 0.15)]

        def say(text):
            self.play(*cap_anims(text), run_time=0.6)

        hook = cn("评估和改进，为什么来回走就能到最优？", size=29)
        hook.next_to(strip_bg, DOWN, buff=0.42)
        self.play(FadeIn(hook, shift=UP * 0.12), run_time=0.7)
        self.wait(1.4)
        self.play(FadeOut(hook, shift=UP * 0.12), run_time=0.5)

        # ---------- the (pi, V) plane, with labelled axes ----------
        grid = []
        for x in range(-4, 5):
            grid.append(Line(
                point(x, -2.0), point(x, 2.05),
                color=GRID, stroke_width=1, stroke_opacity=0.42,
            ))
        for y in np.arange(-2.0, 2.01, 0.5):
            grid.append(Line(
                point(-4.35, y), point(4.25, y),
                color=GRID, stroke_width=1, stroke_opacity=0.42,
            ))
        x_axis = Arrow(point(-4.35, -2.0), point(4.35, -2.0), buff=0, color=LINE, stroke_width=2.5,
                       max_tip_length_to_length_ratio=0.025)
        y_axis = Arrow(point(-4.35, -2.0), point(-4.35, 2.15), buff=0, color=LINE, stroke_width=2.5,
                       max_tip_length_to_length_ratio=0.05)
        x_name = cn("策略 π", size=21, color=DIM).next_to(x_axis.get_end(), DOWN, buff=0.10).shift(LEFT * 0.35)
        y_name = cn("价值 V", size=21, color=DIM).next_to(y_axis.get_end(), RIGHT, buff=0.14)
        plane = VGroup(*grid, x_axis, y_axis, x_name, y_name)
        self.play(LaggedStart(*[Create(g) for g in grid], lag_ratio=0.025), run_time=1.0)
        schematic = cn("概念示意：高维 V 与 π；曲线、距离不代表实际数值", size=17, color=DIM).move_to(UP * 2.90)
        self.play(GrowArrow(x_axis), GrowArrow(y_axis), FadeIn(x_name), FadeIn(y_name), FadeIn(schematic), run_time=0.6)
        say("平面上一个点 = 一个策略 π 加一个价值 V")
        self.wait(0.8)

        eval_x0, eval_x1 = -4.05, 4.05
        eval_line = Line(point(eval_x0, eval_y(eval_x0)), point(eval_x1, eval_y(eval_x1)),
                         color=V_COL, stroke_width=5)
        improve_x0, improve_x1 = improve_x(-2.0), improve_x(2.0)
        improve_line = Line(point(improve_x0, -2.0), point(improve_x1, 2.0),
                            color=OPEN_COL, stroke_width=5)
        eval_label = tex(r"V", r"=", r"v_\pi", size=32, colors={0: V_COL, 1: V_COL, 2: V_COL})
        eval_label.next_to(eval_line.get_end(), RIGHT, buff=0.14)
        improve_label = tex(r"\pi", r"=", r"\text{greedy}(V)", size=32,
                            colors={0: OPEN_COL, 1: OPEN_COL, 2: OPEN_COL})
        improve_label.next_to(improve_line.get_end(), RIGHT, buff=0.14)
        assert eval_label.get_right()[0] < 7.0 and improve_label.get_right()[0] < 7.0

        # Formula band above the caption; exactly one formula is visible at a time.
        formula_center = point(0, -2.56)
        eval_seed = tex(r"v_\pi(s)", size=26, colors={0: V_COL}).move_to(formula_center)
        eval_formula = tex(
            r"v_\pi(s)", r"=", r"\sum_a", r"\pi(a\mid s)",
            r"\sum_{s'}", r"p(s'\mid s,a)", r"\left[r+\gamma v_\pi(s')\right]",
            size=32, colors={i: V_COL for i in range(7)},
        ).move_to(formula_center)
        if eval_formula.width > 11.7:
            eval_formula.scale_to_fit_width(11.7)
        eval_template = eval_formula.copy()
        improve_formula = tex(
            r"\pi_{\mathrm{new}}(s)", r"=", r"\arg\max_a", r"\sum_{s'}p(s'\mid s,a)[r+\gamma V(s')]",
            size=30, colors={i: OPEN_COL for i in range(4)},
        ).move_to(formula_center)
        improve_template = improve_formula.copy()

        # Stage 1: evaluation line.
        self.play(Create(eval_line), FadeIn(eval_label, shift=LEFT * 0.12), run_time=0.9)
        self.play(Write(eval_seed), run_time=0.45)
        self.play(TransformFromCopy(eval_seed, eval_formula), *cap_anims("蓝线上：V 正好是这个 π 的真实价值"),
                  run_time=1.0)
        self.remove(eval_seed)
        cur = [eval_formula]  # the formula currently on screen
        formula_kind = [V_COL]
        self.wait(1.0)

        # Stage 2: improvement line.
        self.play(*stage_anims(1, OPEN_COL), Create(improve_line), FadeIn(improve_label, shift=LEFT * 0.12),
                  run_time=0.9)
        self.play(FadeOut(cur[0], shift=UP * 0.12), FadeIn(improve_formula, shift=UP * 0.12),
                  *cap_anims("橙线上：π 正好对 V 做贪心选择"), run_time=0.7)
        cur[0] = improve_formula
        formula_kind[0] = OPEN_COL
        self.play(Indicate(improve_line, color=OPEN_COL), Indicate(cur[0], color=OPEN_COL), run_time=0.6)
        self.wait(0.8)

        def formula_anims(color):
            """Swap the formula band to the evaluation (blue) or improvement (orange) equation."""
            if formula_kind[0] == color:
                return []
            new = (eval_template if color == V_COL else improve_template).copy()
            old = cur[0]
            cur[0] = new
            formula_kind[0] = color
            return [FadeOut(old, shift=UP * 0.1), FadeIn(new, shift=UP * 0.1)]

        # ---------- PI: exact hops (vertical = evaluate, horizontal = improve) ----------
        start_xy = (-3.2, -1.55)
        assert abs(start_xy[1] - eval_y(start_xy[0])) > 0.5
        assert abs(start_xy[0] - improve_x(start_xy[1])) > 0.5

        def staircase(xy, rounds, frac_eval=1.0, frac_improve=1.0, improve_first=False):
            """Alternate evaluate (vertical, towards blue) and improve (horizontal, towards orange)."""
            x, y = xy
            pts, targets = [], []
            for k in range(rounds):
                if (k % 2 == 0) != improve_first:
                    full = (x, eval_y(x))
                    f = frac_eval
                else:
                    full = (improve_x(y), y)
                    f = frac_improve
                x, y = x + f * (full[0] - x), y + f * (full[1] - y)
                pts.append((x, y))
                targets.append(full)
            return pts, targets

        pi_xy, _ = staircase(start_xy, 6)
        tail_xy, _ = staircase(pi_xy[-1], 12)  # the remaining, ever smaller steps
        assert all(np.isclose(y, eval_y(x)) for x, y in pi_xy[0::2])
        assert all(np.isclose(y, improve_y(x)) for x, y in pi_xy[1::2])
        ys = [start_xy[1]] + [y for _, y in pi_xy]
        assert all(b >= a - 1e-12 for a, b in zip(ys, ys[1:]))  # V never decreases
        assert np.hypot(tail_xy[-1][0] - x_star, tail_xy[-1][1] - y_star) < 1e-3

        pi_start = point(*start_xy)
        pi_dot = Dot(pi_start, radius=0.105, color=G_COL).set_stroke(TEXT, width=2).set_z_index(5)
        pi_tag = tex(r"\pi_0,\ V_0", size=28, colors={0: G_COL}).next_to(pi_dot, LEFT, buff=0.16)
        self.play(FadeIn(pi_dot, scale=0.5), FadeIn(pi_tag, shift=UP * 0.1),
                  *cap_anims("起点：V 和 π 还互不一致"), run_time=0.65)
        self.wait(0.6)

        pi_arrows = []

        def make_hop(current, target, color):
            length = np.linalg.norm(target - current)
            if length < 0.14:
                return Line(current, target, color=color, stroke_width=3)
            return Arrow(current, target, buff=0, color=color, stroke_width=3.5,
                         max_tip_length_to_length_ratio=min(0.45, 0.16 / max(length, 0.16) * 1.6),
                         max_stroke_width_to_length_ratio=12)

        def hop(current, target, color, prelude=None, run_time=0.9):
            """prelude = (stage index, caption): switch stage, caption and formula together, then hop."""
            dim = [a.animate.set_opacity(0.35) for a in pi_arrows]
            swap = formula_anims(color)
            arrow = make_hop(current, target, color)
            pi_arrows.append(arrow)
            if prelude is not None:
                index, text = prelude
                self.play(*stage_anims(index, color), *swap, *cap_anims(text), *dim, run_time=0.6)
                self.play(Indicate(cur[0], color=color, scale_factor=1.05), run_time=0.45)
                self.wait(0.35)
                swap, dim = [], []
            grow = GrowArrow(arrow) if isinstance(arrow, Arrow) else Create(arrow)
            self.play(*swap, *dim, grow, MoveAlongPath(pi_dot, Line(current, target)), run_time=run_time)

        pi_pts = [point(*p) for p in pi_xy]
        hop(pi_start, pi_pts[0], V_COL, prelude=(0, "精确评估：π 不动，V 竖直走到蓝线"))
        self.wait(0.5)
        hop(pi_pts[0], pi_pts[1], OPEN_COL, prelude=(1, "贪心改进：V 不动，π 水平走到橙线"), run_time=1.1)
        self.wait(0.5)

        self.play(*stage_anims(2, G_COL), *cap_anims("台阶越走越小，收进两线交点"), run_time=0.6)
        current = pi_pts[1]
        for index, target in enumerate(pi_pts[2:], start=2):
            color = V_COL if index % 2 == 0 else OPEN_COL
            hop(current, target, color, run_time=0.85 if index < 4 else 0.7)
            current = target
        tail = VMobject(stroke_color=G_COL, stroke_width=2.5).set_points_as_corners(
            [current] + [point(*p) for p in tail_xy])
        self.play(*[a.animate.set_opacity(0.35) for a in pi_arrows], Create(tail),
                  MoveAlongPath(pi_dot, tail), run_time=0.8)
        pi_dot.move_to(optimum)
        optimum_tag = tex(r"V^*,\ \pi^*", size=32, colors={0: G_COL}).next_to(pi_dot, DOWN + RIGHT, buff=0.10)
        self.play(FadeIn(optimum_tag, shift=UP * 0.1), *cap_anims("来回走，最终同时满足两条线"), run_time=0.6)
        self.play(Circumscribe(VGroup(pi_dot, optimum_tag), color=G_COL, stroke_width=3), run_time=1.0)
        self.wait(1.5)

        # VI fully greedifies, then performs ONE Bellman evaluation sweep.
        # Half the vertical distance is a visual convention, not the numerical VI rule.
        eval_template = tex(
            r"V_{k+1}(s)=\sum_{s'}p(s'\mid s,\pi_{k+1}(s))[r+\gamma V_k(s')]",
            size=30, colors={0: V_COL},
        ).move_to(formula_center)
        if eval_template.width > 11.7:
            eval_template.scale_to_fit_width(11.7)
        formula_kind[0] = None
        # ---------- VI: full greedy improvement, one evaluation sweep ----------
        self.play(
            *stage_anims(3, V_COL),
            *[FadeOut(arrow) for arrow in pi_arrows],
            FadeOut(tail), FadeOut(pi_dot), FadeOut(pi_tag), FadeOut(optimum_tag), run_time=0.5,
        )
        vi_start = point(*start_xy)
        vi_dot = Dot(vi_start, radius=0.105, color=G_COL).set_stroke(TEXT, width=2).set_z_index(5)
        vi_tag = tex(r"V_0", size=28, colors={0: G_COL}).next_to(vi_dot, LEFT, buff=0.16)
        self.play(FadeIn(vi_dot, scale=0.5), FadeIn(vi_tag, shift=UP * 0.1),
                  *cap_anims("VI：先完整取贪心动作，再做一次 Bellman 更新"), run_time=0.6)
        self.wait(0.5)

        vi_xy, vi_full = staircase(start_xy, 8, frac_eval=0.5, frac_improve=1.0, improve_first=True)
        vi_landings = [point(*p) for p in vi_xy]

        def plane_xy(frame_point):
            return frame_point[0] - plane_origin[0], frame_point[1] - plane_origin[1]

        assert all(
            not np.isclose(y, eval_y(x))
            for x, y in [plane_xy(p) for p in vi_landings[1::2]]
        )
        assert all(
            np.isclose(y, improve_y(x))
            for x, y in [plane_xy(p) for p in vi_landings[0::2]]
        )

        vi_current = vi_start
        vi_trail = VGroup()
        for index, (landing, full) in enumerate(zip(vi_landings, vi_full)):
            color = OPEN_COL if index % 2 == 0 else V_COL
            ray = DashedLine(vi_current, point(*full), color=color, stroke_width=2,
                             dash_length=0.10, stroke_opacity=0.5)
            step = Line(vi_current, landing, color=color, stroke_width=3.5)
            vi_trail.add(step)
            self.play(*formula_anims(color), Create(ray), Create(step),
                      MoveAlongPath(vi_dot, Line(vi_current, landing)), run_time=0.6 if index < 4 else 0.45)
            self.play(FadeOut(ray), step.animate.set_stroke(opacity=0.45), run_time=0.15)
            vi_current = landing
            if index == 3:
                self.play(*cap_anims("橙色到线；蓝色只更新一次，不评估到收敛"), run_time=0.5)

        vi_tail_xy, _ = staircase(vi_xy[-1], 40, frac_eval=0.5, frac_improve=1.0, improve_first=True)
        assert np.hypot(vi_tail_xy[-1][0] - x_star, vi_tail_xy[-1][1] - y_star) < 0.02
        vi_tail = VMobject(stroke_color=G_COL, stroke_width=2.5).set_points_as_corners(
            [vi_current] + [point(*p) for p in vi_tail_xy] + [optimum])
        self.play(Create(vi_tail), MoveAlongPath(vi_dot, vi_tail), run_time=1.3)
        vi_optimum_tag = tex(r"\to V^*,\ \pi^*", size=30, colors={0: G_COL}).next_to(
            vi_dot, DOWN + RIGHT, buff=0.10)
        self.play(FadeIn(vi_optimum_tag, shift=UP * 0.1), *cap_anims("反复完整取 max、更新 V，直到收敛"), run_time=0.6)
        self.wait(1.2)

        # ---------- course fact: placed above the plane, clear of the intersection ----------
        fact_panel = RoundedRectangle(
            width=7.2, height=0.70, corner_radius=0.14,
            fill_color=PANEL, fill_opacity=0.95,
            stroke_color=G_COL, stroke_width=2,
        ).move_to(UP * 2.52)
        fact = cn("课件例子：π₀ → π₁；π₁ 已最优", size=26, color=G_COL)
        fact.move_to(fact_panel.get_center())
        assert fact_panel.get_bottom()[1] > point(0, 2.05)[1] + 0.05      # above the plane
        assert fact_panel.get_top()[1] < strip_bg.get_bottom()[1] - 0.05  # below the strip
        self.play(FadeOut(vi_trail), FadeOut(vi_tail), FadeOut(vi_tag), run_time=0.35)
        self.play(Create(fact_panel), Write(fact), *cap_anims("PI 在这个 Gridworld 只需一次改进"), run_time=0.8)
        self.play(Circumscribe(fact, color=G_COL), run_time=0.8)
        self.wait(1.6)

        # ---------- summary ----------
        self.play(
            FadeOut(fact_panel), FadeOut(fact), FadeOut(plane), FadeOut(schematic),
            FadeOut(eval_line), FadeOut(improve_line),
            FadeOut(eval_label), FadeOut(improve_label),
            FadeOut(vi_dot), FadeOut(vi_optimum_tag),
            FadeOut(cur[0]),
            run_time=0.7,
        )
        eval_word = cn("评估", size=34, color=V_COL).move_to(LEFT * 2.0 + UP * 0.35)
        improve_word = cn("改进", size=34, color=OPEN_COL).move_to(RIGHT * 2.0 + UP * 0.35)
        forward_arrow = Arrow(
            eval_word.get_right() + RIGHT * 0.16,
            improve_word.get_left() - RIGHT * 0.16,
            color=V_COL, stroke_width=4, max_tip_length_to_length_ratio=0.22,
        )
        backward_arrow = Arrow(
            improve_word.get_left() + LEFT * 0.16 + DOWN * 0.23,
            eval_word.get_right() + RIGHT * 0.16 + DOWN * 0.23,
            color=OPEN_COL, stroke_width=4, max_tip_length_to_length_ratio=0.22,
        )
        self.play(Write(eval_word), Write(improve_word), run_time=0.55)
        self.play(GrowArrow(forward_arrow), GrowArrow(backward_arrow), run_time=0.8)
        self.wait(1.0)
        say("评估 ⇄ 改进：这就是 GPI")
        takeaway = cn("VI、PI、以后的 MC / TD control 都是这张图", size=26, color=TEXT).move_to(DOWN * 1.05)
        self.play(FadeIn(takeaway, shift=UP * 0.1), run_time=0.7)
        self.wait(1.8)
