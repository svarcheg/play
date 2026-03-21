(ns snake.core)

;; --- Constants ---
(def cell-size 20)
(def grid-w 20)
(def grid-h 25)
(def canvas-w (* grid-w cell-size))
(def canvas-h (* grid-h cell-size))
(def initial-tick 150)
(def min-tick 80)

;; --- Colors (Airport Terminal) ---
(def colors {:bg "#e8e4df"
             :floor "#d4cfc8"
             :grid "#ccc7be"
             :queue-head "#2c5f8a"
             :queue-body "#4a7fa8"
             :passport "#c0392b"
             :passport-glow "rgba(192,57,43,0.25)"
             :us-citizen "#27ae60"
             :booth "#5d4e37"
             :booth-closed "#c0392b"
             :text "#2c3e50"
             :text-light "#7f8c8d"
             :overlay "rgba(0,0,0,0.65)"
             :score-color "#c0392b"})

;; --- Sarcastic commentary ---
(def commentary
  ["Officer 3 is checking their phone again"
   "A family of 12 just cut in front of you"
   "Your gate closed 20 minutes ago"
   "The officer just went on a coffee break"
   "Someone forgot their documents. Again."
   "You can see US citizens breezing through..."
   "Your luggage is doing laps on the carousel"
   "3 booths open out of 47. Classic JFK."
   "The officer is having a lovely chat"
   "You've aged 2 years in this line"
   "A child behind you is screaming. Hour 3."
   "Free WiFi expired. Of course it did."
   "You start questioning all life decisions"
   "The line moved! No wait, false alarm."
   "Someone is arguing about a visa stamp"
   "Officer shift change. Line paused 15 min."
   "You memorized every ceiling tile by now"
   "The passport scanner broke. Naturally."
   "You missed your connecting flight. Congrats!"
   "A pigeon got in. Most excitement all day."])

;; --- State ---
(def state (atom {:snake [[10 12] [9 12] [8 12]]
                  :dir [1 0]
                  :next-dir [1 0]
                  :food [15 8]
                  :score 0
                  :hi 0
                  :minutes 0
                  :over false
                  :paused false
                  :tid nil
                  :tick-ms initial-tick
                  :commentary nil
                  :commentary-timer 0
                  :us-citizens []
                  :us-timer 0
                  :booth-closed false
                  :booth-timer 0
                  :ticks 0}))

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

(defn rand-commentary []
  (nth commentary (js/Math.floor (* (js/Math.random) (count commentary)))))

;; --- US Citizen spawning ---
(defn spawn-us-citizen []
  (let [side (js/Math.floor (* (js/Math.random) 2))
        y (js/Math.floor (* (js/Math.random) grid-h))]
    (if (zero? side)
      {:x 0 :y y :dx 1}
      {:x (dec grid-w) :y y :dx -1})))

(defn move-us-citizens [citizens]
  (vec (filter (fn [c] (and (>= (:x c) -1) (<= (:x c) grid-w)))
               (map (fn [c] (update c :x + (:dx c))) citizens))))

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
          ;; collision with self
          self-collision (some #(vec= new-head %) (rest new-snake))
          ;; collision with US citizens zipping through
          us-hit (some (fn [c] (and (= (first new-head) (:x c))
                                    (= (second new-head) (:y c))))
                       (:us-citizens st))
          collision (or self-collision us-hit)
          new-score (if ate (+ (:score st) 1) (:score st))
          new-minutes (if ate (+ (:minutes st) (+ 5 (js/Math.floor (* (js/Math.random) 15)))) (:minutes st))
          ticks (inc (:ticks st))
          ;; speed up slightly
          new-tick (max min-tick (- initial-tick (js/Math.floor (/ ticks 3))))
          ;; commentary
          ct (:commentary-timer st)
          new-ct (if (zero? (mod ticks 40)) 0 (inc ct))
          new-comment (if (zero? new-ct) (rand-commentary) (:commentary st))
          ;; us citizens
          ut (:us-timer st)
          new-us (move-us-citizens (:us-citizens st))
          spawn-us (zero? (mod ticks 12))
          final-us (if spawn-us (conj new-us (spawn-us-citizen)) new-us)
          ;; booth events
          bt (:booth-timer st)
          booth-event (zero? (mod ticks 80))
          new-booth (if booth-event (not (:booth-closed st)) (:booth-closed st))]
      (if collision
        (assoc st :over true
               :hi (max (:hi st) (:score st))
               :commentary (if us-hit
                             "You got trampled by a US citizen in the express lane!"
                             "The queue collapsed on itself. Just like your spirit."))
        (let [s2 (assoc st :snake new-snake :dir nd :score new-score
                        :minutes new-minutes
                        :hi (max (:hi st) new-score)
                        :ticks ticks
                        :tick-ms new-tick
                        :commentary new-comment
                        :commentary-timer new-ct
                        :us-citizens final-us
                        :us-timer (inc ut)
                        :booth-closed new-booth
                        :booth-timer (inc bt))]
          (if ate
            (assoc s2 :food (place-food new-snake))
            s2))))))

