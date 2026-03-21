(ns snake.core)

;; --- JFK Immigration Queue Simulator ---
;; You just landed. Welcome to hell.

;; --- Constants ---
(def canvas-w 400)
(def canvas-h 500)
(def num-lanes 5)
(def lane-w (/ canvas-w (+ num-lanes 1))) ;; +1 for US citizen express lane
(def player-size 14)
(def queue-top 60)        ;; booth area
(def queue-bottom 470)    ;; back of queue
(def queue-length (- queue-bottom queue-top))
(def base-speed 0.3)
(def tick-ms 33)          ;; ~30fps

;; --- Commentary ---
(def commentary
  [;; general waiting
   "You've been standing here for 47 minutes."
   "The officer is having a lovely chat with someone's passport."
   "3 booths open. Out of 52. Classic JFK."
   "Someone ahead forgot which country they're from."
   "Free WiFi expired. Of course."
   "A child behind you has been screaming for 40 minutes."
   "You start questioning all life decisions."
   "The line moved! ...No wait, false alarm."
   "You can feel your connecting flight leaving."
   "You memorized every ceiling tile by now."
   "The passport scanner jammed. Again."
   "Officer shift change. Everyone wait 15 minutes."
   "A pigeon got in. Most excitement all day."
   "Someone is arguing about a visa stamp."
   "You've aged visibly since landing."
   "Your luggage is doing victory laps on the carousel."
   "The guy next to you has been here since Tuesday."
   ;; redirect-specific
   "An officer points you to another lane. It's longer."
   "\"Step this way please.\" It's never good news."
   "You've been rerouted. The new lane hasn't moved in 20 min."
   "Congratulations! You've been selected for the slow lane."
   ;; US citizens
   "A US citizen just breezed past you. Took 8 seconds."
   "The express lane is moving at the speed of light."
   "Global Entry passengers wave at you sympathetically."])

(def redirect-lines
  ["\"Sir/Ma'am, please step to lane %d.\""
   "An officer escorts you to lane %d. It's worse."
   "\"This lane is closing. Move to lane %d.\""
   "You've been redirected to lane %d. There are 90 people ahead."
   "\"Random security check. Please proceed to lane %d.\""])

;; --- State ---
(def state
  (atom {:player-lane 2        ;; which lane (0-4)
         :player-y queue-bottom ;; y position (lower = further back)
         :lane-speeds [1.0 0.8 1.2 0.6 1.0]  ;; speed multipliers
         :lane-people []       ;; [{:lane :y}] other people in queues
         :us-citizens []       ;; [{:y :speed}] express lane
         :booths []            ;; [{:lane :open}]
         :score 0              ;; minutes wasted
         :redirects 0          ;; times redirected
         :times-near-front 0   ;; how many times you almost made it
         :paused false
         :over false
         :tid nil
         :ticks 0
         :commentary nil
         :commentary-timer 0
         :redirect-timer 0     ;; cooldown after redirect
         :lane-events []       ;; [{:lane :type :timer}]
         :us-timer 0
         :target-lane nil      ;; lane switch animation target
         :frustration 0}))     ;; builds up, shows on UI

(def touch-st (atom nil))

;; --- Helpers ---
(defn lane-x [lane]
  (+ (* lane lane-w) (/ lane-w 2)))

(defn express-lane-x []
  (+ (* num-lanes lane-w) (/ lane-w 2)))

(defn rand-between [a b]
  (+ a (* (js/Math.random) (- b a))))

(defn rand-commentary []
  (nth commentary (js/Math.floor (* (js/Math.random) (count commentary)))))

(defn rand-redirect-line [lane]
  (let [tmpl (nth redirect-lines (js/Math.floor (* (js/Math.random) (count redirect-lines))))]
    (.replace tmpl "%d" (str (inc lane)))))

