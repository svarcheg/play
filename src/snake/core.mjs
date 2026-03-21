import * as squint_core from 'squint-cljs/core.js';
var cell_size = 20;
var grid_w = 20;
var grid_h = 30;
var canvas_w = (grid_w * cell_size);
var canvas_h = (grid_h * cell_size);
var tick_ms = 120;
var colors = ({"bg": "#1a1a2e", "grid": "#16213e", "head": "#00d2ff", "body": "#0099cc", "food": "#ff6b6b", "glow": "rgba(255,107,107,0.3)", "text": "#e0e0e0"});
var state = squint_core.atom(({"tid": null, "next-dir": [1, 0], "paused": false, "dir": [1, 0], "snake": [[10, 15], [9, 15], [8, 15]], "food": [15, 10], "score": 0, "over": false, "hi": 0}));
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
const collision12 = squint_core.some((function (_PERCENT_1) {
return vec_EQ_(new_head8, _PERCENT_1);

}), squint_core.rest(new_snake11));
const new_score13 = ((squint_core.truth_(ate10)) ? ((squint_core.get(st, "score") + 10)) : (squint_core.get(st, "score")));
if (squint_core.truth_(collision12)) {
return squint_core.assoc(st, "over", true, "hi", squint_core.max(squint_core.get(st, "hi"), squint_core.get(st, "score")))} else {
const s214 = squint_core.assoc(st, "snake", new_snake11, "dir", nd3, "score", new_score13, "hi", squint_core.max(squint_core.get(st, "hi"), new_score13));
if (squint_core.truth_(ate10)) {
return squint_core.assoc(s214, "food", place_food(new_snake11))} else {
return s214};
};
};

};
var reset_game = function (st) {
const snake1 = [[10, 15], [9, 15], [8, 15]];
return squint_core.assoc(st, "snake", snake1, "dir", [1, 0], "next-dir", [1, 0], "food", place_food(snake1), "score", 0, "over", false, "paused", false);

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
var render = function (st) {
const ctx1 = get_ctx();
const snake2 = squint_core.get(st, "snake");
const food3 = squint_core.get(st, "food");
const score4 = squint_core.get(st, "score");
const hi5 = squint_core.get(st, "hi");
const over6 = squint_core.get(st, "over");
const paused7 = squint_core.get(st, "paused");
ctx1.fillStyle = squint_core.get(colors, "bg");
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.strokeStyle = squint_core.get(colors, "grid");
ctx1.lineWidth = 0.5;
for (let G__8 of squint_core.iterable(squint_core.range(0, canvas_w, cell_size))) {
const x9 = G__8;
ctx1.beginPath();
ctx1.moveTo(x9, 0);
ctx1.lineTo(x9, canvas_h);
ctx1.stroke()
};
for (let G__10 of squint_core.iterable(squint_core.range(0, canvas_h, cell_size))) {
const y11 = G__10;
ctx1.beginPath();
ctx1.moveTo(0, y11);
ctx1.lineTo(canvas_w, y11);
ctx1.stroke()
};
const fx12 = squint_core.first(food3);
const fy13 = squint_core.second(food3);
const cx14 = ((fx12 * cell_size) + (cell_size / 2));
const cy15 = ((fy13 * cell_size) + (cell_size / 2));
ctx1.fillStyle = squint_core.get(colors, "glow");
ctx1.beginPath();
ctx1.arc(cx14, cy15, (cell_size * 0.8), 0, (2 * Math.PI));
ctx1.fill();
ctx1.fillStyle = squint_core.get(colors, "food");
ctx1.beginPath();
ctx1.arc(cx14, cy15, (cell_size * 0.4), 0, (2 * Math.PI));
ctx1.fill();
for (let G__16 of squint_core.iterable(squint_core.map_indexed(squint_core.vector, snake2))) {
const vec__1720 = G__16;
const i21 = squint_core.nth(vec__1720, 0, null);
const seg22 = squint_core.nth(vec__1720, 1, null);
const pad23 = 1;
const sx24 = squint_core.first(seg22);
const sy25 = squint_core.second(seg22);
const x26 = ((sx24 * cell_size) + pad23);
const y27 = ((sy25 * cell_size) + pad23);
const sz28 = (cell_size - (2 * pad23));
ctx1.fillStyle = (((i21 === 0)) ? (squint_core.get(colors, "head")) : (squint_core.get(colors, "body")));
draw_rounded(ctx1, x26, y27, sz28, sz28, 3)
};
if (squint_core.truth_(over6)) {
ctx1.fillStyle = "rgba(0,0,0,0.7)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.fillStyle = squint_core.get(colors, "food");
ctx1.font = "bold 28px 'Segoe UI',sans-serif";
ctx1.textAlign = "center";
ctx1.fillText("GAME OVER", (canvas_w / 2), ((canvas_h / 2) - 30));
ctx1.fillStyle = squint_core.get(colors, "text");
ctx1.font = "18px 'Segoe UI',sans-serif";
ctx1.fillText(`${"Score: "}${score4??''}`, (canvas_w / 2), (canvas_h / 2));
ctx1.fillText(`${"Best: "}${hi5??''}`, (canvas_w / 2), ((canvas_h / 2) + 28));
ctx1.font = "14px 'Segoe UI',sans-serif";
ctx1.fillText("Tap or Space to restart", (canvas_w / 2), ((canvas_h / 2) + 60))};
if (squint_core.truth_((() => {
const and__23554__auto__29 = paused7;
if (squint_core.truth_(and__23554__auto__29)) {
return squint_core.not(over6)} else {
return and__23554__auto__29};

})())) {
ctx1.fillStyle = "rgba(0,0,0,0.5)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.fillStyle = squint_core.get(colors, "text");
ctx1.font = "bold 24px 'Segoe UI',sans-serif";
ctx1.textAlign = "center";
return ctx1.fillText("PAUSED", (canvas_w / 2), (canvas_h / 2));
};

};
var update_display = function (st) {
const se1 = document.getElementById("score");
const he2 = document.getElementById("high-score");
if (squint_core.truth_(se1)) {
se1.textContent = squint_core.get(st, "score")};
if (squint_core.truth_(he2)) {
return he2.textContent = squint_core.get(st, "hi");
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
return squint_core.swap_BANG_(state, squint_core.assoc, "tid", setInterval(game_tick, tick_ms));

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
return squint_core.swap_BANG_(state, reset_game)} else {
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
squint_core.swap_BANG_(state, reset_game)} else {
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

export { canvas_h, reset_game, rand_pos, touch_st, start_loop, grid_w, place_food, tick_ms, game_tick, wrap, move_snake, opposite_QMARK_, get_canvas, handle_key, cell_size, get_ctx, draw_rounded, render, setup_dpad, state, init, grid_h, handle_te, update_display, canvas_w, resize, colors, handle_ts, vec_EQ_, set_dir }
