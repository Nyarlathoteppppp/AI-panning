import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style import *

import heapq


# y increases upwards. The divider at the U's opening keeps the two exits apart,
# so GBFS's parent chain really walks the long way out.
WIDTH, HEIGHT = 12, 8
START = (1, 3)
GOAL = (10, 3)
WALLS = {
    *[(x, 2) for x in range(2, 9)],
    *[(x, 6) for x in range(5, 9)],
    *[(8, y) for y in range(2, 7)],
    (5, 4),
}
DIRECTIONS = ((0, 1), (0, -1), (-1, 0), (1, 0))  # up, down, left, right
TRAP = {(x, y) for x in range(5, 8) for y in range(3, 6) if (x, y) not in WALLS}

# Frame is 14.2 x 8. Strip at the top, panels fill the width and ~65% of the height.
STRIP_Y = 3.55
PANEL_W = 4.50
PANEL_TOP = 3.12
PANEL_BOTTOM = -2.62
PANEL_H = PANEL_TOP - PANEL_BOTTOM
PANEL_X = (-4.68, 0.0, 4.68)
HEADER_Y = 2.78
COUNTER_Y = -2.24
CELL = 0.355
GRID_CY = 0.38
KINDS = ("ucs", "gbfs", "astar")


class Search:
    def __init__(self, kind):
        self.kind = kind
        self.heap = []
        self.order = 0
        self.open_set = {START}
        self.closed = set()
        self.g = {START: 0}
        self.parent = {START: None}
        self.done = False
        self.goal_g = None
        self.expansions = 0
        self._push(START)

    @staticmethod
    def heuristic(node):
        return abs(node[0] - GOAL[0]) + abs(node[1] - GOAL[1])

    def priority(self, node):
        g = self.g[node]
        h = self.heuristic(node)
        if self.kind == "ucs":
            return g
        if self.kind == "gbfs":
            return h
        return g + h

    def _push(self, node):
        heapq.heappush(self.heap, (self.priority(node), self.order, node))
        self.order += 1

    def expand_one(self):
        if self.done:
            return None
        while self.heap:
            _, _, node = heapq.heappop(self.heap)
            if node in self.closed:
                continue
            break
        else:
            self.done = True
            return None

        self.open_set.discard(node)
        self.closed.add(node)
        self.expansions += 1
        event = {"node": node, "new": []}
        if node == GOAL:
            self.goal_g = self.g[node]
            self.done = True
            return event

        for dx, dy in DIRECTIONS:
            nxt = (node[0] + dx, node[1] + dy)
            if not (0 <= nxt[0] < WIDTH and 0 <= nxt[1] < HEIGHT):
                continue
            if nxt in WALLS or nxt in self.closed or nxt in self.open_set:
                continue
            self.g[nxt] = self.g[node] + 1
            self.parent[nxt] = node
            self.open_set.add(nxt)
            self._push(nxt)
            event["new"].append(nxt)
        return event

    def path(self):
        node, result = GOAL, []
        while node is not None:
            result.append(node)
            node = self.parent[node]
        return list(reversed(result))

    def path_to(self, node):
        result = []
        while node is not None:
            result.append(node)
            node = self.parent.get(node)
        return list(reversed(result))


def make_trace(kind):
    search = Search(kind)
    events = []
    while not search.done:
        events.append(search.expand_one())
    return events, search


