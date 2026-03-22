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

;; --- Person types for visual variety ---
(def person-colors
  ["#95a5a6" "#7f8c8d" "#8e6e53" "#a0522d" "#6b7b8d"
   "#9b7cb8" "#5d8a6b" "#b07d62" "#708090" "#a0856e"
   "#6a5acd" "#8b6969" "#556b2f" "#4a708b" "#8b7765"])

;; accessory: 0=none 1=hat 2=suitcase 3=backpack 4=none
(defn make-person [lane y]
  {:lane lane
   :y y
   :xoff (- (* (js/Math.random) 22) 11)
   :size (+ 9 (js/Math.floor (* (js/Math.random) 5)))
   :color (nth person-colors (js/Math.floor (* (js/Math.random) (count person-colors))))
   :acc (js/Math.floor (* (js/Math.random) 5))})

;; --- Init people in queues ---
;; Pack tightly: ~10px spacing, two sub-rows per lane
(defn init-lane-people []
  (let [people (atom [])]
    (doseq [lane (range num-lanes)]
      (let [n (+ 25 (js/Math.floor (* (js/Math.random) 10)))]
        (doseq [i (range n)]
          (let [y (- queue-bottom (* i (+ 10 (* (js/Math.random) 5))))]
            (when (> y (+ queue-top 30))
              (swap! people conj (make-person lane y)))))))
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
          ;; check booth at this lane
          booth (nth (:booths st) lane)
          booth-closed (not (:open booth))
          ;; check if lane is blocked by event or closed booth
          lane-blocked (or booth-closed
                           (some (fn [ev] (and (= (:lane ev) lane) (> (:timer ev) 0)))
                                 (:lane-events st)))
          effective-speed (if lane-blocked 0 speed)
          new-y (- (:player-y st) effective-speed)
          ;; near the front?
          near-front (< new-y (+ queue-top 50))
          ;; THE CRUEL REDIRECT (disabled after 2 hours / 120 min)
          over-2h (>= (:score st) 120)
          redirect-cooldown (:redirect-timer st)
          should-redirect (and near-front
                               (not over-2h)
                               (< redirect-cooldown 1)
                               (> (:times-near-front st) 0)
                               (< (js/Math.random) 0.7))
          first-time-near (and near-front (zero? (:times-near-front st)))
          ;; first time: always redirect (unless over 2h)
          force-redirect (and first-time-near (< redirect-cooldown 1) (not over-2h))
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
          moved-people (vec (map (fn [p]
                                   (let [pbooth (nth (:booths st) (:lane p))
                                         pbooth-closed (not (:open pbooth))
                                         pspeed (* base-speed (nth (:lane-speeds st) (:lane p)) 0.7)
                                         blocked (or pbooth-closed
                                                     (some (fn [ev] (and (= (:lane ev) (:lane p)) (> (:timer ev) 0)))
                                                           (:lane-events st)))
                                         ps (if blocked 0 pspeed)]
                                     (update p :y - ps)))
                                 (:lane-people st)))
          ;; remove people that went past booths
          alive-people (vec (filter (fn [p] (> (:y p) (+ queue-top 10))) moved-people))
          ;; continuously spawn people at back to keep lanes densely packed
          ;; spawn every 8 ticks, target 30 per lane
          spawn-people (zero? (mod ticks 8))
          new-people (if spawn-people
                       (into alive-people
                             (apply concat
                               (for [l (range num-lanes)
                                     :let [lane-ppl (filter #(= (:lane %) l) alive-people)
                                           lane-count (count lane-ppl)
                                           ;; find the max y (furthest back person)
                                           max-y (if (pos? lane-count)
                                                   (apply max (map :y lane-ppl))
                                                   queue-bottom)]
                                     :when (< lane-count 30)]
                                 ;; spawn 1-3 people at back
                                 (for [j (range (min 3 (- 30 lane-count)))]
                                   (make-person l (+ max-y 10 (* j (+ 10 (rand-between 0 4)))))))))
                       alive-people)
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
               :player-y queue-bottom
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

;; --- Drawing helpers ---
(defn draw-person [ctx x y size color acc]
  (.save ctx)
  (let [head-r (* size 0.25)
        head-y (- y (* size 0.38))
        a (or acc 0)]
    ;; shadow
    (set! (.-fillStyle ctx) "rgba(0,0,0,0.08)")
    (.beginPath ctx)
    (.ellipse ctx x (+ y (* size 0.45)) (* size 0.25) (* size 0.08) 0 0 (* 2 js/Math.PI))
    (.fill ctx)
    ;; legs
    (set! (.-strokeStyle ctx) (if (= color "#2c5f8a") "#1a3d5c" "#555"))
    (set! (.-lineWidth ctx) (* size 0.12))
    (set! (.-lineCap ctx) "round")
    (.beginPath ctx)
    (.moveTo ctx x (+ y (* size 0.12)))
    (.lineTo ctx (- x (* size 0.13)) (+ y (* size 0.4)))
    (.stroke ctx)
    (.beginPath ctx)
    (.moveTo ctx x (+ y (* size 0.12)))
    (.lineTo ctx (+ x (* size 0.13)) (+ y (* size 0.4)))
    (.stroke ctx)
    ;; body (torso)
    (set! (.-fillStyle ctx) color)
    (.beginPath ctx)
    (.moveTo ctx (- x (* size 0.2)) (- y (* size 0.15)))
    (.lineTo ctx (+ x (* size 0.2)) (- y (* size 0.15)))
    (.quadraticCurveTo ctx (+ x (* size 0.22)) (+ y (* size 0.15))
                           x (+ y (* size 0.18)))
    (.quadraticCurveTo ctx (- x (* size 0.22)) (+ y (* size 0.15))
                           (- x (* size 0.2)) (- y (* size 0.15)))
    (.fill ctx)
    ;; arms
    (set! (.-strokeStyle ctx) color)
    (set! (.-lineWidth ctx) (* size 0.1))
    (.beginPath ctx)
    (.moveTo ctx (- x (* size 0.2)) (- y (* size 0.08)))
    (.lineTo ctx (- x (* size 0.32)) (+ y (* size 0.08)))
    (.stroke ctx)
    (.beginPath ctx)
    (.moveTo ctx (+ x (* size 0.2)) (- y (* size 0.08)))
    (.lineTo ctx (+ x (* size 0.32)) (+ y (* size 0.08)))
    (.stroke ctx)
    ;; neck
    (set! (.-strokeStyle ctx) "#dbb896")
    (set! (.-lineWidth ctx) (* size 0.1))
    (.beginPath ctx)
    (.moveTo ctx x (- y (* size 0.15)))
    (.lineTo ctx x (- y (* size 0.25)))
    (.stroke ctx)
    ;; head
    (set! (.-fillStyle ctx) "#dbb896")
    (.beginPath ctx)
    (.arc ctx x head-y head-r 0 (* 2 js/Math.PI))
    (.fill ctx)
    ;; hair
    (set! (.-fillStyle ctx) (cond (< a 2) "#3d2b1f" (= a 2) "#8b6914" :else "#1a1a2e"))
    (.beginPath ctx)
    (.arc ctx x (- head-y (* head-r 0.15)) head-r (* js/Math.PI 1.0) (* js/Math.PI 2.0))
    (.fill ctx)
    ;; eyes
    (set! (.-fillStyle ctx) "#222")
    (.beginPath ctx)
    (.arc ctx (- x (* head-r 0.4)) (+ head-y (* head-r 0.1)) (* head-r 0.12) 0 (* 2 js/Math.PI))
    (.fill ctx)
    (.beginPath ctx)
    (.arc ctx (+ x (* head-r 0.4)) (+ head-y (* head-r 0.1)) (* head-r 0.12) 0 (* 2 js/Math.PI))
    (.fill ctx)
    ;; accessory (stored on person, stable)
    (cond
      ;; hat
      (= a 1)
      (do (set! (.-fillStyle ctx) "#2c3e50")
          (.fillRect ctx (- x (* head-r 1.4)) (- head-y (* head-r 1.1)) (* head-r 2.8) (* head-r 0.4))
          (.fillRect ctx (- x (* head-r 0.8)) (- head-y (* head-r 1.5)) (* head-r 1.6) (* head-r 0.6)))
      ;; rolling suitcase
      (= a 2)
      (let [sx (+ x (* size 0.3)) sy (+ y (* size 0.05))]
        (set! (.-fillStyle ctx) "#4a6fa5")
        (.fillRect ctx sx (- sy 2) 7 8)
        (set! (.-strokeStyle ctx) "#3a5a85")
        (set! (.-lineWidth ctx) 0.8)
        (.strokeRect ctx sx (- sy 2) 7 8)
        ;; handle
        (set! (.-strokeStyle ctx) "#666")
        (set! (.-lineWidth ctx) 1)
        (.beginPath ctx)
        (.moveTo ctx (+ sx 3.5) (- sy 2))
        (.lineTo ctx (+ sx 3.5) (- sy 9))
        (.stroke ctx)
        ;; wheels
        (set! (.-fillStyle ctx) "#333")
        (.beginPath ctx)
        (.arc ctx (+ sx 1.5) (+ sy 6.5) 1.2 0 (* 2 js/Math.PI))
        (.fill ctx)
        (.beginPath ctx)
        (.arc ctx (+ sx 5.5) (+ sy 6.5) 1.2 0 (* 2 js/Math.PI))
        (.fill ctx))
      ;; backpack
      (= a 3)
      (do (set! (.-fillStyle ctx) "#c0392b")
          (let [bx (+ x (* size 0.06)) by (- y (* size 0.12))
                bw (* size 0.22) bh (* size 0.28)]
            (.beginPath ctx)
            (.moveTo ctx bx (+ by (* bh 0.15)))
            (.quadraticCurveTo ctx bx by (+ bx (* bw 0.3)) by)
            (.lineTo ctx (+ bx (* bw 0.7)) by)
            (.quadraticCurveTo ctx (+ bx bw) by (+ bx bw) (+ by (* bh 0.15)))
            (.lineTo ctx (+ bx bw) (+ by bh))
            (.lineTo ctx bx (+ by bh))
            (.closePath ctx)
            (.fill ctx)
            ;; pocket
            (set! (.-fillStyle ctx) "#a93226")
            (.fillRect ctx (+ bx 2) (+ by (* bh 0.5)) (- bw 4) (* bh 0.3))))
      ;; phone in hand
      (= a 4)
      (do (set! (.-fillStyle ctx) "#222")
          (.fillRect ctx (- x (* size 0.38)) (- y (* size 0.02)) 4 6)
          (set! (.-fillStyle ctx) "#55aaff")
          (.fillRect ctx (- x (* size 0.37)) (- y (* size 0.01)) 2.5 4))))
  (.restore ctx))

;; Draw a floor tile pattern
(defn draw-floor [ctx]
  (let [tile-size 20]
    (doseq [tx (range 0 canvas-w tile-size)]
      (doseq [ty (range queue-top queue-bottom tile-size)]
        (set! (.-fillStyle ctx)
              (if (even? (+ (quot tx tile-size) (quot ty tile-size)))
                "#e8e4df" "#ddd8d2"))
        (.fillRect ctx tx ty tile-size tile-size)))))

;; Draw rope barriers between stanchions
(defn draw-ropes [ctx]
  (doseq [i (range (inc num-lanes))]
    (let [x (* i lane-w)]
      ;; rope line
      (set! (.-strokeStyle ctx) "#c9a96e")
      (set! (.-lineWidth ctx) 1.5)
      (.setLineDash ctx #js [4 3])
      (.beginPath ctx)
      (.moveTo ctx x queue-top)
      (.lineTo ctx x queue-bottom)
      (.stroke ctx)
      (.setLineDash ctx #js [])
      ;; stanchion posts
      (set! (.-fillStyle ctx) "#b8963e")
      (doseq [yy (range queue-top queue-bottom 40)]
        ;; post base
        (.beginPath ctx)
        (.arc ctx x (+ yy 2) 3.5 0 (* 2 js/Math.PI))
        (.fill ctx)
        ;; post top (gold ball)
        (set! (.-fillStyle ctx) "#d4af37")
        (.beginPath ctx)
        (.arc ctx x yy 2.5 0 (* 2 js/Math.PI))
        (.fill ctx)
        (set! (.-fillStyle ctx) "#b8963e")))))

;; Draw a detailed CBP booth
(defn draw-booth [ctx x open lane-num]
  (.save ctx)
  ;; booth background
  (set! (.-fillStyle ctx) (if open "#3d3225" "#4a1a1a"))
  (.fillRect ctx (- x 25) 4 50 48)
  ;; booth desk surface
  (set! (.-fillStyle ctx) (if open "#5d4e37" "#6b2020"))
  (.fillRect ctx (- x 23) 42 46 10)
  ;; glass partition
  (set! (.-strokeStyle ctx) "rgba(180,220,255,0.4)")
  (set! (.-lineWidth ctx) 1.5)
  (.beginPath ctx)
  (.moveTo ctx (- x 20) 8)
  (.lineTo ctx (- x 20) 40)
  (.stroke ctx)
  (.beginPath ctx)
  (.moveTo ctx (+ x 20) 8)
  (.lineTo ctx (+ x 20) 40)
  (.stroke ctx)
  ;; monitor
  (when open
    (set! (.-fillStyle ctx) "#111")
    (.fillRect ctx (- x 8) 10 16 11)
    (set! (.-fillStyle ctx) "#2ecc71")
    (.fillRect ctx (- x 7) 11 14 9)
    ;; monitor stand
    (set! (.-fillStyle ctx) "#333")
    (.fillRect ctx (- x 2) 21 4 3))
  ;; CBP eagle emblem placeholder (small shield)
  (set! (.-fillStyle ctx) (if open "#d4af37" "#666"))
  (.beginPath ctx)
  (.moveTo ctx x 26)
  (.lineTo ctx (- x 6) 30)
  (.lineTo ctx (- x 4) 37)
  (.lineTo ctx x 40)
  (.lineTo ctx (+ x 4) 37)
  (.lineTo ctx (+ x 6) 30)
  (.closePath ctx)
  (.fill ctx)
  ;; text
  (set! (.-fillStyle ctx) "#fff")
  (set! (.-font ctx) "bold 7px monospace")
  (set! (.-textAlign ctx) "center")
  (.fillText ctx (if open "CBP" "CLOSED") x 35)
  ;; lane number on desk
  (set! (.-fillStyle ctx) "#aaa")
  (set! (.-font ctx) "6px monospace")
  (.fillText ctx (str lane-num) x 50)
  ;; status light
  (set! (.-fillStyle ctx) (if open "#2ecc71" "#e74c3c"))
  (.beginPath ctx)
  (.arc ctx (+ x 18) 8 3 0 (* 2 js/Math.PI))
  (.fill ctx)
  ;; light glow
  (set! (.-fillStyle ctx) (if open "rgba(46,204,113,0.2)" "rgba(231,76,60,0.2)"))
  (.beginPath ctx)
  (.arc ctx (+ x 18) 8 6 0 (* 2 js/Math.PI))
  (.fill ctx)
  (.restore ctx))

;; Overhead fluorescent lights
(defn draw-ceiling-lights [ctx ticks]
  (doseq [lx (range 30 canvas-w 80)]
    (let [flicker (if (and (zero? (mod (+ ticks lx) 400))
                           (< (js/Math.random) 0.3))
                    0.3 0.9)]
      ;; light fixture
      (set! (.-fillStyle ctx) "#ccc")
      (.fillRect ctx (- lx 18) 0 36 3)
      ;; light glow
      (set! (.-fillStyle ctx) (str "rgba(255,255,230," flicker ")"))
      (.fillRect ctx (- lx 16) 0 32 2)
      ;; glow cone on floor
      (set! (.-fillStyle ctx) (str "rgba(255,255,220," (* flicker 0.04) ")"))
      (.beginPath ctx)
      (.moveTo ctx (- lx 10) 3)
      (.lineTo ctx (- lx 30) queue-top)
      (.lineTo ctx (+ lx 30) queue-top)
      (.lineTo ctx (+ lx 10) 3)
      (.closePath ctx)
      (.fill ctx))))

;; Floor direction arrows
(defn draw-floor-arrows [ctx]
  (set! (.-fillStyle ctx) "rgba(0,0,0,0.06)")
  (doseq [lane (range num-lanes)]
    (let [x (lane-x lane)]
      (doseq [ay (range (+ queue-top 80) queue-bottom 100)]
        ;; up arrow
        (.beginPath ctx)
        (.moveTo ctx x (- ay 6))
        (.lineTo ctx (- x 5) (+ ay 2))
        (.lineTo ctx (- x 2) (+ ay 2))
        (.lineTo ctx (- x 2) (+ ay 6))
        (.lineTo ctx (+ x 2) (+ ay 6))
        (.lineTo ctx (+ x 2) (+ ay 2))
        (.lineTo ctx (+ x 5) (+ ay 2))
        (.closePath ctx)
        (.fill ctx)))))

;; Security cameras
(defn draw-cameras [ctx ticks]
  (let [cam-positions [[15 4] [(- canvas-w 20) 4]]]
    (doseq [[cx cy] cam-positions]
      ;; mount
      (set! (.-fillStyle ctx) "#444")
      (.fillRect ctx (- cx 2) cy 4 8)
      ;; camera body
      (set! (.-fillStyle ctx) "#222")
      (.beginPath ctx)
      (.arc ctx cx (+ cy 10) 5 0 (* 2 js/Math.PI))
      (.fill ctx)
      ;; lens
      (set! (.-fillStyle ctx) "#0af")
      (.beginPath ctx)
      (.arc ctx cx (+ cy 12) 2 0 (* 2 js/Math.PI))
      (.fill ctx)
      ;; recording indicator (blinks)
      (when (< (mod ticks 60) 30)
        (set! (.-fillStyle ctx) "#e74c3c")
        (.beginPath ctx)
        (.arc ctx (+ cx 3) (+ cy 7) 1.5 0 (* 2 js/Math.PI))
        (.fill ctx)))))

;; Flight info display board
(defn draw-flight-board [ctx ticks]
  (let [bx 60 by 0 bw 120 bh 55]
    ;; frame
    (set! (.-fillStyle ctx) "#1a1a2e")
    (.fillRect ctx bx by bw bh)
    (set! (.-strokeStyle ctx) "#333")
    (set! (.-lineWidth ctx) 1)
    (.strokeRect ctx bx by bw bh)
    ;; header
    (set! (.-fillStyle ctx) "#e74c3c")
    (.fillRect ctx (+ bx 2) (+ by 2) (- bw 4) 10)
    (set! (.-fillStyle ctx) "#fff")
    (set! (.-font ctx) "bold 7px monospace")
    (set! (.-textAlign ctx) "center")
    (.fillText ctx "DEPARTURES" (+ bx (/ bw 2)) (+ by 10))
    ;; flight rows
    (let [flights [["AA 1247" "CHICAGO" "BOARDING"]
                   ["DL 582"  "ATLANTA" "DELAYED"]
                   ["UA 903"  "DENVER"  "ON TIME"]
                   ["B6 211"  "BOSTON"   "FINAL CALL"]]]
      (set! (.-font ctx) "5px monospace")
      (set! (.-textAlign ctx) "left")
      (doseq [[i [flight dest status]] (map-indexed vector flights)]
        (let [ry (+ by 18 (* i 9))]
          (set! (.-fillStyle ctx) "#0f0")
          (.fillText ctx flight (+ bx 4) ry)
          (set! (.-fillStyle ctx) "#0f0")
          (.fillText ctx dest (+ bx 42) ry)
          (set! (.-fillStyle ctx)
                (cond (= status "DELAYED") "#f33"
                      (= status "FINAL CALL") "#ff0"
                      :else "#0f0"))
          ;; flicker the "DELAYED" text
          (when-not (and (= status "DELAYED") (< (mod ticks 40) 10))
            (.fillText ctx status (+ bx 82) ry)))))))

;; "WELCOME TO THE UNITED STATES" sign
(defn draw-welcome-sign [ctx]
  (let [sx 200 sy 0 sw 140 sh 55]
    ;; background
    (set! (.-fillStyle ctx) "#001a4d")
    (.fillRect ctx sx sy sw sh)
    (set! (.-strokeStyle ctx) "#d4af37")
    (set! (.-lineWidth ctx) 1.5)
    (.strokeRect ctx (+ sx 2) (+ sy 2) (- sw 4) (- sh 4))
    ;; stars
    (set! (.-fillStyle ctx) "#d4af37")
    (doseq [i (range 5)]
      (let [stx (+ sx 10 (* i 26))]
        (.beginPath ctx)
        (.arc ctx stx (+ sy 10) 2 0 (* 2 js/Math.PI))
        (.fill ctx)))
    ;; text
    (set! (.-fillStyle ctx) "#fff")
    (set! (.-font ctx) "bold 6px monospace")
    (set! (.-textAlign ctx) "center")
    (.fillText ctx "WELCOME TO THE" (+ sx (/ sw 2)) (+ sy 24))
    (set! (.-font ctx) "bold 8px monospace")
    (.fillText ctx "UNITED STATES" (+ sx (/ sw 2)) (+ sy 34))
    (set! (.-font ctx) "5px monospace")
    (set! (.-fillStyle ctx) "#aaa")
    (.fillText ctx "U.S. Customs & Border Protection" (+ sx (/ sw 2)) (+ sy 46))))


(defn render [st]
  (let [ctx (get-ctx)
        ticks (:ticks st)]
    ;; bg
    (set! (.-fillStyle ctx) "#e8e4df")
    (.fillRect ctx 0 0 canvas-w canvas-h)

    ;; Checkered floor tiles
    (draw-floor ctx)

    ;; Floor direction arrows (subtle)
    (draw-floor-arrows ctx)

    ;; Rope barriers with stanchions
    (draw-ropes ctx)

    ;; Express lane divider (green rope)
    (set! (.-strokeStyle ctx) "#27ae60")
    (set! (.-lineWidth ctx) 2.5)
    (let [ex (* num-lanes lane-w)]
      (.beginPath ctx)
      (.setLineDash ctx #js [6 3])
      (.moveTo ctx ex queue-top)
      (.lineTo ctx ex queue-bottom)
      (.stroke ctx)
      (.setLineDash ctx #js []))
    ;; green stanchions
    (set! (.-fillStyle ctx) "#27ae60")
    (doseq [yy (range queue-top queue-bottom 40)]
      (.beginPath ctx)
      (.arc ctx (* num-lanes lane-w) yy 3 0 (* 2 js/Math.PI))
      (.fill ctx))

    ;; Ceiling area (dark strip at top)
    (set! (.-fillStyle ctx) "#2c2c2c")
    (.fillRect ctx 0 0 canvas-w 56)

    ;; Ceiling lights
    (draw-ceiling-lights ctx ticks)

    ;; Flight info display
    (draw-flight-board ctx ticks)

    ;; Welcome sign
    (draw-welcome-sign ctx)

    ;; Security cameras
    (draw-cameras ctx ticks)

    ;; Booths (detailed)
    (doseq [b (:booths st)]
      (draw-booth ctx (lane-x (:lane b)) (:open b) (inc (:lane b))))

    ;; Express lane booth (always open)
    (let [ex (express-lane-x)]
      (.save ctx)
      (set! (.-fillStyle ctx) "#0d4d2b")
      (.fillRect ctx (- ex 25) 4 50 48)
      (set! (.-fillStyle ctx) "#1a7a42")
      (.fillRect ctx (- ex 23) 42 46 10)
      ;; glass
      (set! (.-strokeStyle ctx) "rgba(180,220,255,0.4)")
      (set! (.-lineWidth ctx) 1.5)
      (.beginPath ctx)
      (.moveTo ctx (- ex 20) 8)
      (.lineTo ctx (- ex 20) 40)
      (.stroke ctx)
      (.beginPath ctx)
      (.moveTo ctx (+ ex 20) 8)
      (.lineTo ctx (+ ex 20) 40)
      (.stroke ctx)
      ;; text
      (set! (.-fillStyle ctx) "#fff")
      (set! (.-font ctx) "bold 7px monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "GLOBAL" ex 30)
      (.fillText ctx "ENTRY" ex 39)
      ;; green status light
      (set! (.-fillStyle ctx) "#2ecc71")
      (.beginPath ctx)
      (.arc ctx (+ ex 18) 8 3 0 (* 2 js/Math.PI))
      (.fill ctx)
      (.restore ctx))

    ;; Lane labels
    (set! (.-textAlign ctx) "center")
    (doseq [i (range num-lanes)]
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.12)")
      (set! (.-font ctx) "bold 9px monospace")
      (.fillText ctx (str "LANE " (inc i)) (lane-x i) (+ queue-top 15)))
    (set! (.-fillStyle ctx) "rgba(39,174,96,0.25)")
    (set! (.-font ctx) "bold 8px monospace")
    (.fillText ctx "US/GLOBAL" (express-lane-x) (+ queue-top 11))
    (.fillText ctx "ENTRY" (express-lane-x) (+ queue-top 20))

    ;; Lane events (blocked lanes - red overlay with caution stripes)
    (doseq [ev (:lane-events st)]
      (when (> (:timer ev) 0)
        (let [x (lane-x (:lane ev))
              label (if (= (:type ev) "break") "BREAK" "JAMMED")
              lx (- x (/ lane-w 2))]
          ;; red overlay
          (set! (.-fillStyle ctx) "rgba(192,57,43,0.12)")
          (.fillRect ctx lx queue-top lane-w queue-length)
          ;; caution stripes at top and bottom
          (set! (.-fillStyle ctx) "rgba(241,196,15,0.5)")
          (doseq [sx (range lx (+ lx lane-w) 8)]
            (.save ctx)
            (.beginPath ctx)
            (.rect ctx lx queue-top lane-w 6)
            (.clip ctx)
            (.translate ctx sx queue-top)
            (.rotate ctx 0.7)
            (set! (.-fillStyle ctx) "rgba(241,196,15,0.6)")
            (.fillRect ctx 0 0 3 12)
            (.restore ctx))
          ;; label
          (set! (.-fillStyle ctx) "#c0392b")
          (set! (.-font ctx) "bold 10px monospace")
          (set! (.-textAlign ctx) "center")
          (.fillText ctx label x (+ queue-top (/ queue-length 2)))
          ;; blinking warning icon
          (when (< (mod ticks 40) 25)
            (set! (.-fillStyle ctx) "#e74c3c")
            (set! (.-font ctx) "14px sans-serif")
            (.fillText ctx "\u26A0" x (+ queue-top (/ queue-length 2) 18))))))

    ;; Other people in queues
    (doseq [p (:lane-people st)]
      (when (and (> (:y p) (+ queue-top 20)) (< (:y p) (+ queue-bottom 10)))
        (let [xoff (or (:xoff p) 0)
              px (+ (lane-x (:lane p)) xoff)]
          (draw-person ctx px (:y p) (or (:size p) 11) (or (:color p) "#95a5a6") (:acc p)))))

    ;; US citizens in express lane
    (doseq [c (:us-citizens st)]
      (when (and (> (:y c) (+ queue-top 10)) (< (:y c) queue-bottom))
        (let [xoff (* 6 (js/Math.sin (* (:y c) 0.3)))]
          (draw-person ctx (+ (express-lane-x) xoff) (:y c) 13 "#27ae60" 0))))

    ;; Player (you!) with extra detail
    (let [px (lane-x (:player-lane st))
          py (:player-y st)]
      ;; pulsing highlight ring
      (let [pulse (+ 14 (* 2 (js/Math.sin (* ticks 0.05))))]
        (set! (.-strokeStyle ctx) "rgba(41,128,185,0.3)")
        (set! (.-lineWidth ctx) 2)
        (.beginPath ctx)
        (.arc ctx px py pulse 0 (* 2 js/Math.PI))
        (.stroke ctx))
      ;; solid highlight
      (set! (.-fillStyle ctx) "rgba(41,128,185,0.12)")
      (.beginPath ctx)
      (.arc ctx px py 14 0 (* 2 js/Math.PI))
      (.fill ctx)
      ;; the player
      (draw-person ctx px py 16 "#2c5f8a" 2)
      ;; passport in left hand
      (set! (.-fillStyle ctx) "#1a3a5c")
      (.fillRect ctx (- px 12) (- py 1) 5 7)
      (set! (.-fillStyle ctx) "#d4af37")
      (set! (.-font ctx) "3px monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "\u2302" (- px 9.5) (+ py 4))
      ;; "YOU" arrow + label
      (set! (.-fillStyle ctx) "#e74c3c")
      (.beginPath ctx)
      (.moveTo ctx px (- py 22))
      (.lineTo ctx (- px 4) (- py 28))
      (.lineTo ctx (+ px 4) (- py 28))
      (.closePath ctx)
      (.fill ctx)
      ;; label bg
      (set! (.-fillStyle ctx) "#e74c3c")
      (let [tw 22 th 10 tx (- px (/ tw 2)) ty (- py 38)]
        (.beginPath ctx)
        (.moveTo ctx (+ tx 3) ty)
        (.lineTo ctx (+ tx tw -3) ty)
        (.quadraticCurveTo ctx (+ tx tw) ty (+ tx tw) (+ ty 3))
        (.lineTo ctx (+ tx tw) (+ ty th -3))
        (.quadraticCurveTo ctx (+ tx tw) (+ ty th) (+ tx tw -3) (+ ty th))
        (.lineTo ctx (+ tx 3) (+ ty th))
        (.quadraticCurveTo ctx tx (+ ty th) tx (+ ty th -3))
        (.lineTo ctx tx (+ ty 3))
        (.quadraticCurveTo ctx tx ty (+ tx 3) ty)
        (.fill ctx))
      (set! (.-fillStyle ctx) "#fff")
      (set! (.-font ctx) "bold 8px monospace")
      (set! (.-textAlign ctx) "center")
      (.fillText ctx "YOU" px (- py 30)))

    ;; Progress bar on right side (nicer)
    (let [progress (/ (- queue-bottom (:player-y st)) queue-length)
          bar-h 200
          bar-x (- canvas-w 15)
          bar-y (+ queue-top 50)]
      ;; track
      (set! (.-fillStyle ctx) "#ccc7be")
      (.beginPath ctx)
      (.moveTo ctx (+ bar-x 4) bar-y)
      (.arcTo ctx (+ bar-x 8) bar-y (+ bar-x 8) (+ bar-y 4) 4)
      (.lineTo ctx (+ bar-x 8) (+ bar-y bar-h -4))
      (.arcTo ctx (+ bar-x 8) (+ bar-y bar-h) (+ bar-x 4) (+ bar-y bar-h) 4)
      (.lineTo ctx (+ bar-x 4) (+ bar-y bar-h))
      (.arcTo ctx bar-x (+ bar-y bar-h) bar-x (+ bar-y bar-h -4) 4)
      (.lineTo ctx bar-x (+ bar-y 4))
      (.arcTo ctx bar-x bar-y (+ bar-x 4) bar-y 4)
      (.fill ctx)
      ;; fill
      (let [fill-h (* progress bar-h)
            fill-y (+ bar-y (- bar-h fill-h))]
        (set! (.-fillStyle ctx) "#2c5f8a")
        (.fillRect ctx bar-x fill-y 8 fill-h))
      ;; label
      (set! (.-fillStyle ctx) "#555")
      (set! (.-font ctx) "6px monospace")
      (set! (.-textAlign ctx) "center")
      (.save ctx)
      (.translate ctx (+ bar-x 4) (+ bar-y (/ bar-h 2)))
      (.rotate ctx (- (/ js/Math.PI 2)))
      (.fillText ctx "PROGRESS" 0 0)
      (.restore ctx))

    ;; Frustration bar at bottom (styled)
    (let [frust (:frustration st)
          bar-w (- canvas-w 40)
          bar-x 20
          bar-y (- canvas-h 22)]
      ;; track
      (set! (.-fillStyle ctx) "#d4cfc8")
      (.fillRect ctx bar-x bar-y bar-w 10)
      ;; fill with gradient feel
      (let [fill-w (* bar-w (/ frust 100))
            col (cond (< frust 40) "#f39c12"
                      (< frust 70) "#e67e22"
                      :else "#c0392b")]
        (set! (.-fillStyle ctx) col)
        (.fillRect ctx bar-x bar-y fill-w 10)
        ;; inner highlight
        (set! (.-fillStyle ctx) "rgba(255,255,255,0.15)")
        (.fillRect ctx bar-x bar-y fill-w 4))
      ;; outline
      (set! (.-strokeStyle ctx) "#bbb")
      (set! (.-lineWidth ctx) 0.5)
      (.strokeRect ctx bar-x bar-y bar-w 10)
      ;; label
      (set! (.-fillStyle ctx) "#2c3e50")
      (set! (.-font ctx) "bold 8px monospace")
      (set! (.-textAlign ctx) "left")
      (.fillText ctx "PATIENCE" (+ bar-x 2) (- bar-y 3))
      ;; percentage
      (set! (.-textAlign ctx) "right")
      (.fillText ctx (str (js/Math.floor frust) "%") (+ bar-x bar-w) (- bar-y 3)))

    ;; Commentary (rounded box)
    (when (:commentary st)
      (let [cx 5 cy (- canvas-h 48) cw (- canvas-w 10) ch 22]
        (set! (.-fillStyle ctx) "rgba(44,62,80,0.92)")
        (.beginPath ctx)
        (.moveTo ctx (+ cx 4) cy)
        (.lineTo ctx (+ cx cw -4) cy)
        (.quadraticCurveTo ctx (+ cx cw) cy (+ cx cw) (+ cy 4))
        (.lineTo ctx (+ cx cw) (+ cy ch -4))
        (.quadraticCurveTo ctx (+ cx cw) (+ cy ch) (+ cx cw -4) (+ cy ch))
        (.lineTo ctx (+ cx 4) (+ cy ch))
        (.quadraticCurveTo ctx cx (+ cy ch) cx (+ cy ch -4))
        (.lineTo ctx cx (+ cy 4))
        (.quadraticCurveTo ctx cx cy (+ cx 4) cy)
        (.fill ctx)
        (set! (.-fillStyle ctx) "#ecf0f1")
        (set! (.-font ctx) "10px 'Courier New',monospace")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx (:commentary st) (/ canvas-w 2) (- canvas-h 33))))

    ;; Game Over
    (when (:over st)
      ;; dark overlay with vignette
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.75)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      (let [rage (>= (:frustration st) 100)
            cx (/ canvas-w 2)
            cy (/ canvas-h 2)]
        ;; panel bg
        (set! (.-fillStyle ctx) "rgba(30,30,30,0.95)")
        (.fillRect ctx 40 (- cy 85) (- canvas-w 80) 185)
        (set! (.-strokeStyle ctx) (if rage "#e74c3c" "#27ae60"))
        (set! (.-lineWidth ctx) 2)
        (.strokeRect ctx 40 (- cy 85) (- canvas-w 80) 185)
        ;; title
        (set! (.-fillStyle ctx) (if rage "#e74c3c" "#27ae60"))
        (set! (.-font ctx) "bold 20px 'Courier New',monospace")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx (if rage "YOU SNAPPED" "YOU MADE IT?!") cx (- cy 55))
        ;; stats
        (set! (.-fillStyle ctx) "#ecf0f1")
        (set! (.-font ctx) "13px 'Courier New',monospace")
        (.fillText ctx (str "Time wasted: " (:score st) " min") cx (- cy 25))
        (.fillText ctx (str "Times redirected: " (:redirects st)) cx (- cy 5))
        (.fillText ctx (str "Times almost there: " (:times-near-front st)) cx (+ cy 15))
        (when (:commentary st)
          (set! (.-fillStyle ctx) "#f39c12")
          (set! (.-font ctx) "italic 10px 'Courier New',monospace")
          (.fillText ctx (:commentary st) cx (+ cy 45)))
        (set! (.-fillStyle ctx) "#bdc3c7")
        (set! (.-font ctx) "11px 'Courier New',monospace")
        (.fillText ctx "Tap or Space to try again" cx (+ cy 75))))

    ;; Paused
    (when (and (:paused st) (not (:over st)))
      (set! (.-fillStyle ctx) "rgba(0,0,0,0.55)")
      (.fillRect ctx 0 0 canvas-w canvas-h)
      ;; panel
      (let [cx (/ canvas-w 2) cy (/ canvas-h 2)]
        (set! (.-fillStyle ctx) "rgba(30,30,30,0.9)")
        (.fillRect ctx 60 (- cy 35) (- canvas-w 120) 70)
        (set! (.-strokeStyle ctx) "#f39c12")
        (set! (.-lineWidth ctx) 1)
        (.strokeRect ctx 60 (- cy 35) (- canvas-w 120) 70)
        (set! (.-fillStyle ctx) "#ecf0f1")
        (set! (.-font ctx) "bold 18px 'Courier New',monospace")
        (set! (.-textAlign ctx) "center")
        (.fillText ctx "PAUSED" cx (- cy 8))
        (set! (.-font ctx) "10px 'Courier New',monospace")
        (set! (.-fillStyle ctx) "#95a5a6")
        (.fillText ctx "(the line is also paused. as always.)" cx (+ cy 15))))))

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
        (swap! state assoc
               :player-lane target
               :player-y queue-bottom)))))

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