;; --- Init people in queues ---
(defn init-lane-people []
  (let [people (atom [])]
    (doseq [lane (range num-lanes)]
      (let [n (+ 8 (js/Math.floor (* (js/Math.random) 12)))]
        (doseq [i (range n)]
          (let [y (- queue-bottom (* i (+ 18 (* (js/Math.random) 10))))]
            (when (> y (+ queue-top 30))
              (swap! people conj {:lane lane :y y}))))))
    @people))

(defn init-booths []
  (vec (map (fn [i] {:lane i :open (< (js/Math.random) 0.5)}) (range num-lanes))))

;; --- Game Logic ---
(defn move-forward [st]
  (if (or (:over st) (:paused st))
    st
    (let [ticks (inc (:ticks st))
          lane (:player-lane st)
          speed (* base-speed (nth (:lane-speeds st) lane))
          ;; check if lane is blocked by event
          lane-blocked (some (fn [ev] (and (= (:lane ev) lane) (> (:timer ev) 0)))
                            (:lane-events st))
          effective-speed (if lane-blocked 0 speed)
          new-y (- (:player-y st) effective-speed)
          ;; check booth at this lane
          booth (nth (:booths st) lane)
          booth-closed (not (:open booth))
          ;; near the front?
          near-front (< new-y (+ queue-top 50))
          ;; THE CRUEL REDIRECT
          redirect-cooldown (:redirect-timer st)
          should-redirect (and near-front
                               (< redirect-cooldown 1)
                               (> (:times-near-front st) 0)
                               (< (js/Math.random) 0.7))
          first-time-near (and near-front (zero? (:times-near-front st)))
          ;; first time: always redirect
          force-redirect (and first-time-near (< redirect-cooldown 1))
          do-redirect (or should-redirect force-redirect)
          ;; pick a worse lane
          other-lanes (vec (filter #(not= % lane) (range num-lanes)))
          redirect-lane (when do-redirect
                          (nth other-lanes (js/Math.floor (* (js/Math.random) (count other-lanes)))))
          ;; update score (1 minute every ~90 ticks ≈ 3 seconds)
          add-minute (zero? (mod ticks 90))
          new-score (if add-minute (inc (:score st)) (:score st))
          ;; frustration builds
          new-frust (min 100 (+ (:frustration st)
                                (if lane-blocked 0.15 0.03)
                                (if do-redirect 15 0)))
          ;; commentary
          ct (:commentary-timer st)
          show-comment (zero? (mod ticks 150))
          new-comment (cond
                        do-redirect (rand-redirect-line redirect-lane)
                        show-comment (rand-commentary)
                        :else (:commentary st))
          new-ct (if (or do-redirect show-comment) 0 (inc ct))
          ;; move other people
          new-people (vec (map (fn [p]
                                 (let [pspeed (* base-speed (nth (:lane-speeds st) (:lane p)) 0.7)
                                       blocked (some (fn [ev] (and (= (:lane ev) (:lane p)) (> (:timer ev) 0)))
                                                     (:lane-events st))
                                       ps (if blocked 0 pspeed)]
                                   (update p :y - ps)))
                               (:lane-people st)))
          ;; US citizens moving fast through express lane
          ut (:us-timer st)
          spawn-us (zero? (mod ticks 60))
          new-us (vec (filter (fn [c] (> (:y c) (- queue-top 20)))
                              (map (fn [c] (update c :y - (:speed c))) (:us-citizens st))))
          final-us (if spawn-us
                     (conj new-us {:y queue-bottom :speed (+ 2 (* (js/Math.random) 2))})
                     new-us)
          ;; lane events (random slowdowns)
          new-events (vec (map (fn [ev] (update ev :timer dec)) (:lane-events st)))
          spawn-event (and (zero? (mod ticks 200)) (< (js/Math.random) 0.6))
          event-lane (js/Math.floor (* (js/Math.random) num-lanes))
          final-events (if spawn-event
                         (conj (vec (filter #(> (:timer %) 0) new-events))
                               {:lane event-lane
                                :type (if (< (js/Math.random) 0.5) "break" "scanner")
                                :timer 180})
                         (vec (filter #(> (:timer %) 0) new-events)))
          ;; randomize lane speeds occasionally
          new-speeds (if (zero? (mod ticks 300))
                       (vec (map (fn [_] (+ 0.4 (* (js/Math.random) 1.2))) (range num-lanes)))
                       (:lane-speeds st))
          ;; toggle booths occasionally
          new-booths (if (zero? (mod ticks 400))
                       (vec (map (fn [b]
                                   (if (< (js/Math.random) 0.3)
                                     (update b :open not)
                                     b))
                                 (:booths st)))
                       (:booths st))
          ;; game over: you actually reached the booth and it's open (almost impossible)
          reached-booth (and (< new-y (+ queue-top 20)) (not do-redirect) (:open booth))
          ;; or frustration maxed out
          rage-quit (>= new-frust 100)]

      (cond
        do-redirect
        (assoc st :player-lane redirect-lane
               :player-y (- queue-bottom (* (js/Math.random) 30))
               :ticks ticks
               :score new-score
               :redirects (inc (:redirects st))
               :times-near-front (inc (:times-near-front st))
               :redirect-timer 300
               :frustration new-frust
               :commentary new-comment
               :commentary-timer new-ct
               :lane-people new-people
               :us-citizens final-us
               :lane-events final-events
               :lane-speeds new-speeds
               :booths new-booths)

        (or reached-booth rage-quit)
        (assoc st :over true
               :ticks ticks
               :score new-score
               :frustration new-frust
               :commentary (if rage-quit
                             "You snapped. Security is on their way."
                             "You... actually made it through?! Is this real?"))

        :else
        (assoc st :player-y (max (+ queue-top 15) new-y)
               :ticks ticks
               :score new-score
               :frustration new-frust
               :commentary new-comment
               :commentary-timer new-ct
               :redirect-timer (max 0 (dec redirect-cooldown))
               :lane-people new-people
               :us-citizens final-us
               :lane-events final-events
               :lane-speeds new-speeds
               :booths new-booths)))))

(defn reset-game [st]
  (assoc st
         :player-lane 2
         :player-y queue-bottom
         :lane-speeds [1.0 0.8 1.2 0.6 1.0]
         :lane-people (init-lane-people)
         :us-citizens []
         :booths (init-booths)
         :score 0
         :redirects 0
         :times-near-front 0
         :paused false
         :over false
         :ticks 0
         :commentary "Welcome to JFK. You just landed. Good luck."
         :commentary-timer 0
         :redirect-timer 0
         :lane-events []
         :us-timer 0
         :frustration 0))

;; --- Rendering ---
(defn get-canvas [] (js/document.getElementById "game-canvas"))
(defn get-ctx [] (.getContext (get-canvas) "2d"))

(defn draw-person [ctx x y size color]
  (set! (.-fillStyle ctx) color)
  (.beginPath ctx)
  (.arc ctx x (- y (* size 0.35)) (* size 0.22) 0 (* 2 js/Math.PI))
  (.fill ctx)
  (set! (.-strokeStyle ctx) color)
  (set! (.-lineWidth ctx) (* size 0.13))
  (set! (.-lineCap ctx) "round")
  (.beginPath ctx)
  (.moveTo ctx x (- y (* size 0.12)))
  (.lineTo ctx x (+ y (* size 0.15)))
  (.stroke ctx)
  (.beginPath ctx)
  (.moveTo ctx (- x (* size 0.22)) (- y (* size 0.02)))
  (.lineTo ctx (+ x (* size 0.22)) (- y (* size 0.02)))
  (.stroke ctx)
  (.beginPath ctx)
  (.moveTo ctx x (+ y (* size 0.15)))
  (.lineTo ctx (- x (* size 0.15)) (+ y (* size 0.4)))
  (.stroke ctx)
  (.beginPath ctx)
  (.moveTo ctx x (+ y (* size 0.15)))
  (.lineTo ctx (+ x (* size 0.15)) (+ y (* size 0.4)))
  (.stroke ctx))

(defn draw-suitcase [ctx x y]
  (set! (.-fillStyle ctx) "#8b7355")
  (.fillRect ctx (- x 4) y 8 6)
  (set! (.-strokeStyle ctx) "#6b5335")
  (set! (.-lineWidth ctx) 0.5)
  (.strokeRect ctx (- x 4) y 8 6))

(defn render [st]
  (let [ctx (get-ctx)]
    ;; bg - terminal floor
    (set! (.-fillStyle ctx) "#e8e4df")
    (.fillRect ctx 0 0 canvas-w canvas-h)

    ;; Lane dividers
    (set! (.-strokeStyle ctx) "#bbb5aa")
    (set! (.-lineWidth ctx) 1)
    (doseq [i (range (inc num-lanes))]
      (let [x (* i lane-w)]
        (.beginPath ctx)
        (.moveTo ctx x queue-top)
        (.lineTo ctx x queue-bottom)
        (.stroke ctx)))
    ;; express lane divider (thicker)
    (set! (.-strokeStyle ctx) "#27ae60")
    (set! (.-lineWidth ctx) 2)
    (let [ex (* num-lanes lane-w)]
      (.beginPath ctx)
      (.moveTo ctx ex queue-top)
      (.lineTo ctx ex queue-bottom)
      (.stroke ctx))

    ;; Rope stanchions (dots along lanes)
    (set! (.-fillStyle ctx) "#8b7355")
    (doseq [i (range (inc num-lanes))]
      (doseq [yy (range queue-top queue-bottom 40)]
        (let [x (* i lane-w)]
          (.beginPath ctx)
          (.arc ctx x yy 2.5 0 (* 2 js/Math.PI))
          (.fill ctx))))

    ;; Lane labels at top
    (set! (.-fillStyle ctx) "#7f8c8d")
    (set! (.-font ctx) "9px monospace")
    (set! (.-textAlign ctx) "center")
    (doseq [i (range num-lanes)]
      (.fillText ctx (str "LANE " (inc i)) (lane-x i) (- queue-top 5)))
    (set! (.-fillStyle ctx) "#27ae60")
    (.fillText ctx "EXPRESS" (express-lane-x) (- queue-top 5))
    (set! (.-fillStyle ctx) "#27ae60")
    (set! (.-font ctx) "7px monospace")
    (.fillText ctx "US/GLOBAL ENTRY" (express-lane-x) (- queue-top 15))

    ;; Booths at top
    (doseq [b (:booths st)]
      (let [x (- (lane-x (:lane b)) 22)
            open (:open b)]
        (set! (.-fillStyle ctx) (if open "#5d4e37" "#c0392b"))
        (.fillRect ctx x 10 44 35)
        (set! (.-fillStyle ctx) "#fff")
        (set! (.-font ctx) "bold 8px monospace")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx (if open "CBP" "CLOSED") (+ x 22) 25)
        (when open
          (set! (.-font ctx) "7px monospace")
          (.fillText ctx "OFFICER" (+ x 22) 38))))

    ;; Express lane booth (always open, always fast)
    (let [ex (- (express-lane-x) 22)]
      (set! (.-fillStyle ctx) "#27ae60")
      (.fillRect ctx ex 10 44 35)
      (set! (.-fillStyle ctx) "#fff")
      (set! (.-font ctx) "bold 8px monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "FAST" (+ ex 22) 25)
      (set! (.-font ctx) "7px monospace")
      (.fillText ctx "TRACK" (+ ex 22) 38))

    ;; Lane events (blocked lanes)
    (doseq [ev (:lane-events st)]
      (when (> (:timer ev) 0)
        (let [x (lane-x (:lane ev))
              label (if (= (:type ev) "break") "BREAK" "JAMMED")]
          (set! (.-fillStyle ctx) "rgba(192,57,43,0.15)")
          (.fillRect ctx (- x (/ lane-w 2)) queue-top lane-w queue-length)
          (set! (.-fillStyle ctx) "#c0392b")
          (set! (.-font ctx) "bold 9px monospace")
          (set! (.-textAlign ctx) "center")
          (.fillText ctx label x (+ queue-top (/ queue-length 2))))))

    ;; Other people in queues
    (doseq [p (:lane-people st)]
      (when (and (> (:y p) queue-top) (< (:y p) queue-bottom))
        (draw-person ctx (lane-x (:lane p)) (:y p) 12 "#95a5a6")
        (when (< (js/Math.random) 0.05)
          (draw-suitcase ctx (+ (lane-x (:lane p)) 8) (:y p)))))

    ;; US citizens in express lane
    (doseq [c (:us-citizens st)]
      (draw-person ctx (express-lane-x) (:y c) 13 "#27ae60")
      (set! (.-fillStyle ctx) "#27ae60")
      (set! (.-font ctx) "7px sans-serif")
      (set! (.-textAlign ctx) "center"))

    ;; Player (you!)
    (let [px (lane-x (:player-lane st))
          py (:player-y st)]
      ;; highlight
      (set! (.-fillStyle ctx) "rgba(41,128,185,0.15)")
      (.beginPath ctx)
      (.arc ctx px py 14 0 (* 2 js/Math.PI))
      (.fill ctx)
      ;; person
      (draw-person ctx px py 16 "#2c5f8a")
      ;; "YOU" label
      (set! (.-fillStyle ctx) "#2c5f8a")
      (set! (.-font ctx) "bold 8px monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "YOU" px (- py 14)))

    ;; Progress bar on right side
    (let [progress (/ (- queue-bottom (:player-y st)) queue-length)
          bar-h 200
          bar-x (- canvas-w 15)
          bar-y (+ queue-top 50)]
      (set! (.-fillStyle ctx) "#ccc7be")
      (.fillRect ctx bar-x bar-y 8 bar-h)
      (set! (.-fillStyle ctx) "#2c5f8a")
      (.fillRect ctx bar-x (+ bar-y (- bar-h (* progress bar-h))) 8 (* progress bar-h))
      (set! (.-fillStyle ctx) "#7f8c8d")
      (set! (.-font ctx) "7px monospace")
      (set! (.-textAlign ctx) "center")
      (.save ctx)
      (.translate ctx (- canvas-w 6) (+ bar-y (/ bar-h 2)))
      (.rotate ctx (/ js/Math.PI 2))
      ;; not using fillText rotated, just skip
      (.restore ctx))

    ;; Frustration bar at bottom
    (let [frust (:frustration st)
          bar-w (- canvas-w 40)
          bar-x 20
          bar-y (- canvas-h 22)]
      (set! (.-fillStyle ctx) "#d4cfc8")
      (.fillRect ctx bar-x bar-y bar-w 10)
      (set! (.-fillStyle ctx)
            (cond (< frust 40) "#f39c12"
                  (< frust 70) "#e67e22"
                  :else "#c0392b"))
      (.fillRect ctx bar-x bar-y (* bar-w (/ frust 100)) 10)
      (set! (.-fillStyle ctx) "#2c3e50")
      (set! (.-font ctx) "8px monospace")
      (set! (.-textAlign ctx) "left")
      (.fillText ctx "PATIENCE" (+ bar-x 2) (- bar-y 3)))

    ;; Commentary
    (when (:commentary st)
      (set! (.-fillStyle ctx) "rgba(44,62,80,0.9)")
      (.fillRect ctx 5 (- canvas-h 48) (- canvas-w 10) 22)
      (set! (.-fillStyle ctx) "#ecf0f1")
      (set! (.-font ctx) "10px 'Courier New',monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx (:commentary st) (/ canvas-w 2) (- canvas-h 33)))

    ;; Game Over
    (when (:over st)
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.7)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (let [rage (>= (:frustration st) 100)]
        (set! (.-fillStyle ctx) (if rage "#e74c3c" "#27ae60"))
        (set! (.-font ctx) "bold 20px 'Courier New',monospace")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx (if rage "YOU SNAPPED" "YOU MADE IT?!")
                   (/ canvas-w 2) (- (/ canvas-h 2) 60))
        (set! (.-fillStyle ctx) "#ecf0f1")
        (set! (.-font ctx) "13px 'Courier New',monospace")
        (.fillText ctx (str "Time wasted: " (:score st) " min")
                   (/ canvas-w 2) (- (/ canvas-h 2) 30))
        (.fillText ctx (str "Times redirected: " (:redirects st))
                   (/ canvas-w 2) (- (/ canvas-h 2) 10))
        (.fillText ctx (str "Times almost there: " (:times-near-front st))
                   (/ canvas-w 2) (+ (/ canvas-h 2) 10))
        (when (:commentary st)
          (set! (.-fillStyle ctx) "#f39c12")
          (set! (.-font ctx) "italic 10px 'Courier New',monospace")
          (.fillText ctx (:commentary st) (/ canvas-w 2) (+ (/ canvas-h 2) 40)))
        (set! (.-fillStyle ctx) "#bdc3c7")
        (set! (.-font ctx) "11px 'Courier New',monospace")
        (.fillText ctx "Tap or Space to try again" (/ canvas-w 2) (+ (/ canvas-h 2) 70))))

    ;; Paused
    (when (and (:paused st) (not (:over st)))
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.5)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (set! (.-fillStyle ctx) "#ecf0f1")
      (set! (.-font ctx) "bold 18px 'Courier New',monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "PAUSED" (/ canvas-w 2) (- (/ canvas-h 2) 10))
      (set! (.-font ctx) "11px 'Courier New',monospace")
      (.fillText ctx "(the line is also paused. as always.)" (/ canvas-w 2) (+ (/ canvas-h 2) 15)))))

(defn update-display [st]
  (let [se (js/document.getElementById "score")
        re (js/document.getElementById "redirects")
        fe (js/document.getElementById "frustration")]
    (when se (set! (.-textContent se) (str (:score st) " min")))
    (when re (set! (.-textContent re) (:redirects st)))
    (when fe (set! (.-textContent fe) (str (js/Math.floor (:frustration st)) "%")))))

;; --- Game Loop ---
(defn game-tick []
  (swap! state move-forward)
  (render @state)
  (update-display @state))

(defn start-loop []
  (when-let [id (:tid @state)]
    (js/clearInterval id))
  (swap! state assoc :tid (js/setInterval game-tick tick-ms)))

;; --- Input: switch lanes ---
(defn switch-lane [dir]
  (when-not (or (:over @state) (:paused @state))
    (let [current (:player-lane @state)
          target (+ current dir)]
      (when (and (>= target 0) (< target num-lanes))
        (swap! state assoc :player-lane target)))))

(defn handle-key [e]
  (let [k (.-key e)]
    (cond
      (or (= k "ArrowLeft") (= k "a") (= k "A"))
      (do (.preventDefault e) (switch-lane -1))
      (or (= k "ArrowRight") (= k "d") (= k "D"))
      (do (.preventDefault e) (switch-lane 1))
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
      (if (and (< ax 20) (< ay 20))
        ;; tap
        (if (:over @state)
          (do (swap! state reset-game) (start-loop))
          (swap! state update :paused not))
        ;; swipe
        (when (> ax ay)
          (switch-lane (if (pos? dx) 1 -1))))))
  (reset! touch-st nil))

;; --- D-pad (only left/right matter) ---
(defn setup-dpad []
  (doseq [[id dir] [["btn-left" -1]
                     ["btn-right" 1]]]
    (when-let [btn (js/document.getElementById id)]
      (.addEventListener btn "touchstart"
                         (fn [e] (.preventDefault e) (switch-lane dir))
                         #js {:passive false})
      (.addEventListener btn "mousedown"
                         (fn [e] (.preventDefault e) (switch-lane dir))))))

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
