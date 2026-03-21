(ns snake.core)

;; --- Constants ---
(def cell-size 20)
(def grid-w 20)
(def grid-h 30)
(def canvas-w (* grid-w cell-size))
(def canvas-h (* grid-h cell-size))
(def tick-ms 120)

(def colors {:bg "#1a1a2e"
             :grid "#16213e"
             :head "#00d2ff"
             :body "#0099cc"
             :food "#ff6b6b"
             :glow "rgba(255,107,107,0.3)"
             :text "#e0e0e0"})

;; --- State ---
(def state (atom {:snake [[10 15] [9 15] [8 15]]
                  :dir [1 0]
                  :next-dir [1 0]
                  :food [15 10]
                  :score 0
                  :hi 0
                  :over false
                  :paused false
                  :tid nil}))

(def touch-st (atom nil))

;; --- Helpers ---
(defn rand-pos []
  [(js/Math.floor (* (js/Math.random) grid-w))
   (js/Math.floor (* (js/Math.random) grid-h))])

(defn vec= [a b]
  (and (= (first a) (first b))
       (= (second a) (second b))))

(defn place-food [snake]
  (loop [pos (rand-pos)
         tries 0]
    (if (or (> tries 500)
            (not (some #(vec= pos %) snake)))
      pos
      (recur (rand-pos) (inc tries)))))

(defn wrap [v]
  [(mod (first v) grid-w) (mod (second v) grid-h)])

;; --- Game Logic ---
(defn move-snake [st]
  (if (:over st)
    st
    (let [snake (:snake st)
          hd (first snake)
          nd (:next-dir st)
          hx (first hd)
          hy (second hd)
          dx (first nd)
          dy (second nd)
          new-head (wrap [(+ hx dx) (+ hy dy)])
          food (:food st)
          ate (vec= new-head food)
          new-snake (into [new-head] (if ate snake (butlast snake)))
          collision (some #(vec= new-head %) (rest new-snake))
          new-score (if ate (+ (:score st) 10) (:score st))]
      (if collision
        (assoc st :over true :hi (max (:hi st) (:score st)))
        (let [s2 (assoc st :snake new-snake :dir nd :score new-score :hi (max (:hi st) new-score))]
          (if ate
            (assoc s2 :food (place-food new-snake))
            s2))))))

(defn reset-game [st]
  (let [snake [[10 15] [9 15] [8 15]]]
    (assoc st :snake snake :dir [1 0] :next-dir [1 0]
           :food (place-food snake) :score 0 :over false :paused false)))

;; --- Rendering ---
(defn get-canvas [] (js/document.getElementById "game-canvas"))
(defn get-ctx [] (.getContext (get-canvas) "2d"))

(defn draw-rounded [ctx x y w h r]
  (.beginPath ctx)
  (.moveTo ctx (+ x r) y)
  (.lineTo ctx (+ x (- w r)) y)
  (.quadraticCurveTo ctx (+ x w) y (+ x w) (+ y r))
  (.lineTo ctx (+ x w) (+ y (- h r)))
  (.quadraticCurveTo ctx (+ x w) (+ y h) (+ x (- w r)) (+ y h))
  (.lineTo ctx (+ x r) (+ y h))
  (.quadraticCurveTo ctx x (+ y h) x (+ y (- h r)))
  (.lineTo ctx x (+ y r))
  (.quadraticCurveTo ctx x y (+ x r) y)
  (.closePath ctx)
  (.fill ctx))

(defn render [st]
  (let [ctx (get-ctx)
        snake (:snake st)
        food (:food st)
        score (:score st)
        hi (:hi st)
        over (:over st)
        paused (:paused st)]
    ;; bg
    (set! (.-fillStyle ctx) (:bg colors))
    (.fillRect ctx 0 0 canvas-w canvas-h)
    ;; grid
    (set! (.-strokeStyle ctx) (:grid colors))
    (set! (.-lineWidth ctx) 0.5)
    (doseq [x (range 0 canvas-w cell-size)]
      (.beginPath ctx)
      (.moveTo ctx x 0)
      (.lineTo ctx x canvas-h)
      (.stroke ctx))
    (doseq [y (range 0 canvas-h cell-size)]
      (.beginPath ctx)
      (.moveTo ctx 0 y)
      (.lineTo ctx canvas-w y)
      (.stroke ctx))
    ;; food glow + food
    (let [fx (first food)
          fy (second food)
          cx (+ (* fx cell-size) (/ cell-size 2))
          cy (+ (* fy cell-size) (/ cell-size 2))]
      (set! (.-fillStyle ctx) (:glow colors))
      (.beginPath ctx)
      (.arc ctx cx cy (* cell-size 0.8) 0 (* 2 js/Math.PI))
      (.fill ctx)
      (set! (.-fillStyle ctx) (:food colors))
      (.beginPath ctx)
      (.arc ctx cx cy (* cell-size 0.4) 0 (* 2 js/Math.PI))
      (.fill ctx))
    ;; snake
    (doseq [[i seg] (map-indexed vector snake)]
      (let [pad 1
            sx (first seg)
            sy (second seg)
            x (+ (* sx cell-size) pad)
            y (+ (* sy cell-size) pad)
            sz (- cell-size (* 2 pad))]
        (set! (.-fillStyle ctx) (if (zero? i) (:head colors) (:body colors)))
        (draw-rounded ctx x y sz sz 3)))
    ;; game over
    (when over
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.7)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (set! (.-fillStyle ctx) (:food colors))
      (set! (.-font ctx) "bold 28px 'Segoe UI',sans-serif")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "GAME OVER" (/ canvas-w 2) (- (/ canvas-h 2) 30))
      (set! (.-fillStyle ctx) (:text colors))
      (set! (.-font ctx) "18px 'Segoe UI',sans-serif")
      (.fillText ctx (str "Score: " score) (/ canvas-w 2) (/ canvas-h 2))
      (.fillText ctx (str "Best: " hi) (/ canvas-w 2) (+ (/ canvas-h 2) 28))
      (set! (.-font ctx) "14px 'Segoe UI',sans-serif")
      (.fillText ctx "Tap or Space to restart" (/ canvas-w 2) (+ (/ canvas-h 2) 60)))
    ;; paused
    (when (and paused (not over))
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.5)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (set! (.-fillStyle ctx) (:text colors))
      (set! (.-font ctx) "bold 24px 'Segoe UI',sans-serif")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "PAUSED" (/ canvas-w 2) (/ canvas-h 2)))))

