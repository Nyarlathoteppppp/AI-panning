import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style import *


class ValueIteration(Scene):
    def construct(self):
        coords = {
            1: (0, 0), 2: (1, 0), 3: (2, 0), 4: (3, 0),
            5: (0, 1), 6: (2, 1), 7: (3, 1),
            8: (0, 2), 9: (1, 2), 10: (2, 2), 11: (3, 2),
        }
        state_at = {xy: s for s, xy in coords.items()}
        terminal_rewards = {7: -1.0, 11: 1.0}
        actions = ("N", "E", "S", "W")
        delta = {"N": (0, 1), "E": (1, 0), "S": (0, -1), "W": (-1, 0)}
        left = {"N": "W", "E": "N", "S": "E", "W": "S"}
        right = {"N": "E", "E": "S", "S": "W", "W": "N"}
        gamma = 0.9

        def move(s, direction):
            x, y = coords[s]
            return state_at.get((x + delta[direction][0], y + delta[direction][1]), s)

        def branches(s, action):
            if s in terminal_rewards:
                return []
            return ((move(s, action), 0.8),
                    (move(s, left[action]), 0.1),
                    (move(s, right[action]), 0.1))

        def q_value(values, s, action):
            return sum(
                probability * (
                    terminal_rewards.get(nxt, 0.0) +
                    gamma * (0.0 if nxt in terminal_rewards else values[nxt])
                )
                for nxt, probability in branches(s, action)
            )

        def sweep(values):
            result = {s: 0.0 for s in coords}
            for s in coords:
                if s not in terminal_rewards:
                    result[s] = max(q_value(values, s, a) for a in actions)
            return result

        values = {s: 0.0 for s in coords}
        history = [values]
        for _ in range(12):
            values = sweep(values)
            history.append(values)

        # Required lecture checkpoints.  These also guard against in-place updates.
        expected = {s: 0.0 for s in coords}
        expected[10] = 0.8
        for s in coords:
            assert abs(history[1][s] - expected[s]) <= 6e-4
        for s, target in {10: .872, 9: .576, 6: .476}.items():
            assert abs(history[2][s] - target) <= 6e-4
        for s, target in {
            1: .237, 2: .340, 3: .478, 4: .209, 5: .460,
            6: .628, 8: .650, 9: .816, 10: .939,
        }.items():
            assert abs(history[5][s] - target) <= 6e-4
        for s, target in {
            1: .537, 2: .463, 3: .526, 4: .305, 5: .626,
            6: .635, 8: .716, 9: .827, 10: .942,
        }.items():
            assert abs(history[10][s] - target) <= 6e-4

        q_at_s10 = {a: q_value(history[1], 10, a) for a in actions}
        for a, target in {"N": .676, "E": .872, "S": .100, "W": .072}.items():
            assert abs(q_at_s10[a] - target) <= 6e-4
        for s, target in {8: .415, 3: .343, 9: .732, 6: .571, 10: .921}.items():
            assert abs(history[3][s] - target) <= 6e-4
        # "One cell further per sweep": the set of reached (non-zero) cells grows ring by ring.
        reached = [{s for s in coords if s not in terminal_rewards and history[k][s] > 1e-9}
                   for k in range(13)]
        new_cells = {k: reached[k] - reached[k - 1] for k in range(1, 13)}
        assert new_cells[1] == {10} and new_cells[2] == {9, 6} and new_cells[3] == {8, 3}
        assert new_cells[4] == {5, 2, 4} and new_cells[5] == {1}
        assert all(not new_cells[k] for k in range(6, 13))
        final_values = history[12]  # The final picture is explicitly the result after 12 sweeps.

        hook = cn("价值是怎么从终点流回起点的？", size=39)
        self.play(Write(hook), run_time=1.1)
        self.wait(1.3)
        self.play(FadeOut(hook, shift=UP * .2), run_time=.6)

        # Persistent process strip: its highlight changes, but the four-step map remains.
        strip_y = 3.48
        stage_names = ("① 初始", "② 一次备份", "③ 价值扩散", "④ 读出策略")
        stage_x = (-4.35, -1.45, 1.55, 4.55)
        stage_boxes = []
        stage_texts = []
        for x, label in zip(stage_x, stage_names):
            box = RoundedRectangle(width=2.55, height=.48, corner_radius=.10)
            box.move_to(np.array([x, strip_y, 0]))
            box.set_fill(PANEL, opacity=.95).set_stroke(GRID, width=1.5)
            stage_boxes.append(box)
            stage_texts.append(cn(label, size=19, color=DIM).move_to(box.get_center()))
        stage_highlight = RoundedRectangle(width=2.55, height=.48, corner_radius=.10)
        stage_highlight.set_fill(OPEN_COL, opacity=.16).set_stroke(OPEN_COL, width=2)
        stage_highlight.move_to(stage_boxes[0].get_center())
        self.add(stage_highlight, *stage_boxes, *stage_texts)

        def set_stage(index):
            return stage_highlight.animate.move_to(stage_boxes[index].get_center())

        cell_w, cell_h = 1.60, 1.48
        origin = np.array([-6.20, -2.20, 0.0])

        def centre(s):
            x, y = coords[s]
            return origin + np.array([(x + .5) * cell_w, (y + .5) * cell_h, 0])

        def fill_for(value):
            if value > 1e-8:
                return V_COL, min(.84, .10 + .70 * min(value, 1.0))
            if value < -1e-8:
                return NEG_COL, min(.84, .10 + .70 * min(-value, 1.0))
            return PANEL, .85

        cells, state_labels = {}, {}
        for y in range(3):
            for x in range(4):
                if (x, y) == (1, 1):
                    wall = Rectangle(width=cell_w, height=cell_h)
                    wall.move_to(origin + np.array([(x + .5) * cell_w, (y + .5) * cell_h, 0]))
                    wall.set_fill(GRID, opacity=.85).set_stroke(GRID, width=2)
                    cells["wall"] = wall
                    continue
                s = state_at[(x, y)]
                cell = Rectangle(width=cell_w, height=cell_h).move_to(centre(s))
                if s in terminal_rewards:
                    colour = V_COL if terminal_rewards[s] > 0 else NEG_COL
                    cell.set_fill(colour, opacity=.72).set_stroke(colour, width=2)
                else:
                    cell.set_fill(PANEL, opacity=.85).set_stroke(GRID, width=2)
                cells[s] = cell
                state_labels[s] = mono("s" + str(s), size=17, color=DIM).move_to(
                    centre(s) + LEFT * .47 + UP * .48
                )
        terminal_labels = {
            7: mono("−1", size=31, color=NEG_COL).move_to(centre(7)),
            11: mono("+1", size=31, color=V_COL).move_to(centre(11)),
        }
        self.play(LaggedStart(*[Create(c) for c in cells.values()], lag_ratio=.06), run_time=1.1)
        self.play(FadeIn(VGroup(*state_labels.values(), *terminal_labels.values())), run_time=.6)
        math_line = None

        def replace_math(new_math):
            nonlocal math_line
            if math_line is None:
                self.play(FadeIn(new_math, shift=UP * .1), run_time=.55)
            else:
                self.play(ReplacementTransform(math_line, new_math), run_time=.55)
            math_line = new_math

        # Maths for the initial picture, matching the terminal and value colours.
        initial_math = tex(
            r"V_0(s)", r"=", r"0", r"\qquad", r"r", r"=\{+1,-1\}",
            size=34, colors={0: V_COL, 4: R_COL, 5: NEG_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(initial_math)
        cap = caption(self, "先把两个终点奖励放进网格")
        self.wait(.7)

        value_labels = {
            s: DecimalNumber(0.0, num_decimal_places=3, font_size=30).move_to(centre(s))
            for s in coords if s not in terminal_rewards
        }
        visible = set()

        def value_animations(new_values, show_states=(), show_all=False):
            """Every cell takes its new value; a label appears (already showing that value) once it is non-zero."""
            animations = []
            for s, label in value_labels.items():
                colour, opacity = fill_for(new_values[s])
                animations.append(cells[s].animate.set_fill(colour, opacity=opacity))
                should_show = show_all or s in show_states or s in visible
                if should_show and s not in visible:
                    visible.add(s)
                    label.set_value(new_values[s]).move_to(centre(s))
                    animations.append(FadeIn(label, shift=UP * .08))
                elif s in visible:
                    animations.append(ChangeDecimalToValue(label, new_values[s]))
            return animations

        # Sweep 1: only s10 is shown, and the strip advances to the backup stage.
        visible.add(10)
        self.play(
            set_stage(1),
            cells[10].animate.set_fill(V_COL, opacity=.62),
            FadeIn(value_labels[10], shift=UP * .1),
            run_time=.9,
        )
        sweep1_math = tex(
            r"V_1(s_{10})", r"=", r"0.8", r"\times", r"(+1)", r"=0.800",
            size=34, colors={0: V_COL, 2: Q_COL, 4: R_COL, 5: V_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(sweep1_math)
        cap = caption(self, "第1轮：只有 s10 能一步碰到 +1", old=cap)
        self.wait(1.4)

        # Sweep 2 starts from V1: nothing changes on the grid until s10's backup lands,
        # then every cell switches to V2 together (synchronous update).
        sweep2_math = tex(
            r"V_2(s)", r"=", r"\max_a", r"Q(s,a)",
            size=34, colors={0: V_COL, 2: OPEN_COL, 3: Q_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(sweep2_math)
        cap = caption(self, "第2轮：先把四个动作值算出来", old=cap)
        self.wait(.7)

        # Enlarged panel beside the now-large grid.
        panel = RoundedRectangle(width=5.45, height=4.20, corner_radius=.14)
        panel.set_fill(PANEL, opacity=.98).set_stroke(GRID, width=2)
        panel.move_to(np.array([3.72, -.05, 0]))
        backup_title = cn("s10 的一次 Bellman 备份", size=25).move_to(panel.get_top() + DOWN * .38)
        action_y = {"N": .92, "E": .25, "S": -.42, "W": -1.09}
        bars, action_labels, q_labels = {}, {}, {}
        bar_left, max_bar_width = panel.get_left()[0] + .92, 2.42
        for action in actions:
            y = panel.get_center()[1] + action_y[action]
            action_labels[action] = mono(action, size=25, color=Q_COL).move_to(
                np.array([panel.get_left()[0] + .40, y, 0]))
            width = max(.12, max_bar_width * q_at_s10[action] / q_at_s10["E"])
            bars[action] = Rectangle(width=width, height=.30).set_fill(Q_COL, opacity=.9).set_stroke(Q_COL, width=1)
            bars[action].move_to(np.array([bar_left + width / 2, y, 0]))
            q_labels[action] = DecimalNumber(q_at_s10[action], num_decimal_places=3, font_size=22).move_to(
                np.array([panel.get_right()[0] - .47, y, 0]))

        self.play(FadeIn(panel), Write(backup_title), run_time=.7)
        q_math = tex(
            r"Q(s,a)", r"=", r"\sum_{s'}p(s'\mid s,a)", r"\left[", r"r", r"+",
            r"\gamma", r"V(s')", r"\right]", size=34,
            colors={0: Q_COL, 2: Q_COL, 4: R_COL, 6: GAMMA_COL, 7: V_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(q_math)
        cap = caption(self, "每根柱子，是一个动作的期望回报", old=cap)
        self.play(
            *[GrowFromEdge(bars[a], LEFT) for a in actions],
            *[FadeIn(action_labels[a]) for a in actions],
            *[FadeIn(q_labels[a]) for a in actions],
            run_time=1.1,
        )
        self.wait(.8)
        self.play(
            bars["E"].animate.set_fill(OPEN_COL, opacity=1).set_stroke(OPEN_COL, width=2),
            Indicate(bars["E"], color=OPEN_COL, scale_factor=1.08), run_time=.8)
        max_math = tex(
            r"V_2(s_{10})", r"=", r"\max_a", r"Q(s_{10},a)", r"=Q(s_{10},E)",
            size=34, colors={0: V_COL, 2: OPEN_COL, 3: Q_COL, 4: OPEN_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(max_math)
        cap = caption(self, "取最大值：E，价值才会更新", old=cap)
        self.wait(.7)

        flow_arrow = Arrow(
            bars["E"].get_left() + LEFT * .05, centre(10) + RIGHT * .46,
            buff=.08, stroke_width=5, max_tip_length_to_length_ratio=.16, color=OPEN_COL)
        self.play(GrowArrow(flow_arrow), run_time=.8)
        self.play(
            ChangeDecimalToValue(value_labels[10], .872),
            Indicate(cells[10], color=OPEN_COL, scale_factor=1.08), run_time=.7)
        land_math = tex(
            r"V_2(s_{10})", r"=", r"\max", r"(.676,.872,.100,.072)", r"=.872",
            size=34, colors={0: V_COL, 2: OPEN_COL, 3: Q_COL, 4: V_COL},
        ).move_to(np.array([3.1, 2.57, 0]))
        replace_math(land_math)
        self.wait(1.6)

        # Remove every panel mobject, including E's original label, before diffusion.
        panel_parts = [panel, backup_title, flow_arrow]
        panel_parts += list(action_labels.values()) + list(bars.values()) + list(q_labels.values())
        self.play(*[FadeOut(m, shift=RIGHT * .12) for m in panel_parts], run_time=.75)
        self.play(FadeOut(math_line), run_time=.35)
        math_line = None
        diffusion_math = tex(
            r"V_{k+1}(s)", r"\leftarrow", r"\max_a", r"\sum_{s'}p(s'\mid s,a)",
            r"\left[", r"r", r"+", r"\gamma", r"V_k(s')", r"\right]", size=34,
            colors={0: V_COL, 2: OPEN_COL, 3: Q_COL, 5: R_COL, 7: GAMMA_COL, 8: V_COL},
        ).move_to(np.array([0, 2.57, 0]))
        self.play(set_stage(2), FadeIn(diffusion_math), run_time=.65)
        math_line = diffusion_math

        # Sweep counter k (big number + 12-slot progress bar) where the backup panel used to be.
        counter_x = 3.75
        counter_title = cn("同步扫描轮数", size=24, color=DIM).move_to(np.array([counter_x, 1.30, 0]))
        k_eq = tex(r"k", r"=", size=64, colors={0: OPEN_COL})
        k_value = DecimalNumber(2, num_decimal_places=0, font_size=72, color=OPEN_COL, edge_to_fix=LEFT)
        k_row = VGroup(k_eq, k_value).arrange(RIGHT, buff=.18, aligned_edge=DOWN)
        k_row.move_to(np.array([counter_x, .30, 0]))
        slot_w, slot_gap = .30, .06
        slots = VGroup(*[
            Rectangle(width=slot_w, height=.26).set_stroke(GRID, width=1.5).set_fill(PANEL, opacity=.9)
            for _ in range(12)
        ]).arrange(RIGHT, buff=slot_gap).move_to(np.array([counter_x, -.72, 0]))
        slot_ticks = VGroup(*[
            mono(str(i + 1), size=14, color=DIM).next_to(slots[i], DOWN, buff=.08) for i in (0, 4, 11)
        ])
        counter_group = VGroup(counter_title, k_row, slots, slot_ticks)
        assert counter_group.get_left()[0] > centre(11)[0] + cell_w / 2 + .3
        assert counter_group.get_right()[0] < 7.0

        def fill_slots(k):
            return [slots[i].animate.set_fill(OPEN_COL, opacity=.75).set_stroke(OPEN_COL, width=1.5)
                    for i in range(k)]

        def frontier_ripple(states):
            # Newly reached cells get an orange ring that grows and fades (no Indicate: it would undo the fill).
            rings = [cells[s].copy().set_fill(opacity=0).set_stroke(OPEN_COL, width=6) for s in states]
            return [FadeOut(r, scale=1.18) for r in rings]

        # The rest of sweep 2: every cell is recomputed from V1 at the same time.
        cap_sync = cn("同一轮里，所有格子一起用 V1 更新", size=26).to_edge(DOWN, buff=.35)
        self.play(
            FadeIn(counter_group, shift=LEFT * .12), *fill_slots(2),
            *value_animations(history[2], show_states=new_cells[2]),
            *frontier_ripple(new_cells[2]),
            FadeOut(cap, shift=UP * .15), FadeIn(cap_sync, shift=UP * .15),
            run_time=.9,
        )
        cap = cap_sync
        self.wait(1.1)
        cap = caption(self, "看 k：每多一轮，价值往外多走一格", old=cap)

        for k in range(3, 13):
            flashes = frontier_ripple(new_cells[k])
            animations = value_animations(history[k], show_states=new_cells[k])
            animations += [ChangeDecimalToValue(k_value, k), slots[k - 1].animate.set_fill(OPEN_COL, opacity=.75)
                           .set_stroke(OPEN_COL, width=1.5)]
            if k == 6:
                new_cap = cn("不再有新格子，数值只是继续收敛", size=26).to_edge(DOWN, buff=.35)
                animations += [FadeOut(cap, shift=UP * .15), FadeIn(new_cap, shift=UP * .15)]
                cap = new_cap
            self.play(*animations, *flashes, run_time=.45)
            self.wait(.45 if new_cells[k] else .15)
        self.wait(.5)

        # Final values are history[12], and the caption makes the sweep count explicit.
        policy_math = tex(
            r"V_{12}", r"\longrightarrow", r"\pi(s)=\arg\max_a Q(s,a)",
            size=34, colors={0: V_COL, 2: OPEN_COL},
        ).move_to(np.array([0, 2.57, 0]))
        self.play(set_stage(3), ReplacementTransform(math_line, policy_math),
                  counter_group.animate.set_opacity(.35), run_time=.7)
        math_line = policy_math
        cap = caption(self, "第12轮：读出稳定价值与贪心策略", old=cap)

        # Corner arrows preserve legibility of the computed sweep-12 numbers.
        vectors = {"N": UP, "E": RIGHT, "S": DOWN, "W": LEFT}
        policy_arrows = []
        for s, label in value_labels.items():
            best = max(actions, key=lambda a: q_value(final_values, s, a))
            vec = vectors[best]
            arrow = Arrow(
                centre(s) + LEFT * .48 + DOWN * .48,
                centre(s) + LEFT * .48 + DOWN * .48 + vec * .30,
                buff=0, stroke_width=3.2, max_tip_length_to_length_ratio=.45,
                color=OPEN_COL)
            policy_arrows.append(arrow)
            label.set_opacity(.58)
        self.play(LaggedStart(*[GrowArrow(a) for a in policy_arrows], lag_ratio=.05), run_time=1.5)
        self.wait(1.0)

        # Remove the policy readout before building the full equation in the same band.
        self.play(FadeOut(math_line), run_time=.35)
        # One MathTex (so LaTeX sets the baseline and spacing); each part is a TransformFromCopy target.
        formula = tex(
            r"V_{k+1}(s)", r"\leftarrow", r"\max_a", r"\sum_{s'}p(s'\mid s,a)", r"\big[", r"r", r"+",
            r"\gamma", r"V_k(s')", r"\big]", size=36,
            colors={0: V_COL, 2: OPEN_COL, 3: Q_COL, 5: R_COL, 7: GAMMA_COL, 8: V_COL},
        ).move_to(np.array([0, 2.57, 0]))
        formula_parts = list(formula)
        self.play(TransformFromCopy(value_labels[10], formula_parts[0]), run_time=.3)
        self.play(FadeIn(formula_parts[1]), TransformFromCopy(policy_math[2], formula_parts[2]), run_time=.4)
        self.play(TransformFromCopy(diffusion_math[3], formula_parts[3]), run_time=.35)
        self.play(FadeIn(formula_parts[4]), TransformFromCopy(terminal_labels[11], formula_parts[5]), run_time=.4)
        self.play(FadeIn(formula_parts[6]), TransformFromCopy(diffusion_math[7], formula_parts[7]), run_time=.35)
        self.play(TransformFromCopy(value_labels[9], formula_parts[8]), FadeIn(formula_parts[9]), run_time=.4)
        self.wait(1.4)
        cap = caption(self, "每一轮，价值往外多传一格", old=cap)
        self.wait(1.8)
