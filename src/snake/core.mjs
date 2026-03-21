import * as squint_core from 'squint-cljs/core.js';
var cell_size = 20;
var grid_w = 20;
var grid_h = 25;
var canvas_w = (grid_w * cell_size);
var canvas_h = (grid_h * cell_size);
var initial_tick = 150;
var min_tick = 80;
var colors = ({"passport-glow": "rgba(192,57,43,0.25)", "text-light": "#7f8c8d", "booth": "#5d4e37", "grid": "#ccc7be", "queue-body": "#4a7fa8", "overlay": "rgba(0,0,0,0.65)", "booth-closed": "#c0392b", "score-color": "#c0392b", "passport": "#c0392b", "bg": "#e8e4df", "us-citizen": "#27ae60", "floor": "#d4cfc8", "text": "#2c3e50", "queue-head": "#2c5f8a"});
var commentary = ["Officer 3 is checking their phone again", "A family of 12 just cut in front of you", "Your gate closed 20 minutes ago", "The officer just went on a coffee break", "Someone forgot their documents. Again.", "You can see US citizens breezing through...", "Your luggage is doing laps on the carousel", "3 booths open out of 47. Classic JFK.", "The officer is having a lovely chat", "You've aged 2 years in this line", "A child behind you is screaming. Hour 3.", "Free WiFi expired. Of course it did.", "You start questioning all life decisions", "The line moved! No wait, false alarm.", "Someone is arguing about a visa stamp", "Officer shift change. Line paused 15 min.", "You memorized every ceiling tile by now", "The passport scanner broke. Naturally.", "You missed your connecting flight. Congrats!", "A pigeon got in. Most excitement all day."];
var state = squint_core.atom(({"us-timer": 0, "tid": null, "next-dir": [1, 0], "paused": false, "us-citizens": [], "dir": [1, 0], "snake": [[10, 12], [9, 12], [8, 12]], "booth-timer": 0, "food": [15, 8], "booth-closed": false, "score": 0, "ticks": 0, "commentary": null, "minutes": 0, "over": false, "commentary-timer": 0, "hi": 0, "tick-ms": initial_tick}));
var touch_st = squint_core.atom(null);
var rand_pos = function () {
return [Math.floor((Math.random() * grid_w)), Math.floor((Math.random() * grid_h))];

};
var vec_EQ_ = function (a, b) {
return (squint_core._EQ_(squint_core.first(a), squint_core.first(b)) && squint_core._EQ_(squint_core.second(a), squint_core.second(b)));

};
var place_food = function (snake) {
let pos1 = rand_pos();
let tries2 = 0;
while(true){
if (squint_core.truth_((() => {
const or__23522__auto__3 = (tries2 > 500);
if (or__23522__auto__3) {
return or__23522__auto__3} else {
return squint_core.not(squint_core.some((function (_PERCENT_1) {
return vec_EQ_(pos1, _PERCENT_1);

}), snake))};

})())) {
return pos1} else {
let G__4 = rand_pos();
let G__5 = (tries2 + 1);
pos1 = G__4;
tries2 = G__5;
continue;
};
;break;
}
;

};
var wrap = function (v) {
return [squint_core.mod(squint_core.first(v), grid_w), squint_core.mod(squint_core.second(v), grid_h)];

};
var rand_commentary = function () {
return squint_core.nth(commentary, Math.floor((Math.random() * squint_core.count(commentary))));

};
var spawn_us_citizen = function () {
const side1 = Math.floor((Math.random() * 2));
const y2 = Math.floor((Math.random() * grid_h));
if ((side1 === 0)) {
return ({"x": 0, "y": y2, "dx": 1})} else {
return ({"x": (grid_w - 1), "y": y2, "dx": -1})};

};
var move_us_citizens = function (citizens) {
return squint_core.vec(squint_core.filter((function (c) {
return ((squint_core.get(c, "x") >= -1) && (squint_core.get(c, "x") <= grid_w));

}), squint_core.map((function (c) {
return squint_core.update(c, "x", squint_core._PLUS_, squint_core.get(c, "dx"));

}), citizens)));

};
var move_snake = function (st) {
if (squint_core.truth_(squint_core.get(st, "over"))) {
return st} else {
const snake1 = squint_core.get(st, "snake");
const hd2 = squint_core.first(snake1);
const nd3 = squint_core.get(st, "next-dir");
const hx4 = squint_core.first(hd2);
const hy5 = squint_core.second(hd2);
const dx6 = squint_core.first(nd3);
const dy7 = squint_core.second(nd3);
const new_head8 = wrap([(hx4 + dx6), (hy5 + dy7)]);
const food9 = squint_core.get(st, "food");
const ate10 = vec_EQ_(new_head8, food9);
const new_snake11 = squint_core.into([new_head8], ((squint_core.truth_(ate10)) ? (snake1) : (squint_core.butlast(snake1))));
const self_collision12 = squint_core.some((function (_PERCENT_1) {
return vec_EQ_(new_head8, _PERCENT_1);

}), squint_core.rest(new_snake11));
const us_hit13 = squint_core.some((function (c) {
return (squint_core._EQ_(squint_core.first(new_head8), squint_core.get(c, "x")) && squint_core._EQ_(squint_core.second(new_head8), squint_core.get(c, "y")));

}), squint_core.get(st, "us-citizens"));
const collision14 = (() => {
const or__23522__auto__15 = self_collision12;
if (squint_core.truth_(or__23522__auto__15)) {
return or__23522__auto__15} else {
return us_hit13};

})();
const new_score16 = ((squint_core.truth_(ate10)) ? ((squint_core.get(st, "score") + 1)) : (squint_core.get(st, "score")));
const new_minutes17 = ((squint_core.truth_(ate10)) ? ((squint_core.get(st, "minutes") + (5 + Math.floor((Math.random() * 15))))) : (squint_core.get(st, "minutes")));
const ticks18 = (squint_core.get(st, "ticks") + 1);
const new_tick19 = squint_core.max(min_tick, (initial_tick - Math.floor((ticks18 / 3))));
const ct20 = squint_core.get(st, "commentary-timer");
const new_ct21 = (((squint_core.mod(ticks18, 40) === 0)) ? (0) : ((ct20 + 1)));
const new_comment22 = (((new_ct21 === 0)) ? (rand_commentary()) : (squint_core.get(st, "commentary")));
const ut23 = squint_core.get(st, "us-timer");
const new_us24 = move_us_citizens(squint_core.get(st, "us-citizens"));
const spawn_us25 = (squint_core.mod(ticks18, 12) === 0);
const final_us26 = ((spawn_us25) ? (squint_core.conj(new_us24, spawn_us_citizen())) : (new_us24));
const bt27 = squint_core.get(st, "booth-timer");
const booth_event28 = (squint_core.mod(ticks18, 80) === 0);
const new_booth29 = ((booth_event28) ? (squint_core.not(squint_core.get(st, "booth-closed"))) : (squint_core.get(st, "booth-closed")));
if (squint_core.truth_(collision14)) {
return squint_core.assoc(st, "over", true, "hi", squint_core.max(squint_core.get(st, "hi"), squint_core.get(st, "score")), "commentary", ((squint_core.truth_(us_hit13)) ? ("You got trampled by a US citizen in the express lane!") : ("The queue collapsed on itself. Just like your spirit.")))} else {
const s230 = squint_core.assoc(st, "snake", new_snake11, "dir", nd3, "score", new_score16, "minutes", new_minutes17, "hi", squint_core.max(squint_core.get(st, "hi"), new_score16), "ticks", ticks18, "tick-ms", new_tick19, "commentary", new_comment22, "commentary-timer", new_ct21, "us-citizens", final_us26, "us-timer", (ut23 + 1), "booth-closed", new_booth29, "booth-timer", (bt27 + 1));
if (squint_core.truth_(ate10)) {
return squint_core.assoc(s230, "food", place_food(new_snake11))} else {
return s230};
};
};

};
var reset_game = function (st) {
const snake1 = [[10, 12], [9, 12], [8, 12]];
return squint_core.assoc(st, "snake", snake1, "dir", [1, 0], "next-dir", [1, 0], "food", place_food(snake1), "score", 0, "minutes", 0, "over", false, "paused", false, "ticks", 0, "tick-ms", initial_tick, "commentary", "Welcome to JFK. Estimated wait: 2 hours. Actual wait: yes.", "commentary-timer", 0, "us-citizens", [], "us-timer", 0, "booth-closed", false, "booth-timer", 0);

};
var get_canvas = function () {
return document.getElementById("game-canvas");

};
var get_ctx = function () {
return get_canvas().getContext("2d");

};
var draw_rounded = function (ctx, x, y, w, h, r) {
ctx.beginPath();
ctx.moveTo((x + r), y);
ctx.lineTo((x + (w - r)), y);
ctx.quadraticCurveTo((x + w), y, (x + w), (y + r));
ctx.lineTo((x + w), (y + (h - r)));
ctx.quadraticCurveTo((x + w), (y + h), (x + (w - r)), (y + h));
ctx.lineTo((x + r), (y + h));
ctx.quadraticCurveTo(x, (y + h), x, (y + (h - r)));
ctx.lineTo(x, (y + r));
ctx.quadraticCurveTo(x, y, (x + r), y);
ctx.closePath();
return ctx.fill();

};
var draw_person = function (ctx, cx, cy, size, color) {
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(cx, (cy - (size * 0.3)), (size * 0.2), 0, (2 * Math.PI));
ctx.fill();
ctx.beginPath();
ctx.moveTo(cx, (cy - (size * 0.1)));
ctx.lineTo(cx, (cy + (size * 0.2)));
ctx.strokeStyle = color;
ctx.lineWidth = (size * 0.12);
ctx.stroke();
ctx.beginPath();
ctx.moveTo((cx - (size * 0.25)), cy);
ctx.lineTo((cx + (size * 0.25)), cy);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(cx, (cy + (size * 0.2)));
ctx.lineTo((cx - (size * 0.15)), (cy + (size * 0.45)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo(cx, (cy + (size * 0.2)));
ctx.lineTo((cx + (size * 0.15)), (cy + (size * 0.45)));
return ctx.stroke();

};
var draw_passport = function (ctx, cx, cy, size) {
ctx.fillStyle = squint_core.get(colors, "passport");
const w1 = (size * 0.7);
const h2 = (size * 0.9);
const x3 = (cx - (w1 / 2));
const y4 = (cy - (h2 / 2));
draw_rounded(ctx, x3, y4, w1, h2, 2);
ctx.strokeStyle = "#f1c40f";
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.arc(cx, cy, (size * 0.18), 0, (2 * Math.PI));
return ctx.stroke();

};
var draw_booth = function (ctx, x, y, w, h, closed) {
ctx.fillStyle = ((squint_core.truth_(closed)) ? (squint_core.get(colors, "booth-closed")) : (squint_core.get(colors, "booth")));
draw_rounded(ctx, x, y, w, h, 3);
ctx.fillStyle = "#fff";
ctx.font = "bold 9px monospace";
ctx.textAlign = "center";
return ctx.fillText(((squint_core.truth_(closed)) ? ("CLOSED") : ("OPEN")), (x + (w / 2)), (y + (h / 2) + 3));

};
var render = function (st) {
const ctx1 = get_ctx();
const snake2 = squint_core.get(st, "snake");
const food3 = squint_core.get(st, "food");
const score4 = squint_core.get(st, "score");
const hi5 = squint_core.get(st, "hi");
const minutes6 = squint_core.get(st, "minutes");
const over7 = squint_core.get(st, "over");
const paused8 = squint_core.get(st, "paused");
const commentary9 = squint_core.get(st, "commentary");
const us_citizens10 = squint_core.get(st, "us-citizens");
const booth_closed11 = squint_core.get(st, "booth-closed");
ctx1.fillStyle = squint_core.get(colors, "bg");
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.strokeStyle = squint_core.get(colors, "grid");
ctx1.lineWidth = 0.5;
for (let G__12 of squint_core.iterable(squint_core.range(0, canvas_w, cell_size))) {
const x13 = G__12;
ctx1.beginPath();
ctx1.moveTo(x13, 0);
ctx1.lineTo(x13, canvas_h);
ctx1.stroke()
};
for (let G__14 of squint_core.iterable(squint_core.range(0, canvas_h, cell_size))) {
const y15 = G__14;
ctx1.beginPath();
ctx1.moveTo(0, y15);
ctx1.lineTo(canvas_w, y15);
ctx1.stroke()
};
draw_booth(ctx1, ((canvas_w / 2) - 40), 5, 80, 22, booth_closed11);
ctx1.strokeStyle = "#8b7355";
ctx1.lineWidth = 1;
ctx1.setLineDash([4, 4]);
for (let G__16 of squint_core.iterable([60, 140, 260, 340])) {
const rx17 = G__16;
ctx1.beginPath();
ctx1.moveTo(rx17, 30);
ctx1.lineTo(rx17, (canvas_h - 20));
ctx1.stroke()
};
ctx1.setLineDash([]);
const fx18 = squint_core.first(food3);
const fy19 = squint_core.second(food3);
const cx20 = ((fx18 * cell_size) + (cell_size / 2));
const cy21 = ((fy19 * cell_size) + (cell_size / 2));
ctx1.fillStyle = squint_core.get(colors, "passport-glow");
ctx1.beginPath();
ctx1.arc(cx20, cy21, (cell_size * 0.8), 0, (2 * Math.PI));
ctx1.fill();
draw_passport(ctx1, cx20, cy21, cell_size);
for (let G__22 of squint_core.iterable(us_citizens10)) {
const c23 = G__22;
const cx24 = ((squint_core.get(c23, "x") * cell_size) + (cell_size / 2));
const cy25 = ((squint_core.get(c23, "y") * cell_size) + (cell_size / 2));
draw_person(ctx1, cx24, cy25, cell_size, squint_core.get(colors, "us-citizen"));
ctx1.fillStyle = "#27ae60";
ctx1.font = "8px sans-serif";
ctx1.textAlign = "center";
ctx1.fillText("US", cx24, (cy25 - (cell_size * 0.5)))
};
for (let G__26 of squint_core.iterable(squint_core.map_indexed(squint_core.vector, snake2))) {
const vec__2730 = G__26;
const i31 = squint_core.nth(vec__2730, 0, null);
const seg32 = squint_core.nth(vec__2730, 1, null);
const sx33 = squint_core.first(seg32);
const sy34 = squint_core.second(seg32);
const cx35 = ((sx33 * cell_size) + (cell_size / 2));
const cy36 = ((sy34 * cell_size) + (cell_size / 2));
const color37 = (((i31 === 0)) ? (squint_core.get(colors, "queue-head")) : (squint_core.get(colors, "queue-body")));
draw_person(ctx1, cx35, cy36, cell_size, color37);
if ((squint_core.mod(i31, 3) === 0)) {
ctx1.fillStyle = "#8b7355";
draw_rounded(ctx1, ((sx33 * cell_size) + 2), ((sy34 * cell_size) + 14), 6, 5, 1)}
};
if (squint_core.truth_(commentary9)) {
ctx1.fillStyle = "rgba(44,62,80,0.85)";
draw_rounded(ctx1, 5, (canvas_h - 28), (canvas_w - 10), 24, 4);
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "11px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText(commentary9, (canvas_w / 2), (canvas_h - 12))};
if (squint_core.truth_(over7)) {
ctx1.fillStyle = squint_core.get(colors, "overlay");
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.fillStyle = "#e74c3c";
ctx1.font = "bold 22px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText("FLIGHT DEPARTED", (canvas_w / 2), ((canvas_h / 2) - 50));
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "14px 'Courier New',monospace";
ctx1.fillText(`${"People in queue: "}${score4??''}`, (canvas_w / 2), ((canvas_h / 2) - 20));
ctx1.fillText(`${"Minutes wasted: "}${minutes6??''}`, (canvas_w / 2), ((canvas_h / 2) + 5));
ctx1.fillText(`${"Record queue: "}${hi5??''}`, (canvas_w / 2), ((canvas_h / 2) + 30));
if (squint_core.truth_(commentary9)) {
ctx1.fillStyle = "#f39c12";
ctx1.font = "italic 11px 'Courier New',monospace";
ctx1.fillText(commentary9, (canvas_w / 2), ((canvas_h / 2) + 58))};
ctx1.fillStyle = "#bdc3c7";
ctx1.font = "12px 'Courier New',monospace";
ctx1.fillText("Tap or Space to suffer again", (canvas_w / 2), ((canvas_h / 2) + 85))};
if (squint_core.truth_((() => {
const and__23554__auto__38 = paused8;
if (squint_core.truth_(and__23554__auto__38)) {
return squint_core.not(over7)} else {
return and__23554__auto__38};

})())) {
ctx1.fillStyle = squint_core.get(colors, "overlay");
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "bold 20px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText("PAUSED", (canvas_w / 2), ((canvas_h / 2) - 10));
ctx1.font = "12px 'Courier New',monospace";
return ctx1.fillText("(as if the line wasn't paused already)", (canvas_w / 2), ((canvas_h / 2) + 15));
};

};
var update_display = function (st) {
const se1 = document.getElementById("score");
const he2 = document.getElementById("high-score");
const me3 = document.getElementById("minutes");
if (squint_core.truth_(se1)) {
se1.textContent = squint_core.get(st, "score")};
if (squint_core.truth_(he2)) {
he2.textContent = squint_core.get(st, "hi")};
if (squint_core.truth_(me3)) {
return me3.textContent = squint_core.get(st, "minutes");
};

};
var game_tick = function () {
if (squint_core.truth_(squint_core.get(squint_core.deref(state), "paused"))) {
} else {
squint_core.swap_BANG_(state, move_snake)};
render(squint_core.deref(state));
return update_display(squint_core.deref(state));

};
var start_loop = function () {
const temp__23184__auto__1 = squint_core.get(squint_core.deref(state), "tid");
if (squint_core.truth_(temp__23184__auto__1)) {
const id2 = temp__23184__auto__1;
clearInterval(id2)};
return squint_core.swap_BANG_(state, squint_core.assoc, "tid", setInterval(game_tick, squint_core.get(squint_core.deref(state), "tick-ms")));

};
var opposite_QMARK_ = function (a, b) {
return (squint_core._EQ_(squint_core.first(a), (-squint_core.first(b))) && squint_core._EQ_(squint_core.second(a), (-squint_core.second(b))));

};
var set_dir = function (dir) {
if (squint_core.truth_(opposite_QMARK_(dir, squint_core.get(squint_core.deref(state), "dir")))) {
return null} else {
return squint_core.swap_BANG_(state, squint_core.assoc, "next-dir", dir);
};

};
var handle_key = function (e) {
const k1 = e.key;
if (squint_core.truth_((() => {
const or__23522__auto__2 = (k1 === "ArrowUp");
if (or__23522__auto__2) {
return or__23522__auto__2} else {
const or__23522__auto__3 = (k1 === "w");
if (or__23522__auto__3) {
return or__23522__auto__3} else {
return (k1 === "W")};
};

})())) {
e.preventDefault();
return set_dir([0, -1]);
} else {
if (squint_core.truth_((() => {
const or__23522__auto__4 = (k1 === "ArrowDown");
if (or__23522__auto__4) {
return or__23522__auto__4} else {
const or__23522__auto__5 = (k1 === "s");
if (or__23522__auto__5) {
return or__23522__auto__5} else {
return (k1 === "S")};
};

})())) {
e.preventDefault();
return set_dir([0, 1]);
} else {
if (squint_core.truth_((() => {
const or__23522__auto__6 = (k1 === "ArrowLeft");
if (or__23522__auto__6) {
return or__23522__auto__6} else {
const or__23522__auto__7 = (k1 === "a");
if (or__23522__auto__7) {
return or__23522__auto__7} else {
return (k1 === "A")};
};

})())) {
e.preventDefault();
return set_dir([-1, 0]);
} else {
if (squint_core.truth_((() => {
const or__23522__auto__8 = (k1 === "ArrowRight");
if (or__23522__auto__8) {
return or__23522__auto__8} else {
const or__23522__auto__9 = (k1 === "d");
if (or__23522__auto__9) {
return or__23522__auto__9} else {
return (k1 === "D")};
};

})())) {
e.preventDefault();
return set_dir([1, 0]);
} else {
if ((k1 === " ")) {
e.preventDefault();
if (squint_core.truth_(squint_core.get(squint_core.deref(state), "over"))) {
squint_core.swap_BANG_(state, reset_game);
return start_loop();
} else {
return squint_core.swap_BANG_(state, squint_core.update, "paused", squint_core.not)};
} else {
return null}}}}};

};
var handle_ts = function (e) {
e.preventDefault();
const t1 = e.changedTouches[0];
return squint_core.reset_BANG_(touch_st, ({"x": t1.clientX, "y": t1.clientY}));

};
var handle_te = function (e) {
e.preventDefault();
const temp__23184__auto__1 = squint_core.deref(touch_st);
if (squint_core.truth_(temp__23184__auto__1)) {
const ts2 = temp__23184__auto__1;
const t3 = e.changedTouches[0];
const dx4 = (t3.clientX - squint_core.get(ts2, "x"));
const dy5 = (t3.clientY - squint_core.get(ts2, "y"));
const ax6 = Math.abs(dx4);
const ay7 = Math.abs(dy5);
if (squint_core.truth_(((ax6 < 30) && (ay7 < 30)))) {
if (squint_core.truth_(squint_core.get(squint_core.deref(state), "over"))) {
squint_core.swap_BANG_(state, reset_game);
start_loop()} else {
squint_core.swap_BANG_(state, squint_core.update, "paused", squint_core.not)}} else {
if ((ax6 > ay7)) {
set_dir([(((dx4 > 0)) ? (1) : (-1)), 0])} else {
set_dir([0, (((dy5 > 0)) ? (1) : (-1))])}}};
return squint_core.reset_BANG_(touch_st, null);

};
var setup_dpad = function () {
for (let G__1 of squint_core.iterable([["btn-up", [0, -1]], ["btn-down", [0, 1]], ["btn-left", [-1, 0]], ["btn-right", [1, 0]]])) {
const vec__25 = G__1;
const id6 = squint_core.nth(vec__25, 0, null);
const dir7 = squint_core.nth(vec__25, 1, null);
const temp__23184__auto__8 = document.getElementById(id6);
if (squint_core.truth_(temp__23184__auto__8)) {
const btn9 = temp__23184__auto__8;
btn9.addEventListener("touchstart", (function (e) {
e.preventDefault();
return set_dir(dir7);

}), ({"passive": false}));
btn9.addEventListener("mousedown", (function (e) {
e.preventDefault();
return set_dir(dir7);

}))}
}
return null;

};
var resize = function () {
const canvas1 = get_canvas();
const container2 = document.getElementById("game-container");
const mw3 = container2.clientWidth;
const mh4 = container2.clientHeight;
const sx5 = (mw3 / canvas_w);
const sy6 = (mh4 / canvas_h);
const s7 = squint_core.min(sx5, sy6, 2);
canvas1.style.width = `${(canvas_w * s7)??''}px`;
return canvas1.style.height = `${(canvas_h * s7)??''}px`;

};
var init = function () {
const canvas1 = get_canvas();
canvas1.width = canvas_w;
canvas1.height = canvas_h;
document.addEventListener("keydown", handle_key);
canvas1.addEventListener("touchstart", handle_ts, ({"passive": false}));
canvas1.addEventListener("touchend", handle_te, ({"passive": false}));
setup_dpad();
window.addEventListener("resize", resize);
resize();
squint_core.swap_BANG_(state, reset_game);
return start_loop();

};
if ((document.readyState === "loading")) {
document.addEventListener("DOMContentLoaded", init)} else {
init()};

export { canvas_h, reset_game, rand_pos, touch_st, commentary, start_loop, grid_w, move_us_citizens, place_food, draw_passport, game_tick, wrap, move_snake, opposite_QMARK_, draw_booth, get_canvas, handle_key, cell_size, draw_person, min_tick, get_ctx, draw_rounded, rand_commentary, render, setup_dpad, state, init, grid_h, spawn_us_citizen, handle_te, update_display, canvas_w, initial_tick, resize, colors, handle_ts, vec_EQ_, set_dir }