(defn update-display [st]
  (let [se (js/document.getElementById "score")
        he (js/document.getElementById "high-score")]
    (when se (set! (.-textContent se) (:score st)))
    (when he (set! (.-textContent he) (:hi st)))))

;; --- Game Loop ---
(defn game-tick []
  (when-not (:paused @state)
    (swap! state move-snake))
  (render @state)
  (update-display @state))

(defn start-loop []
  (when-let [id (:tid @state)]
    (js/clearInterval id))
  (swap! state assoc :tid (js/setInterval game-tick tick-ms)))

;; --- Input ---
(defn opposite? [a b]
  (and (= (first a) (- (first b)))
       (= (second a) (- (second b)))))

(defn set-dir [dir]
  (when-not (opposite? dir (:dir @state))
    (swap! state assoc :next-dir dir)))

(defn handle-key [e]
  (let [k (.-key e)]
    (cond
      (or (= k "ArrowUp") (= k "w") (= k "W"))
      (do (.preventDefault e) (set-dir [0 -1]))
      (or (= k "ArrowDown") (= k "s") (= k "S"))
      (do (.preventDefault e) (set-dir [0 1]))
      (or (= k "ArrowLeft") (= k "a") (= k "A"))
      (do (.preventDefault e) (set-dir [-1 0]))
      (or (= k "ArrowRight") (= k "d") (= k "D"))
      (do (.preventDefault e) (set-dir [1 0]))
      (= k " ")
      (do (.preventDefault e)
          (if (:over @state)
            (swap! state reset-game)
            (swap! state update :paused not))))))

;; --- Touch ---
(defn handle-ts [e]
  (.preventDefault e)
  (let [t (aget (.-changedTouches e) 0)]
    (reset! touch-st {:x (.-clientX t) :y (.-clientY t)})))

(defn handle-te [e]
  (.preventDefault e)
  (when-let [ts @touch-st]
    (let [t (aget (.-changedTouches e) 0)
          dx (- (.-clientX t) (:x ts))
          dy (- (.-clientY t) (:y ts))
          ax (js/Math.abs dx)
          ay (js/Math.abs dy)]
      (if (and (< ax 30) (< ay 30))
        (if (:over @state)
          (swap! state reset-game)
          (swap! state update :paused not))
        (if (> ax ay)
          (set-dir [(if (pos? dx) 1 -1) 0])
          (set-dir [0 (if (pos? dy) 1 -1)])))))
  (reset! touch-st nil))

;; --- D-pad ---
(defn setup-dpad []
  (doseq [[id dir] [["btn-up" [0 -1]]
                     ["btn-down" [0 1]]
                     ["btn-left" [-1 0]]
                     ["btn-right" [1 0]]]]
    (when-let [btn (js/document.getElementById id)]
      (.addEventListener btn "touchstart"
                         (fn [e] (.preventDefault e) (set-dir dir))
                         #js {:passive false})
      (.addEventListener btn "mousedown"
                         (fn [e] (.preventDefault e) (set-dir dir))))))

;; --- Resize ---
(defn resize []
  (let [canvas (get-canvas)
        container (js/document.getElementById "game-container")
        mw (.-clientWidth container)
        mh (min (- (.-innerHeight js/window) 200) (* grid-h cell-size 2))
        sx (/ mw canvas-w)
        sy (/ mh canvas-h)
        s (min sx sy 2)]
    (set! (.. canvas -style -width) (str (* canvas-w s) "px"))
    (set! (.. canvas -style -height) (str (* canvas-h s) "px"))))

;; --- Init ---
(defn init []
  (let [canvas (get-canvas)]
    (set! (.-width canvas) canvas-w)
    (set! (.-height canvas) canvas-h)
    (.addEventListener js/document "keydown" handle-key)
    (.addEventListener canvas "touchstart" handle-ts #js {:passive false})
    (.addEventListener canvas "touchend" handle-te #js {:passive false})
    (setup-dpad)
    (.addEventListener js/window "resize" resize)
    (resize)
    (swap! state reset-game)
    (start-loop)))

;; Auto-start
(if (= (.-readyState js/document) "loading")
  (.addEventListener js/document "DOMContentLoaded" init)
  (init))