(defn reset-game [st]
  (let [snake [[10 12] [9 12] [8 12]]]
    (assoc st :snake snake :dir [1 0] :next-dir [1 0]
           :food (place-food snake) :score 0 :minutes 0
           :over false :paused false :ticks 0
           :tick-ms initial-tick
           :commentary "Welcome to JFK. Estimated wait: 2 hours. Actual wait: yes."
           :commentary-timer 0
           :us-citizens [] :us-timer 0
           :booth-closed false :booth-timer 0)))

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

;; Draw a simple person icon
(defn draw-person [ctx cx cy size color]
  (set! (.-fillStyle ctx) color)
  ;; head
  (.beginPath ctx)
  (.arc ctx cx (- cy (* size 0.3)) (* size 0.2) 0 (* 2 js/Math.PI))
  (.fill ctx)
  ;; body
  (.beginPath ctx)
  (.moveTo ctx cx (- cy (* size 0.1)))
  (.lineTo ctx cx (+ cy (* size 0.2)))
  (set! (.-strokeStyle ctx) color)
  (set! (.-lineWidth ctx) (* size 0.12))
  (.stroke ctx)
  ;; arms
  (.beginPath ctx)
  (.moveTo ctx (- cx (* size 0.25)) cy)
  (.lineTo ctx (+ cx (* size 0.25)) cy)
  (.stroke ctx)
  ;; legs
  (.beginPath ctx)
  (.moveTo ctx cx (+ cy (* size 0.2)))
  (.lineTo ctx (- cx (* size 0.15)) (+ cy (* size 0.45)))
  (.stroke ctx)
  (.beginPath ctx)
  (.moveTo ctx cx (+ cy (* size 0.2)))
  (.lineTo ctx (+ cx (* size 0.15)) (+ cy (* size 0.45)))
  (.stroke ctx))

;; Draw passport
(defn draw-passport [ctx cx cy size]
  (set! (.-fillStyle ctx) (:passport colors))
  (let [w (* size 0.7)
        h (* size 0.9)
        x (- cx (/ w 2))
        y (- cy (/ h 2))]
    (draw-rounded ctx x y w h 2)
    ;; gold circle emblem
    (set! (.-strokeStyle ctx) "#f1c40f")
    (set! (.-lineWidth ctx) 1.5)
    (.beginPath ctx)
    (.arc ctx cx cy (* size 0.18) 0 (* 2 js/Math.PI))
    (.stroke ctx)))

;; Draw booth
(defn draw-booth [ctx x y w h closed]
  (set! (.-fillStyle ctx) (if closed (:booth-closed colors) (:booth colors)))
  (draw-rounded ctx x y w h 3)
  (set! (.-fillStyle ctx) "#fff")
  (set! (.-font ctx) "bold 9px monospace")
  (set! (.-textAlign ctx) "center")
  (.fillText ctx (if closed "CLOSED" "OPEN") (+ x (/ w 2)) (+ y (/ h 2) 3)))

