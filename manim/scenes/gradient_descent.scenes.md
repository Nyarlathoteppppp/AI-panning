# Gradient descent for linear function approximation

## Overview
- **Topic**: Gradient descent on the MSE of `ŷ = w₁x₁ + w₂x₂`.
- **Hook**: “权重该往哪个方向改？”
- **Target audience**: Master's students revising for an exam who saw the lecture once.
- **Estimated length**: about 50 seconds.
- **Key insight**: The gradient points uphill; each small negative-gradient step crosses elongated error contours toward the minimum.

## Narrative arc
**Mystery → Investigation → Resolution**: Begin with visible prediction errors and ask how weights should change. Turn those errors into an elongated 3D loss bowl, then switch to a clean 2D contour map where step size makes the path either smooth or zig-zag. Resolve with the coloured MC/TD update rule.

## Beats

### 1. Errors make the question concrete — 7 s
- **Visual**: Fixed-frame 2D inset below the process strip; three target/prediction pairs and red vertical error segments.
- **Math**: Build `δ = y − ŷ` beside the inset from the red segment, target dot, and prediction dot; then `, ŷ = wᵀx` fades in (caption “预测值就是权重和特征的点积”) so the later `δ = y − wᵀx` is not a jump.
- **Caption**: “红色竖线就是预测误差 δ”.

### 2. Errors become a surface — 7 s
- **Visual**: Large blue-to-gold MSE bowl (projected height ≥ 4.2, auto-fitted to 5.0 tall / ≤ 9.6 wide and placed under the strip from its screen projection). Camera phi 55°, theta −30°.
- **Math**: `J(w) = 1/n Σ (y−ŷ)²` in the bottom-left formula slot (bottom-right is where the y-axis tip lands).
- **Caption**: “每组权重都有一个总误差高度”.

### 3. The downhill direction lives on the floor — 14 s
- **Visual**: Bowl turns glassy (fill 0.40). Pink ball on the surface, dashed tether to its pink shadow on the floor (= weight plane). Gold floor arrow `∇J` points uphill (outward); yellow floor arrow `−∇J` points the other way (direction arrows, length 1.25 in w). Ball then takes its real first step α∇J **along the surface** (pink curve) while the shadow slides along the yellow arrow; 11 more quick steps with traces on the surface and on the floor.
- **Math**: `w ← w − α∇J` (bottom left). The theta was chosen so the across-valley step is diagonal on screen, otherwise a floor arrow pointing at the camera reads as vertical.
- **Caption**: “地面就是权重平面，影子就是当前的 w” → “金色：梯度，在地面上指向上坡” → “黄色：反方向走一小步，球顺着碗面下滑” → “每一步都沿负梯度，一路走到碗底”.

### 4. Overhead contour aha — 10 s
- **Visual**: Fade out the 3D bowl and transform the idea into a large fixed-frame 2D contour panel; four clear ellipses at constant J, with arrows perpendicular to them.
- **Math**: Fixed label `J = constant` and `−∇J ⟂ contour` appear in the formula region.
- **Caption**: “俯视后，步子几乎垂直于等高线”. Pause 1.8 s.

### 5. Step size comparison — 9 s
- **Visual**: Same contour panel, two side-by-side paths: cyan `α 小` reaches inward smoothly; orange `α 太大` zig-zags across the narrow valley.
- **Math**: Fixed labels stay in the panel header, with no leftover 3D formula.
- **Caption**: “α 小走得稳，α 太大在窄谷里来回跳”.

### 6. Bridge to the MC/TD form and takeaway — 12 s
- **Visual**: Contour panel leaves; strip back on ③. A four-line derivation in the centre: `w ← w − α∇J`; `J = ½δ², δ = y − wᵀx`; `⇒ ∇J = −δ x` (∇J, −, δ, x fly in from the lines above); the two minus signs pulse red, then `w ← w + α δ x` is assembled from them (two minuses merge into +) and circumscribed.
- **Then**: lines 1–3 fade, the update moves up and grows; takeaway sits 1.2+ units above the caption.
- **Math**: `α`/w purple, `δ` red, `x` teal, `J`/∇J gold, y pink.
- **Caption**: “只看一个样本；系数 1/2 让求导时的 2 约掉” → “求导：梯度就是 −δ 乘 x” → “两个负号抵消：减号变加号” → “这就是 MC / TD 用的那一步，只是 target 不同”.
- **Takeaway**: “梯度指向上坡，沿反方向走一小步”.

## Layout regions
- **Process strip**: fixed-frame, y ≈ 3.45; always visible and highlights the current stage.
- **Main visual**: y ∈ [−2.1, 2.65], at least 60% of frame width; 3D bowl or 2D contour panel, never both at full opacity.
- **Formula region**: fixed-frame, y ∈ [−2.85, −2.15] (3D beats: left slot x≈−3.9); one beat-specific formula at a time.
- **Camera**: identity for the flat beats 1, 4–6 (so TransformFromCopy copies are not projected); phi 55° / theta −30° only for beats 2–3.
- **Caption zone**: fixed-frame, y ≈ −3.45; use `caption()` and replace the previous caption.
- **Inset**: only in beat 1, x ≈ −4.5 and y ≈ 0.9, safely below the process strip.

## Colour and lifecycle rules
Purple marks weights and α, red marks δ/error, teal marks features/predictions, gold marks J/uphill, and cyan marks the stable path. Every formula/label is fixed in frame; remove the previous beat’s formula and labels before reusing the formula region.