class FrontierRace(Scene):
    def construct(self):
        traces, searches = {}, {}
        for kind in KINDS:
            traces[kind], searches[kind] = make_trace(kind)
        ucs, gbfs, astar = searches["ucs"], searches["gbfs"], searches["astar"]
        assert (ucs.expansions, ucs.goal_g) == (71, 13)
        assert (gbfs.expansions, gbfs.goal_g) == (34, 17)
        assert (astar.expansions, astar.goal_g) == (38, 13)
        assert astar.goal_g == ucs.goal_g and gbfs.goal_g > astar.goal_g
        assert astar.expansions < ucs.expansions

        trap_closed = [n for n in astar.closed if n in TRAP]
        assert trap_closed, "A* should step into the trap so g + h has a cell"
        sample = max(trap_closed, key=lambda n: (astar.g[n], astar.heuristic(n)))
        sample_g = astar.g[sample]
        sample_h = astar.heuristic(sample)
        sample_f = sample_g + sample_h

        titles = {"ucs": "统一代价搜索", "gbfs": "贪心最佳优先", "astar": "A*"}
        panel_color = {"ucs": V_COL, "gbfs": OPEN_COL, "astar": GAMMA_COL}
        stage_color = [V_COL, G_COL, GAMMA_COL, OPEN_COL]

        def center(kind, node):
            col, row = node
            return np.array([
                PANEL_X[KINDS.index(kind)] + (col - (WIDTH - 1) / 2) * CELL,
                GRID_CY + (row - (HEIGHT - 1) / 2) * CELL,
                0,
            ])

        def place_header(title, priority, panel):
            title.set_y(HEADER_Y).align_to(panel, LEFT).shift(RIGHT * 0.14)
            priority.set_y(HEADER_Y).align_to(panel, RIGHT).shift(LEFT * 0.14)
            if title.get_right()[0] + 0.24 > priority.get_left()[0]:
                room = priority.get_left()[0] - 0.24 - title.get_left()[0]
                title.scale_to_fit_width(max(0.5, room))
                title.align_to(panel, LEFT).shift(RIGHT * 0.14).set_y(HEADER_Y)

        panels, cells, wall_groups = {}, {}, {}
        titles_m, priorities, marks = {}, {}, {}
        current, counter_word, counter_num, counter_row = {}, {}, {}, {}
        panel_groups = []

        for kind, x in zip(KINDS, PANEL_X):
            panel = RoundedRectangle(
                width=PANEL_W, height=PANEL_H, corner_radius=0.1,
            ).move_to([x, (PANEL_TOP + PANEL_BOTTOM) / 2, 0])
            panel.set_fill(PANEL, opacity=0.94).set_stroke(LINE, width=1.2)
            panels[kind] = panel

            title = cn(titles[kind], size=20, color=panel_color[kind])
            if kind == "ucs":
                priority = tex("g", size=30, colors={0: V_COL})
            elif kind == "gbfs":
                priority = tex("h", size=30, colors={0: G_COL})
            else:
                priority = tex("g", "+", "h", size=28, colors={0: V_COL, 1: TEXT, 2: G_COL})
            place_header(title, priority, panel)
            titles_m[kind] = title
            priorities[kind] = priority

            grid = VGroup()
            walls = VGroup()
            for col in range(WIDTH):
                for row in range(HEIGHT):
                    sq = Square(side_length=CELL * 0.96)
                    sq.move_to(center(kind, (col, row)))
                    if (col, row) in WALLS:
                        sq.set_fill(NEG_COL, opacity=0.30).set_stroke(LINE, width=1.0)
                        walls.add(sq)
                    else:
                        sq.set_fill(PANEL, opacity=0).set_stroke(GRID, width=1.0)
                    cells.setdefault(kind, {})[(col, row)] = sq
                    grid.add(sq)
            wall_groups[kind] = walls
            cells[kind][START].set_stroke(OPEN_COL, width=2.2)

            start_m = mono("S", size=16, color=TEXT).move_to(center(kind, START)).set_z_index(8)
            goal_m = mono("G", size=16, color=TARGET_COL).move_to(center(kind, GOAL)).set_z_index(8)
            marks[kind] = {"S": start_m, "G": goal_m}

            cur = Square(side_length=CELL * 0.90)
            cur.set_fill(opacity=0).set_stroke(TEXT, width=2.4).set_z_index(5)
            cur.move_to(center(kind, START))
            current[kind] = cur

            word = cn("已展开", size=25, color=panel_color[kind])
            number = DecimalNumber(
                0, num_decimal_places=0, font_size=36,
                color=panel_color[kind], edge_to_fix=LEFT,
            )
            row = VGroup(word, number).arrange(RIGHT, buff=0.14)
            row.move_to([x, COUNTER_Y, 0]).set_z_index(8)
            counter_word[kind] = word
            counter_num[kind] = number
            counter_row[kind] = row

            panel_groups.append(VGroup(
                panel, grid, title, priority, start_m, goal_m, cur,
            ))

        strip_items = VGroup(
            cn("① 按 g：UCS", size=16),
            cn("② 按 h：GBFS", size=16),
            cn("③ 按 g+h：A*", size=16),
            cn("④ 比较", size=16),
        ).arrange(RIGHT, buff=0.34).move_to([0, STRIP_Y, 0])
        if strip_items.width > 12.6:
            strip_items.scale_to_fit_width(12.6).set_y(STRIP_Y)
        strip_h = max(item.height for item in strip_items) + 0.14

        def strip_target(indices, color, opacity=0.18):
            group = VGroup(*[strip_items[i] for i in indices])
            return RoundedRectangle(
                width=group.width + 0.22, height=strip_h, corner_radius=0.06,
            ).set_fill(color, opacity=opacity).set_stroke(color, width=1.5).move_to(group)

        # During the lockstep race all three algorithms are running: a neutral box spans ①②③.
        strip_box = strip_target((0, 1, 2), TEXT, opacity=0.08)
        race_tag = cn("同时跑", size=16, color=TEXT).next_to(strip_box, LEFT, buff=0.14)

        hook = cn("同一张地图，三种搜索谁更聪明？", size=26).move_to([0, STRIP_Y, 0])
        self.play(
            Write(hook),
            LaggedStart(*[FadeIn(g) for g in panel_groups], lag_ratio=0.05),
            LaggedStart(*[FadeIn(counter_row[k]) for k in KINDS], lag_ratio=0.05),
            run_time=0.85,
        )
        self.wait(0.9)
        self.play(
            FadeOut(hook, shift=UP * 0.08),
            FadeIn(strip_box),
            FadeIn(strip_items),
            FadeIn(race_tag),
            run_time=0.45,
        )
        self.bring_to_front(strip_items)

        def go_stage(index, extra=()):
            self.play(Transform(strip_box, strip_target((index,), stage_color[index])), *extra, run_time=0.4)
            self.bring_to_front(strip_items)

        cap = caption(self, "S 在左，G 在右，墙是 U 形", size=24)
        self.play(
            *[Indicate(marks[k]["S"], color=TEXT, scale_factor=1.3) for k in KINDS],
            *[Indicate(marks[k]["G"], color=TARGET_COL, scale_factor=1.3) for k in KINDS],
            run_time=0.7,
        )
        self.play(*[Indicate(wall_groups[k], color=NEG_COL, scale_factor=1.02) for k in KINDS], run_time=0.7)
        self.wait(1.0)

        cap = caption(self, "三种前沿按各自优先级扩展", cap, size=24)
        self.play(
            Indicate(priorities["ucs"], color=V_COL),
            Indicate(priorities["gbfs"], color=G_COL),
            Indicate(priorities["astar"], color=GAMMA_COL),
            run_time=0.7,
        )

        def tick_time(tick):
            if tick < 10:
                return 0.30
            if tick < 26:
                return 0.11
            return 0.065

        def play_tick(tick):
            anims = []
            for kind in KINDS:
                if tick >= len(traces[kind]):
                    continue
                event = traces[kind][tick]
                if event is None:
                    continue
                node = event["node"]
                square = cells[kind][node]
                if node == GOAL:
                    anims.append(square.animate.set_fill(GAMMA_COL, opacity=0.55).set_stroke(GAMMA_COL, width=1.8))
                else:
                    anims.append(square.animate.set_fill(V_COL, opacity=0.36).set_stroke(V_COL, width=1.0))
                for nxt in event["new"]:
                    anims.append(cells[kind][nxt].animate.set_stroke(OPEN_COL, width=2.2))
                anims.append(current[kind].animate.move_to(center(kind, node)))
                anims.append(ChangeDecimalToValue(counter_num[kind], tick + 1))
            if anims:
                self.play(*anims, run_time=tick_time(tick))

        max_ticks = max(len(traces[k]) for k in KINDS)
        for tick in range(max_ticks):
            play_tick(tick)
        self.wait(0.6)

        # (a) UCS ignores the goal and fills every direction.
        go_stage(0, extra=(FadeOut(race_tag),))
        cap = caption(self, "只看 g，所以四面铺开", cap, size=24)
        ucs_closed = VGroup(*[cells["ucs"][n] for n in ucs.closed])
        spread = SurroundingRectangle(ucs_closed, color=V_COL, buff=0.04)
        self.play(Create(spread), Indicate(priorities["ucs"], color=V_COL), run_time=0.7)
        self.wait(1.7)
        self.play(FadeOut(spread), run_time=0.35)

        # (b) GBFS follows h into the U.
        go_stage(1)
        cap = caption(self, "只看 h，钻进开口的 U", cap, size=24)
        entered = [n for n in gbfs.closed if n in TRAP]
        assert entered
        deep = max(entered, key=lambda n: gbfs.g[n])
        trap_path = VGroup(*[
            Line(center("gbfs", a), center("gbfs", b), stroke_width=4.5, color=NEG_COL).set_z_index(4)
            for a, b in zip(gbfs.path_to(deep), gbfs.path_to(deep)[1:])
        ])
        self.play(
            Indicate(wall_groups["gbfs"], color=NEG_COL, scale_factor=1.03),
            Indicate(priorities["gbfs"], color=G_COL),
            run_time=0.7,
        )
        self.play(Create(trap_path), run_time=0.9)
        self.wait(1.7)
        self.play(FadeOut(trap_path), run_time=0.3)

        # (c) One A* cell: f is built from that cell's own g and h.
        go_stage(2)
        cap = caption(self, "g 已走，h 还剩，f 一起看", cap, size=24)
        sample_cell = cells["astar"][sample]
        ring = Square(side_length=CELL * 1.08).move_to(sample_cell)
        ring.set_stroke(GAMMA_COL, width=3.0).set_fill(opacity=0).set_z_index(9)
        g_chip = tex(str(sample_g), size=28, colors={0: V_COL})
        h_chip = tex(str(sample_h), size=28, colors={0: G_COL})
        chips = VGroup(g_chip, h_chip).arrange(RIGHT, buff=0.08).next_to(sample_cell, UP, buff=0.05)
        if chips.get_top()[1] > HEADER_Y - 0.22:
            chips.next_to(sample_cell, LEFT, buff=0.06)
        chips.set_z_index(12)

        formula = tex(
            "f", "=", "g", "+", "h", "=", str(sample_g), "+", str(sample_h), "=", str(sample_f),
            size=34, colors={0: GAMMA_COL, 2: V_COL, 4: G_COL, 6: V_COL, 8: G_COL, 10: GAMMA_COL},
        ).set_z_index(11)
        grid_bottom = GRID_CY - (HEIGHT - 1) / 2 * CELL - CELL / 2
        counter_top = counter_row["astar"].get_top()[1]
        formula_y = (grid_bottom - 0.08 + counter_top + 0.08) / 2
        formula.move_to([PANEL_X[2], formula_y, 0])
        if formula.width > PANEL_W - 0.24:
            formula.scale_to_fit_width(PANEL_W - 0.24)
            formula.move_to([PANEL_X[2], formula_y, 0])
        # Keep the formula inside the A* panel, between the grid and the live counter.
        assert formula.get_bottom()[1] > counter_top + 0.06, (formula.get_bottom()[1], counter_top)
        assert formula.get_top()[1] < grid_bottom - 0.04
        assert abs(formula.get_center()[0] - PANEL_X[2]) + formula.width / 2 < PANEL_W / 2
        arrow = Arrow(
            sample_cell.get_bottom(), formula.get_top(),
            buff=0.06, stroke_width=2.2, color=TEXT,
            max_tip_length_to_length_ratio=0.08,
        ).set_z_index(9)

        self.play(
            sample_cell.animate.set_fill(GAMMA_COL, opacity=0.5),
            FadeIn(ring),
            Indicate(priorities["astar"], color=GAMMA_COL),
            run_time=0.6,
        )
        self.play(FadeIn(chips, shift=UP * 0.04), GrowArrow(arrow), run_time=0.55)
        self.play(Write(formula[0:5]), run_time=0.6)                       # f = g + h
        self.play(
            Write(formula[5]), TransformFromCopy(g_chip, formula[6]),     # = 8 + 5 (from the cell)
            Write(formula[7]), TransformFromCopy(h_chip, formula[8]),
            run_time=0.8,
        )
        self.play(Write(formula[9:11]), run_time=0.45)                     # = 13
        self.play(Circumscribe(formula[10], color=GAMMA_COL, time_width=0.7), run_time=0.8)
        self.wait(1.8)
        self.play(
            FadeOut(ring), FadeOut(chips), FadeOut(arrow), FadeOut(formula),
            sample_cell.animate.set_fill(V_COL, opacity=0.36).set_stroke(V_COL, width=1.0),
            run_time=0.4,
        )

        go_stage(3)
        cap = caption(self, "三条路都到了，比代价", cap, size=24)
        path_color = {"ucs": V_COL, "gbfs": NEG_COL, "astar": GAMMA_COL}
        paths = {}
        for kind in KINDS:
            nodes = searches[kind].path()
            paths[kind] = VGroup(*[
                Line(center(kind, a), center(kind, b), stroke_width=4.5, color=path_color[kind]).set_z_index(4)
                for a, b in zip(nodes, nodes[1:])
            ])
        self.play(LaggedStart(*[Create(paths[k]) for k in KINDS], lag_ratio=0.2), run_time=1.5)
        finals = {}
        for kind in KINDS:
            finals[kind] = cn(
                f"展开 {searches[kind].expansions}，代价 {searches[kind].goal_g}",
                size=25, color=panel_color[kind],
            ).move_to(counter_row[kind]).set_z_index(8)
        self.play(*[ReplacementTransform(counter_row[kind], finals[kind]) for kind in KINDS], run_time=0.7)
        self.play(
            Circumscribe(finals["gbfs"], color=NEG_COL, time_width=0.6),
            Circumscribe(finals["astar"], color=GAMMA_COL, time_width=0.6),
            run_time=1.0,
        )
        self.wait(1.4)
        caption(self, "g管已走多远，h管还剩多远，A*都看", cap, size=24)
        self.wait(2.0)