(defn render [st]
  (let [ctx (get-ctx)
        snake (:snake st)
        food (:food st)
        score (:score st)
        hi (:hi st)
        minutes (:minutes st)
        over (:over st)
        paused (:paused st)
        commentary (:commentary st)
        us-citizens (:us-citizens st)
        booth-closed (:booth-closed st)]

    ;; bg - airport floor
    (set! (.-fillStyle ctx) (:bg colors))
    (.fillRect ctx 0 0 canvas-w canvas-h)

    ;; floor tile grid
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

    ;; booth at top
    (draw-booth ctx (- (/ canvas-w 2) 40) 5 80 22 booth-closed)

    ;; queue rope lines (decorative)
    (set! (.-strokeStyle ctx) "#8b7355")
    (set! (.-lineWidth ctx) 1)
    (set! (.-setLineDash ctx) #js [4 4])
    (doseq [rx [60 140 260 340]]
      (.beginPath ctx)
      (.moveTo ctx rx 30)
      (.lineTo ctx rx (- canvas-h 20))
      (.stroke ctx))
    (.setLineDash ctx #js [])

    ;; passport (food) with glow
    (let [fx (first food)
          fy (second food)
          cx (+ (* fx cell-size) (/ cell-size 2))
          cy (+ (* fy cell-size) (/ cell-size 2))]
      (set! (.-fillStyle ctx) (:passport-glow colors))
      (.beginPath ctx)
      (.arc ctx cx cy (* cell-size 0.8) 0 (* 2 js/Math.PI))
      (.fill ctx)
      (draw-passport ctx cx cy cell-size))

    ;; US citizens zipping through
    (doseq [c us-citizens]
      (let [cx (+ (* (:x c) cell-size) (/ cell-size 2))
            cy (+ (* (:y c) cell-size) (/ cell-size 2))]
        (draw-person ctx cx cy cell-size (:us-citizen colors))
        ;; small US flag indicator
        (set! (.-fillStyle ctx) "#27ae60")
        (set! (.-font ctx) "8px sans-serif")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx "US" cx (- cy (* cell-size 0.5)))))

    ;; Queue (snake) - people in line
    (doseq [[i seg] (map-indexed vector snake)]
      (let [sx (first seg)
            sy (second seg)
            cx (+ (* sx cell-size) (/ cell-size 2))
            cy (+ (* sy cell-size) (/ cell-size 2))
            color (if (zero? i) (:queue-head colors) (:queue-body colors))]
        (draw-person ctx cx cy cell-size color)
        ;; suitcase for some
        (when (zero? (mod i 3))
          (set! (.-fillStyle ctx) "#8b7355")
          (draw-rounded ctx (+ (* sx cell-size) 2) (+ (* sy cell-size) 14) 6 5 1))))

    ;; Commentary ticker at bottom
    (when commentary
      (set! (.-fillStyle ctx) "rgba(44,62,80,0.85)")
      (draw-rounded ctx 5 (- canvas-h 28) (- canvas-w 10) 24 4)
      (set! (.-fillStyle ctx) "#ecf0f1")
      (set! (.-font ctx) "11px 'Courier New',monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx commentary (/ canvas-w 2) (- canvas-h 12)))

    ;; Game Over overlay
    (when over
      (set! (.-fillStyle ctx) (:overlay colors))
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (set! (.-fillStyle ctx) "#e74c3c")
      (set! (.-font ctx) "bold 22px 'Courier New',monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "FLIGHT DEPARTED" (/ canvas-w 2) (- (/ canvas-h 2) 50))
      (set! (.-fillStyle ctx) "#ecf0f1")
      (set! (.-font ctx) "14px 'Courier New',monospace")
      (.fillText ctx (str "People in queue: " score) (/ canvas-w 2) (- (/ canvas-h 2) 20))
      (.fillText ctx (str "Minutes wasted: " minutes) (/ canvas-w 2) (+ (/ canvas-h 2) 5))
      (.fillText ctx (str "Record queue: " hi) (/ canvas-w 2) (+ (/ canvas-h 2) 30))
      ;; death commentary
      (when commentary
        (set! (.-fillStyle ctx) "#f39c12")
        (set! (.-font ctx) "italic 11px 'Courier New',monospace")
        (.fillText ctx commentary (/ canvas-w 2) (+ (/ canvas-h 2) 58)))
      (set! (.-fillStyle ctx) "#bdc3c7")
      (set! (.-font ctx) "12px 'Courier New',monospace")
      (.fillText ctx "Tap or Space to suffer again" (/ canvas-w 2) (+ (/ canvas-h 2) 85)))

    ;; Paused
    (when (and paused (not over))
      (set! (.-fillStyle ctx) (:overlay colors))
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (set! (.-fillStyle ctx) "#ecf0f1")
      (set! (.-font ctx) "bold 20px 'Courier New',monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "PAUSED" (/ canvas-w 2) (- (/ canvas-h 2) 10))
      (set! (.-font ctx) "12px 'Courier New',monospace")
      (.fillText ctx "(as if the line wasn't paused already)" (/ canvas-w 2) (+ (/ canvas-h 2) 15)))))

(defn update-display [st]
  (let [se (js/document.getElementById "score")
        he (js/document.getElementById "high-score")
        me (js/document.getElementById "minutes")]
    (when se (set! (.-textContent se) (:score st)))
    (when he (set! (.-textContent he) (:hi st)))
    (when me (set! (.-textContent me) (:minutes st)))))

;; --- Game Loop ---
(defn game-tick []
  (when-not (:paused @state)
    (swap! state move-snake))
  (render @state)
  (update-display @state))

(defn start-loop []
  (when-let [id (:tid @state)]
    (js/clearInterval id))
  (swap! state assoc :tid (js/setInterval game-tick (:tick-ms @state))))

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
            (do (swap! state reset-game) (start-loop))
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
          (do (swap! state reset-game) (start-loop))
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
        mh (.-clientHeight container)
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

(if (= (.-readyState js/document) "loading")
  (.addEventListener js/document "DOMContentLoaded" init)
  (init))
