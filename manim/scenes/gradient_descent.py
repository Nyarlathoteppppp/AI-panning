import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style import *

import numpy as np


class GradientDescent(ThreeDScene):
    """Gradient descent on a moderately elongated, tilted least-squares bowl."""

    def construct(self):
        # Design H so its valley (small eigenvector) is tilted 35° and cond(H) = 8.
        theta = np.deg2rad(35.0)
        u_long = np.array([np.cos(theta), np.sin(theta)])
        u_steep = np.array([-np.sin(theta), np.cos(theta)])
        lam = np.array([0.25, 2.0])
        n = 6
        U = np.column_stack([u_long, u_steep])
        raw = np.array([
            [1.2, 0.3], [0.4, 1.1], [0.1, -0.8],
            [-0.5, 0.7], [-0.9, -0.5], [-1.3, 0.2],
        ], dtype=float)
        Q, _ = np.linalg.qr(raw)
        X = Q @ np.diag(np.sqrt((n / 2.0) * lam)) @ U.T
        true_w = np.array([1.0, -0.2])
        raw_residual = np.array([0.15, -0.10, 0.08, -0.12, 0.06, -0.04])
        residual = raw_residual - Q @ (Q.T @ raw_residual)
        y = X @ true_w + residual

        def objective(w):
            return float(np.mean((y - X @ np.asarray(w)) ** 2))

        def gradient(w):
            return (2.0 / n) * X.T @ (X @ np.asarray(w) - y)

        hessian = (2.0 / n) * X.T @ X
        w_min = np.linalg.solve(hessian, (2.0 / n) * X.T @ y)
        eigvals, eigvecs = np.linalg.eigh(hessian)
        lipschitz = float(eigvals[-1])
        alpha_small = 0.95 / lipschitz
        alpha_large = 1.70 / lipschitz
        w_start = true_w + 1.55 * u_long + 0.82 * u_steep

        def descend(alpha, steps):
            path = [w_start.copy()]
            for _ in range(steps):
                path.append(path[-1] - alpha * gradient(path[-1]))
            return path

        small_path = descend(alpha_small, 24)
        large_path = descend(alpha_large, 12)
        excess0 = objective(w_start) - objective(w_min)
        outer_level = excess0 * 1.06
        radii = np.sqrt(2.0 * outer_level / eigvals)
        ellipse = np.array([
            w_min + eigvecs @ (radii * np.array([np.cos(t), np.sin(t)]))
            for t in np.linspace(0, TAU, 120, endpoint=False)
        ])
        cloud = np.vstack([ellipse, small_path, large_path, w_min[None, :]])
        w_lo, w_hi = cloud.min(0), cloud.max(0)
        w_lo -= 0.08 * (w_hi - w_lo)
        w_hi += 0.08 * (w_hi - w_lo)
        span = w_hi - w_lo
        grid = [objective(np.array([u, v]))
                for u in np.linspace(w_lo[0], w_hi[0], 11)
                for v in np.linspace(w_lo[1], w_hi[1], 11)]
        # the bowl is drawn over the outer contour ellipse (level rim), so its top is J(w_min) + outer_level
        z_max = objective(w_min) + outer_level
        display_scale = 1.05 / z_max

        # Numerical checks: stationary minimum, monotone small steps, readable valley.
        assert np.allclose(w_min, true_w, atol=1e-8), (w_min, true_w)
        assert np.linalg.norm(gradient(w_min)) < 1e-8, gradient(w_min)
        check_ws = [w_start.copy()]
        for _ in range(40):
            check_ws.append(check_ws[-1] - alpha_small * gradient(check_ws[-1]))
        check_js = np.array([objective(w) for w in check_ws])
        assert np.all(np.diff(check_js) <= 1e-10), np.diff(check_js).max()
        cond = float(eigvals[-1] / eigvals[0])
        assert cond > 5.0 and 6.0 <= cond <= 10.0, cond
        valley = eigvecs[:, 0]
        valley_angle = ((np.degrees(np.arctan2(valley[1], valley[0])) + 90) % 180) - 90
        assert 30.0 <= abs(valley_angle) <= 40.0, valley_angle
        assert np.linalg.norm(small_path[-1] - w_min) < 0.12
        steep_coords = np.array([(p - w_min) @ u_steep for p in large_path])
        assert np.any(steep_coords[:-1] * steep_coords[1:] < 0)
        assert np.max(np.abs(steep_coords)) > 0.45

        def fixed_caption(text, old=None, size=25):
            new = cn(text, size=size).to_edge(DOWN, buff=0.42)
            self.add_fixed_in_frame_mobjects(new)
            if old is None:
                self.play(FadeIn(new, shift=UP * 0.15), run_time=0.55)
            else:
                self.play(FadeOut(old, shift=UP * 0.15),
                          FadeIn(new, shift=UP * 0.15), run_time=0.55)
            return new

        def surface_point(axes, w, z=None):
            if z is None:
                z = objective(w) * display_scale
            return axes.c2p(float(w[0]), float(w[1]), float(z))

        labels = [cn("① 误差", size=20), cn("② 误差曲面", size=20),
                  cn("③ 沿负梯度走", size=20), cn("④ 步长 α", size=20)]
        boxes = [RoundedRectangle(width=2.15, height=0.46, corner_radius=0.12,
                                  stroke_color=GRID, stroke_width=1.2,
                                  fill_color=PANEL, fill_opacity=0.96)
                 for _ in labels]
        process = VGroup(*[VGroup(box, label) for box, label in zip(boxes, labels)])
        process.arrange(RIGHT, buff=0.16).to_edge(UP, buff=0.22)
        for item in process:
            item[1].move_to(item[0].get_center())
        highlight = RoundedRectangle(width=2.15, height=0.46, corner_radius=0.12,
                                     stroke_color=R_COL, stroke_width=2.5,
                                     fill_color=R_COL, fill_opacity=0.10)
        highlight.move_to(process[0].get_center())
        self.add_fixed_in_frame_mobjects(highlight, process)

        # Beat 1 is flat: keep the default (identity) camera so TransformFromCopy copies are not projected.
        cap = fixed_caption("权重该往哪个方向改？", size=28)
        self.wait(1.4)

        # Beat 1: ranges come from the plotted points, so the red segments stay inside.
        shown = [0, 2, 4]
        xs_in = [float(X[i, 0]) for i in shown]
        ys_in = [float(y[i]) for i in shown] + [float(X[i] @ w_start) for i in shown]
        x_pad = 0.15 * (max(xs_in) - min(xs_in) + 1e-9) + 0.3
        y_pad = 0.12 * (max(ys_in) - min(ys_in) + 1e-9) + 0.2
        inset_axes = Axes(
            x_range=[min(xs_in) - x_pad, max(xs_in) + x_pad, 1],
            y_range=[min(ys_in) - y_pad, max(ys_in) + y_pad, 1],
            x_length=2.9, y_length=2.0,
            axis_config={"include_numbers": False, "stroke_color": LINE, "stroke_width": 1.5},
        ).move_to(LEFT * 4.45 + UP * 0.72)
        inset_panel = RoundedRectangle(width=3.7, height=3.15, corner_radius=0.16,
                                       stroke_color=GRID, stroke_width=1.2,
                                       fill_color=PANEL, fill_opacity=0.94)
        inset_panel.move_to(inset_axes.get_center() + UP * 0.10)
        inset_title = cn("样本：目标 vs 预测", size=18).move_to(inset_panel.get_top() + DOWN * 0.24)
        current_w = w_start.copy()
        target_dots = VGroup(*[
            Dot(inset_axes.c2p(X[i, 0], y[i]), radius=0.07, color=TARGET_COL)
            for i in shown
        ])
        prediction_dots = VGroup(*[
            Dot(inset_axes.c2p(X[i, 0], X[i] @ current_w), radius=0.07, color=V_COL)
            for i in shown
        ])
        errors = VGroup(*[
            Line(inset_axes.c2p(X[i, 0], X[i] @ current_w),
                 inset_axes.c2p(X[i, 0], y[i]), color=NEG_COL, stroke_width=5)
            for i in shown
        ])
        assert all(abs(dot.get_x() - inset_panel.get_center()[0]) < inset_panel.width / 2 - 0.12
                   and abs(dot.get_y() - inset_panel.get_center()[1]) < inset_panel.height / 2 - 0.12
                   for dot in [*target_dots, *prediction_dots])
        keys = VGroup(mono("● y", size=17, color=TARGET_COL),
                      mono("● ŷ", size=17, color=V_COL)).arrange(RIGHT, buff=0.40)
        keys.next_to(inset_axes, DOWN, buff=0.12)
        inset = VGroup(inset_panel, inset_axes, inset_title, target_dots,
                       prediction_dots, errors, keys)
        self.add_fixed_in_frame_mobjects(inset)
        self.play(FadeIn(inset_panel), Create(inset_axes), FadeIn(inset_title), run_time=0.7)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in target_dots], lag_ratio=0.15),
                  LaggedStart(*[GrowFromCenter(d) for d in prediction_dots], lag_ratio=0.15),
                  LaggedStart(*[Create(e) for e in errors], lag_ratio=0.15),
                  FadeIn(keys), run_time=1.1)
        delta_formula = tex(r"\delta", r"=", r"y", r"-", r"\hat y", r",\quad", r"\hat y", r"=",
                            r"\mathbf w^{\top}\mathbf x",
                            size=34, colors={0: NEG_COL, 2: TARGET_COL, 4: V_COL, 6: V_COL, 8: ALPHA_COL})
        delta_formula.move_to(LEFT * 4.45 + DOWN * 1.28)
        assert delta_formula.get_left()[0] > -config.frame_width / 2 + 0.2
        self.add_fixed_in_frame_mobjects(delta_formula)
        self.remove(delta_formula)  # parts appear one by one below
        self.play(TransformFromCopy(errors[0], delta_formula[0]),
                  TransformFromCopy(target_dots[0], delta_formula[2]),
                  TransformFromCopy(prediction_dots[0], delta_formula[4]),
                  Write(delta_formula[1]), Write(delta_formula[3]), run_time=0.9)
        cap = fixed_caption("红色竖线就是预测误差 δ", old=cap)
        self.play(FadeIn(delta_formula[5:], shift=RIGHT * 0.1), run_time=0.6)
        cap = fixed_caption("预测值就是权重和特征的点积", old=cap)
        self.wait(0.9)
        self.play(FadeOut(inset), FadeOut(delta_formula), run_time=0.45)

        # Beat 2–3: same weight window as the contour plot, flattened for the frame.
        self.play(highlight.animate.move_to(process[1].get_center()), run_time=0.4)
        z_disp = z_max * display_scale

        def rim_point(r, t):
            return w_min + eigvecs @ (radii * r * np.array([np.cos(t), np.sin(t)]))

        # Camera higher than v1 (phi 55°) and turned so the across-valley step is diagonal on screen,
        # which makes arrows on the floor (= weight plane) read as lying flat.
        self.set_camera_orientation(phi=55 * DEGREES, theta=-30 * DEGREES, zoom=1.0)
        self.camera.reset_rotation_matrix()  # project_point uses the cached matrix otherwise
        rot = self.camera.get_rotation_matrix()

        def make_axes(unit, z_length):
            return ThreeDAxes(
                x_range=[w_lo[0], w_hi[0], 1], y_range=[w_lo[1], w_hi[1], 1],
                z_range=[0, z_disp * 1.08, z_disp / 3],
                x_length=span[0] * unit, y_length=span[1] * unit, z_length=z_length,
                axis_config={"include_numbers": False, "stroke_color": LINE, "stroke_width": 1.3},
            )

        def bowl_bounds(axes):
            ts = np.linspace(0, TAU, 72)
            rim = np.array([self.camera.project_point(axes.c2p(*rim_point(1, t), z_disp)) for t in ts])
            floor = np.array([self.camera.project_point(axes.c2p(*rim_point(1, t), 0)) for t in ts])
            both = np.vstack([rim, floor])
            return rim[:, 1].max(), floor[:, 1].min(), both[:, 0].min(), both[:, 0].max()

        # Size the bowl from its projection (target 5.0 tall, at most 9.6 wide), then place it
        # just under the strip and centred, with a screen-space shift.
        unit3d = min(8.9 / span[0], 6.3 / span[1])
        top, bottom, left, right = bowl_bounds(make_axes(unit3d, 3.5))
        fit = min(5.0 / (top - bottom), 9.6 / (right - left))
        unit3d *= fit
        axes3d = make_axes(unit3d, 3.5 * fit)
        top, bottom, left, right = bowl_bounds(axes3d)
        target_top = process.get_bottom()[1] - 0.30
        axes3d.shift(rot[1] * (target_top - top) + rot[0] * (-(left + right) / 2))
        top, bottom, left, right = bowl_bounds(axes3d)
        assert top < process.get_bottom()[1] - 0.15, top
        assert bottom > -2.1, bottom                       # clear of the formula band and caption
        assert max(abs(left), abs(right)) < 6.4, (left, right)
        assert top - bottom > 4.2, top - bottom            # larger than v1 (about 2.9 tall)

        bowl = Surface(
            lambda u, v: axes3d.c2p(*rim_point(u, v), display_scale * objective(rim_point(u, v))),
            u_range=[0, 1], v_range=[0, TAU],
            resolution=(14, 48), fill_opacity=0.84, stroke_width=0.3,
        )
        bowl.set_fill_by_value(axes=axes3d, colorscale=[(V_COL, 0.0), (G_COL, z_disp)])
        self.play(Create(axes3d), Create(bowl), run_time=1.8)
        j_formula = tex(r"J(\mathbf w)", r"=", r"\frac1n\sum", r"(y-\hat y)^2",
                        size=32, colors={0: G_COL, 3: NEG_COL})
        j_formula.move_to(DOWN * 2.55 + LEFT * 3.9)
        self.add_fixed_in_frame_mobjects(j_formula)
        self.play(Write(j_formula), run_time=0.7)
        cap = fixed_caption("每组权重都有一个总误差高度", old=cap)
        self.wait(0.9)

        # Beat 3: the floor of the picture is the weight plane; the descent direction lives there.
        self.play(highlight.animate.move_to(process[2].get_center()), run_time=0.35)

        def floor_point(w):
            return axes3d.c2p(float(w[0]), float(w[1]), 0.0)

        def screen(p3):
            return self.camera.project_point(np.asarray(p3, dtype=float))

        ball = Dot3D(point=surface_point(axes3d, current_w), radius=0.13, color=TARGET_COL)
        shadow = Dot(floor_point(current_w), radius=0.085, color=TARGET_COL)
        tether = always_redraw(lambda: DashedLine(
            ball.get_center(), shadow.get_center(), color=TARGET_COL,
            stroke_width=2, dash_length=0.07, stroke_opacity=0.85))
        self.add(ball)
        self.play(GrowFromCenter(ball), FadeOut(j_formula),
                  bowl.animate.set_fill(opacity=0.40).set_stroke(opacity=0.25), run_time=0.6)
        self.play(FadeIn(shadow), Create(tether), run_time=0.5)
        cap = fixed_caption("地面就是权重平面，影子就是当前的 w", old=cap)
        self.wait(0.8)

        uphill = gradient(current_w) / np.linalg.norm(gradient(current_w))
        next_w = small_path[1]
        arrow_len = 1.25  # direction arrows on the floor; the actual step alpha*|grad J| is shorter
        grad_tip, down_tip = current_w + arrow_len * uphill, current_w - arrow_len * uphill
        grad_arrow = Arrow(floor_point(current_w), floor_point(grad_tip),
                           buff=0, stroke_width=5, color=G_COL, max_tip_length_to_length_ratio=0.22)
        step_arrow = Arrow(floor_point(current_w), floor_point(down_tip),
                           buff=0, stroke_width=6, color=R_COL, max_tip_length_to_length_ratio=0.22)
        assert np.linalg.norm(next_w - current_w) < arrow_len
        # Down-hill check: the step lowers J and is exactly opposite to the gradient.
        assert objective(next_w) < objective(current_w)
        assert np.allclose((next_w - current_w) / np.linalg.norm(next_w - current_w), -uphill)

        def label_at(mob, p3, direction, buff=0.22):
            spot = screen(p3)
            mob.move_to(spot + direction * (buff + max(mob.width, mob.height) / 2))
            self.add_fixed_in_frame_mobjects(mob)
            return mob

        tip_dir = screen(floor_point(grad_tip)) - screen(floor_point(current_w))
        tip_dir /= np.linalg.norm(tip_dir)
        grad_label = label_at(tex(r"\nabla J", size=34, colors={0: G_COL}),
                              floor_point(grad_tip), tip_dir, buff=0.10)
        self.play(GrowArrow(grad_arrow), FadeIn(grad_label), run_time=0.7)
        cap = fixed_caption("金色：梯度，在地面上指向上坡", old=cap)
        self.wait(0.7)
        step_dir = screen(floor_point(down_tip)) - screen(floor_point(current_w))
        step_dir /= np.linalg.norm(step_dir)
        step_label = label_at(tex(r"-\nabla J", size=34, colors={0: R_COL}),
                              floor_point(down_tip), step_dir, buff=0.10)
        step_formula = tex(r"\mathbf w", r"\leftarrow", r"\mathbf w", r"-", r"\alpha", r"\nabla J",
                           size=34, colors={0: ALPHA_COL, 2: ALPHA_COL, 4: ALPHA_COL, 5: G_COL})
        step_formula.move_to(DOWN * 2.55 + LEFT * 3.9)
        self.add_fixed_in_frame_mobjects(step_formula)
        self.play(grad_arrow.animate.set_opacity(0.35), grad_label.animate.set_opacity(0.35),
                  GrowArrow(step_arrow), FadeIn(step_label), Write(step_formula), run_time=0.9)
        cap = fixed_caption("黄色：反方向走一小步，球顺着碗面下滑", old=cap)
        self.wait(0.6)

        # The ball's step follows the surface; its shadow follows the yellow arrow on the floor.
        surface_step = ParametricFunction(
            lambda t: surface_point(axes3d, current_w + t * (next_w - current_w)),
            t_range=[0, 1], stroke_color=TARGET_COL, stroke_width=4)
        floor_step = Line(floor_point(current_w), floor_point(next_w))
        self.play(MoveAlongPath(ball, surface_step), MoveAlongPath(shadow, floor_step),
                  Create(surface_step), run_time=1.2)
        self.wait(0.6)
        ball_trace = TracedPath(ball.get_center, stroke_color=TARGET_COL, stroke_width=3.5)
        shadow_trace = TracedPath(shadow.get_center, stroke_color=TARGET_COL, stroke_width=2.5,
                                  stroke_opacity=0.7)
        self.add(ball_trace, shadow_trace)
        self.play(FadeOut(step_label), FadeOut(grad_label), grad_arrow.animate.set_opacity(0.15),
                  step_arrow.animate.set_opacity(0.5), run_time=0.3)
        for a, b in zip(small_path[1:12], small_path[2:13]):
            self.play(MoveAlongPath(ball, ParametricFunction(
                          lambda t, a=a, b=b: surface_point(axes3d, a + t * (b - a)), t_range=[0, 1])),
                      shadow.animate.move_to(floor_point(b)), run_time=0.13, rate_func=linear)
        cap = fixed_caption("每一步都沿负梯度，一路走到碗底", old=cap)
        self.wait(0.8)
        self.remove(tether)
        self.play(*[FadeOut(m) for m in (ball, shadow, ball_trace, shadow_trace, surface_step, grad_arrow,
                                          step_arrow, step_formula, axes3d, bowl)], run_time=0.7)
        self.set_camera_orientation(phi=0, theta=-90 * DEGREES)  # flat again for the 2D beats

        # Beat 4: equal-aspect contour map framed by the valley, not a stretched window.
        unit2d = min(8.6 / span[0], 3.55 / span[1])
        contour_axes = Axes(
            x_range=[w_lo[0], w_hi[0], 1], y_range=[w_lo[1], w_hi[1], 1],
            x_length=span[0] * unit2d, y_length=span[1] * unit2d,
            axis_config={"include_numbers": False, "stroke_color": LINE, "stroke_width": 1.3},
        ).move_to(UP * 0.02)
        assert abs(contour_axes.x_length / span[0] - contour_axes.y_length / span[1]) < 1e-6
        contour_panel = RoundedRectangle(
            width=contour_axes.width + 0.62, height=contour_axes.height + 0.92,
            corner_radius=0.16, stroke_color=GRID, stroke_width=1.3,
            fill_color=PANEL, fill_opacity=0.92,
        ).move_to(contour_axes.get_center() + UP * 0.30)
        contour_title = cn("俯视：同一张误差图", size=20)
        constant_label = tex(r"J", r"=", r"\mathrm{constant}", size=24, colors={0: G_COL})
        header = VGroup(contour_title, constant_label).arrange(RIGHT, buff=0.18)
        header.move_to(contour_panel.get_top() + DOWN * 0.30)
        self.add_fixed_in_frame_mobjects(contour_panel, contour_axes, header)
        self.play(FadeIn(contour_panel), Create(contour_axes), FadeIn(header), run_time=0.8)

        contour_curves = VGroup()
        for fraction in (0.12, 0.30, 0.58, 1.0):
            level_radii = np.sqrt(2.0 * outer_level * fraction / eigvals)

            def ellipse_point(t, level_radii=level_radii):
                return contour_axes.c2p(*(w_min + eigvecs @ (
                    level_radii * np.array([np.cos(t), np.sin(t)])
                )))

            contour_curves.add(ParametricFunction(
                ellipse_point, t_range=[0, TAU], stroke_color=G_COL, stroke_width=2.6,
            ))
        minimum_mark = VGroup(
            Line(LEFT * 0.16, RIGHT * 0.16, color=TEXT, stroke_width=3),
            Line(UP * 0.16, DOWN * 0.16, color=TEXT, stroke_width=3),
        ).move_to(contour_axes.c2p(*w_min))
        self.add_fixed_in_frame_mobjects(contour_curves, minimum_mark)
        self.play(Create(contour_curves), Create(minimum_mark), run_time=1.3)

        def path_marks(points, color):
            dots = VGroup(*[Dot(contour_axes.c2p(*point), radius=0.048, color=color)
                            for point in points])
            arrows = VGroup()
            for i in range(1, len(points)):
                start, end = contour_axes.c2p(*points[i - 1]), contour_axes.c2p(*points[i])
                if np.linalg.norm(end - start) < 0.16:
                    continue
                arrows.add(Arrow(start, end, buff=0.07, stroke_width=3.0, color=color,
                                 max_tip_length_to_length_ratio=0.24))
            return dots, arrows

        small_dots, small_arrows = path_marks(small_path, Q_COL)
        self.add_fixed_in_frame_mobjects(small_dots, small_arrows)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in small_dots], lag_ratio=0.03),
                  LaggedStart(*[GrowArrow(a) for a in small_arrows], lag_ratio=0.03), run_time=1.5)
        perpendicular_label = tex(r"-\nabla J", r"\perp", r"\mathrm{contour}",
                                  size=28, colors={0: R_COL}).move_to(DOWN * 2.38)
        self.add_fixed_in_frame_mobjects(perpendicular_label)
        self.play(FadeIn(perpendicular_label), run_time=0.4)
        cap = fixed_caption("俯视后，步子几乎垂直于等高线", old=cap)
        self.wait(1.7)

        # Beat 5: small path first, then the across-valley zig-zag alone.
        self.play(highlight.animate.move_to(process[3].get_center()), run_time=0.35)
        stable_tag = cn("α 小：平滑", size=20, color=Q_COL)
        zigzag_tag = cn("α 太大：跳动", size=20, color=OPEN_COL)
        stable_tag.move_to(contour_panel.get_corner(UL) + RIGHT * 1.05 + DOWN * 0.72)
        zigzag_tag.move_to(contour_panel.get_corner(UR) + LEFT * 1.15 + DOWN * 0.72)
        self.add_fixed_in_frame_mobjects(stable_tag)
        self.play(FadeIn(stable_tag), Indicate(small_arrows, color=Q_COL), run_time=0.7)
        self.wait(0.7)
        self.play(FadeOut(small_dots), FadeOut(small_arrows), FadeOut(stable_tag),
                  FadeOut(perpendicular_label), run_time=0.45)
        large_dots, large_arrows = path_marks(large_path, OPEN_COL)
        self.add_fixed_in_frame_mobjects(large_dots, large_arrows, zigzag_tag)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in large_dots], lag_ratio=0.05),
                  LaggedStart(*[GrowArrow(a) for a in large_arrows], lag_ratio=0.05),
                  FadeIn(zigzag_tag), run_time=1.4)
        cap = fixed_caption("α 小走得稳，α 太大在窄谷里来回跳", old=cap)
        self.wait(1.5)

        # Beat 6: bridge from the batch rule to the MC/TD form, one line at a time.
        self.play(*[FadeOut(m) for m in (contour_panel, contour_axes, contour_curves, minimum_mark,
                                         large_dots, large_arrows, header, zigzag_tag)],
                  highlight.animate.move_to(process[2].get_center()), run_time=0.7)
        line1 = tex(r"\mathbf w", r"\leftarrow", r"\mathbf w", r"-", r"\alpha", r"\nabla J",
                    size=42, colors={0: ALPHA_COL, 2: ALPHA_COL, 4: ALPHA_COL, 5: G_COL})
        line2 = tex(r"J", r"=", r"\tfrac{1}{2}", r"\delta^{2}", r",\qquad", r"\delta", r"=", r"y",
                    r"-", r"\mathbf w^{\top}", r"\mathbf x",
                    size=38, colors={0: G_COL, 3: NEG_COL, 5: NEG_COL, 7: TARGET_COL, 9: ALPHA_COL, 10: Q_COL})
        line3 = tex(r"\Rightarrow", r"\nabla J", r"=", r"-", r"\delta", r"\,\mathbf x",
                    size=40, colors={1: G_COL, 4: NEG_COL, 5: Q_COL})
        line4 = tex(r"\mathbf w", r"\leftarrow", r"\mathbf w", r"+", r"\alpha", r"\,",
                    r"\delta", r"\,", r"\mathbf x",
                    size=46, colors={0: ALPHA_COL, 2: ALPHA_COL, 4: ALPHA_COL, 6: NEG_COL, 8: Q_COL})
        line1.move_to(UP * 1.50)
        line2.move_to(UP * 0.50)
        line3.move_to(DOWN * 0.45)
        line4.move_to(DOWN * 1.60)
        self.add_fixed_in_frame_mobjects(line1, line2, line3, line4)
        self.remove(line2, line3, line4)
        self.play(FadeIn(line1, shift=UP * 0.1), run_time=0.6)
        cap = fixed_caption("只看一个样本；系数 1/2 让求导时的 2 约掉", old=cap)
        self.play(FadeIn(line2, shift=UP * 0.1), run_time=0.7)
        self.wait(0.6)
        self.play(FadeIn(line3[0]), TransformFromCopy(line1[5], line3[1]), FadeIn(line3[2]),
                  TransformFromCopy(line2[8], line3[3]), TransformFromCopy(line2[5], line3[4]),
                  TransformFromCopy(line2[10], line3[5]), run_time=1.0)
        cap = fixed_caption("求导：梯度就是 −δ 乘 x", old=cap)
        self.wait(0.8)
        self.play(Indicate(line1[3], color=NEG_COL, scale_factor=1.6),
                  Indicate(line3[3], color=NEG_COL, scale_factor=1.6), run_time=0.8)
        self.play(*[TransformFromCopy(line1[i], line4[i]) for i in (0, 1, 2, 4)],
                  ReplacementTransform(VGroup(line1[3].copy(), line3[3].copy()), line4[3]),
                  TransformFromCopy(line3[4], line4[6]), TransformFromCopy(line3[5], line4[8]),
                  run_time=1.2)
        cap = fixed_caption("两个负号抵消：减号变加号", old=cap)
        self.play(Circumscribe(line4, color=R_COL, buff=0.12), run_time=0.9)
        self.wait(0.8)

        # Closing: the update alone in the centre, takeaway below it, caption at the bottom.
        self.play(FadeOut(line1), FadeOut(line2), FadeOut(line3),
                  line4.animate.move_to(UP * 0.55).scale(1.15), run_time=0.7)
        cap = fixed_caption("这就是 MC / TD 用的那一步，只是 target 不同", old=cap, size=24)
        takeaway = cn("梯度指向上坡，沿反方向走一小步", size=28, color=R_COL).move_to(DOWN * 0.85)
        assert takeaway.get_bottom()[1] - cap.get_top()[1] > 1.2
        self.add_fixed_in_frame_mobjects(takeaway)
        self.play(Indicate(line4, color=R_COL), FadeIn(takeaway, shift=UP * 0.1), run_time=0.8)
        self.wait(2.0)
