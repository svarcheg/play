import * as squint_core from 'squint-cljs/core.js';
var canvas_w = 400;
var canvas_h = 500;
var num_lanes = 5;
var lane_w = (canvas_w / (num_lanes + 1));
var player_size = 14;
var queue_top = 60;
var queue_bottom = 470;
var queue_length = (queue_bottom - queue_top);
var base_speed = 0.3;
var tick_ms = 33;
var commentary = ["You've been standing here for 47 minutes.", "The officer is having a lovely chat with someone's passport.", "3 booths open. Out of 52. Classic JFK.", "Someone ahead forgot which country they're from.", "Free WiFi expired. Of course.", "A child behind you has been screaming for 40 minutes.", "You start questioning all life decisions.", "The line moved! ...No wait, false alarm.", "You can feel your connecting flight leaving.", "You memorized every ceiling tile by now.", "The passport scanner jammed. Again.", "Officer shift change. Everyone wait 15 minutes.", "A pigeon got in. Most excitement all day.", "Someone is arguing about a visa stamp.", "You've aged visibly since landing.", "Your luggage is doing victory laps on the carousel.", "The guy next to you has been here since Tuesday.", "An officer points you to another lane. It's longer.", "\"Step this way please.\" It's never good news.", "You've been rerouted. The new lane hasn't moved in 20 min.", "Congratulations! You've been selected for the slow lane.", "A US citizen just breezed past you. Took 8 seconds.", "The express lane is moving at the speed of light.", "Global Entry passengers wave at you sympathetically."];
var redirect_lines = ["\"Sir/Ma'am, please step to lane %d.\"", "An officer escorts you to lane %d. It's worse.", "\"This lane is closing. Move to lane %d.\"", "You've been redirected to lane %d. There are 90 people ahead.", "\"Random security check. Please proceed to lane %d.\""];
var state = squint_core.atom(({"us-timer": 0, "tid": null, "redirects": 0, "paused": false, "us-citizens": [], "frustration": 0, "player-lane": 2, "redirect-timer": 0, "lane-speeds": [1, 0.8, 1.2, 0.6, 1], "lane-events": [], "player-y": queue_bottom, "score": 0, "lane-people": [], "ticks": 0, "target-lane": null, "commentary": null, "over": false, "booths": [], "commentary-timer": 0, "times-near-front": 0}));
var touch_st = squint_core.atom(null);
var lane_x = function (lane) {
return ((lane * lane_w) + (lane_w / 2));

};
var express_lane_x = function () {
return ((num_lanes * lane_w) + (lane_w / 2));

};
var rand_between = function (a, b) {
return (a + (Math.random() * (b - a)));

};
var rand_commentary = function () {
return squint_core.nth(commentary, Math.floor((Math.random() * squint_core.count(commentary))));

};
var rand_redirect_line = function (lane) {
const tmpl1 = squint_core.nth(redirect_lines, Math.floor((Math.random() * squint_core.count(redirect_lines))));
return tmpl1.replace("%d", `${(lane + 1)??''}`);

};
var init_lane_people = function () {
const people1 = squint_core.atom([]);
for (let G__2 of squint_core.iterable(squint_core.range(num_lanes))) {
const lane3 = G__2;
const n4 = (8 + Math.floor((Math.random() * 12)));
for (let G__5 of squint_core.iterable(squint_core.range(n4))) {
const i6 = G__5;
const y7 = (queue_bottom - (i6 * (18 + (Math.random() * 10))));
if ((y7 > (queue_top + 30))) {
squint_core.swap_BANG_(people1, squint_core.conj, ({"lane": lane3, "y": y7}))}
}
};
return squint_core.deref(people1);

};
var init_booths = function () {
return squint_core.vec(squint_core.map((function (i) {
return ({"lane": i, "open": (Math.random() < 0.5)});

}), squint_core.range(num_lanes)));

};
var move_forward = function (st) {
if (squint_core.truth_((() => {
const or__23522__auto__1 = squint_core.get(st, "over");
if (squint_core.truth_(or__23522__auto__1)) {
return or__23522__auto__1} else {
return squint_core.get(st, "paused")};

})())) {
return st} else {
const ticks2 = (squint_core.get(st, "ticks") + 1);
const lane3 = squint_core.get(st, "player-lane");
const speed4 = (base_speed * squint_core.nth(squint_core.get(st, "lane-speeds"), lane3));
const lane_blocked5 = squint_core.some((function (ev) {
return (squint_core._EQ_(squint_core.get(ev, "lane"), lane3) && (squint_core.get(ev, "timer") > 0));

}), squint_core.get(st, "lane-events"));
const effective_speed6 = ((squint_core.truth_(lane_blocked5)) ? (0) : (speed4));
const new_y7 = (squint_core.get(st, "player-y") - effective_speed6);
const booth8 = squint_core.nth(squint_core.get(st, "booths"), lane3);
const booth_closed9 = squint_core.not(squint_core.get(booth8, "open"));
const near_front10 = (new_y7 < (queue_top + 50));
const redirect_cooldown11 = squint_core.get(st, "redirect-timer");
const should_redirect12 = (near_front10 && ((redirect_cooldown11 < 1) && ((squint_core.get(st, "times-near-front") > 0) && (Math.random() < 0.7))));
const first_time_near13 = (near_front10 && (squint_core.get(st, "times-near-front") === 0));
const force_redirect14 = (() => {
const and__23554__auto__15 = first_time_near13;
if (squint_core.truth_(and__23554__auto__15)) {
return (redirect_cooldown11 < 1)} else {
return and__23554__auto__15};

})();
const do_redirect16 = (() => {
const or__23522__auto__17 = should_redirect12;
if (squint_core.truth_(or__23522__auto__17)) {
return or__23522__auto__17} else {
return force_redirect14};

})();
const other_lanes18 = squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return !squint_core._EQ_(_PERCENT_1, lane3);

}), squint_core.range(num_lanes)));
const redirect_lane19 = ((squint_core.truth_(do_redirect16)) ? (squint_core.nth(other_lanes18, Math.floor((Math.random() * squint_core.count(other_lanes18))))) : (null));
const add_minute20 = (squint_core.mod(ticks2, 90) === 0);
const new_score21 = ((add_minute20) ? ((squint_core.get(st, "score") + 1)) : (squint_core.get(st, "score")));
const new_frust22 = squint_core.min(100, (squint_core.get(st, "frustration") + ((squint_core.truth_(lane_blocked5)) ? (0.15) : (0.03)) + ((squint_core.truth_(do_redirect16)) ? (15) : (0))));
const ct23 = squint_core.get(st, "commentary-timer");
const show_comment24 = (squint_core.mod(ticks2, 150) === 0);
const new_comment25 = ((squint_core.truth_(do_redirect16)) ? (rand_redirect_line(redirect_lane19)) : (((show_comment24) ? (rand_commentary()) : ((("else") ? (squint_core.get(st, "commentary")) : (null))))));
const new_ct26 = ((squint_core.truth_((() => {
const or__23522__auto__27 = do_redirect16;
if (squint_core.truth_(or__23522__auto__27)) {
return or__23522__auto__27} else {
return show_comment24};

})())) ? (0) : ((ct23 + 1)));
const new_people28 = squint_core.vec(squint_core.map((function (p) {
const pspeed29 = (base_speed * squint_core.nth(squint_core.get(st, "lane-speeds"), squint_core.get(p, "lane")) * 0.7);
const blocked30 = squint_core.some((function (ev) {
return (squint_core._EQ_(squint_core.get(ev, "lane"), squint_core.get(p, "lane")) && (squint_core.get(ev, "timer") > 0));

}), squint_core.get(st, "lane-events"));
const ps31 = ((squint_core.truth_(blocked30)) ? (0) : (pspeed29));
return squint_core.update(p, "y", squint_core._, ps31);

}), squint_core.get(st, "lane-people")));
const ut32 = squint_core.get(st, "us-timer");
const spawn_us33 = (squint_core.mod(ticks2, 60) === 0);
const new_us34 = squint_core.vec(squint_core.filter((function (c) {
return (squint_core.get(c, "y") > (queue_top - 20));

}), squint_core.map((function (c) {
return squint_core.update(c, "y", squint_core._, squint_core.get(c, "speed"));

}), squint_core.get(st, "us-citizens"))));
const final_us35 = ((spawn_us33) ? (squint_core.conj(new_us34, ({"y": queue_bottom, "speed": (2 + (Math.random() * 2))}))) : (new_us34));
const new_events36 = squint_core.vec(squint_core.map((function (ev) {
return squint_core.update(ev, "timer", squint_core.dec);

}), squint_core.get(st, "lane-events")));
const spawn_event37 = ((squint_core.mod(ticks2, 200) === 0) && (Math.random() < 0.6));
const event_lane38 = Math.floor((Math.random() * num_lanes));
const final_events39 = ((squint_core.truth_(spawn_event37)) ? (squint_core.conj(squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return (squint_core.get(_PERCENT_1, "timer") > 0);

}), new_events36)), ({"lane": event_lane38, "type": (((Math.random() < 0.5)) ? ("break") : ("scanner")), "timer": 180}))) : (squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return (squint_core.get(_PERCENT_1, "timer") > 0);

}), new_events36))));
const new_speeds40 = (((squint_core.mod(ticks2, 300) === 0)) ? (squint_core.vec(squint_core.map((function (_) {
return (0.4 + (Math.random() * 1.2));

}), squint_core.range(num_lanes)))) : (squint_core.get(st, "lane-speeds")));
const new_booths41 = (((squint_core.mod(ticks2, 400) === 0)) ? (squint_core.vec(squint_core.map((function (b) {
if ((Math.random() < 0.3)) {
return squint_core.update(b, "open", squint_core.not)} else {
return b};

}), squint_core.get(st, "booths")))) : (squint_core.get(st, "booths")));
const reached_booth42 = ((new_y7 < (queue_top + 20)) && (squint_core.not(do_redirect16) && squint_core.get(booth8, "open")));
const rage_quit43 = (new_frust22 >= 100);
if (squint_core.truth_(do_redirect16)) {
return squint_core.assoc(st, "player-lane", redirect_lane19, "player-y", (queue_bottom - (Math.random() * 30)), "ticks", ticks2, "score", new_score21, "redirects", (squint_core.get(st, "redirects") + 1), "times-near-front", (squint_core.get(st, "times-near-front") + 1), "redirect-timer", 300, "frustration", new_frust22, "commentary", new_comment25, "commentary-timer", new_ct26, "lane-people", new_people28, "us-citizens", final_us35, "lane-events", final_events39, "lane-speeds", new_speeds40, "booths", new_booths41)} else {
if (squint_core.truth_((() => {
const or__23522__auto__44 = reached_booth42;
if (squint_core.truth_(or__23522__auto__44)) {
return or__23522__auto__44} else {
return rage_quit43};

})())) {
return squint_core.assoc(st, "over", true, "ticks", ticks2, "score", new_score21, "frustration", new_frust22, "commentary", ((rage_quit43) ? ("You snapped. Security is on their way.") : ("You... actually made it through?! Is this real?")))} else {
if ("else") {
return squint_core.assoc(st, "player-y", squint_core.max((queue_top + 15), new_y7), "ticks", ticks2, "score", new_score21, "frustration", new_frust22, "commentary", new_comment25, "commentary-timer", new_ct26, "redirect-timer", squint_core.max(0, (redirect_cooldown11 - 1)), "lane-people", new_people28, "us-citizens", final_us35, "lane-events", final_events39, "lane-speeds", new_speeds40, "booths", new_booths41)} else {
return null}}};
};

};
var reset_game = function (st) {
return squint_core.assoc(st, "player-lane", 2, "player-y", queue_bottom, "lane-speeds", [1, 0.8, 1.2, 0.6, 1], "lane-people", init_lane_people(), "us-citizens", [], "booths", init_booths(), "score", 0, "redirects", 0, "times-near-front", 0, "paused", false, "over", false, "ticks", 0, "commentary", "Welcome to JFK. You just landed. Good luck.", "commentary-timer", 0, "redirect-timer", 0, "lane-events", [], "us-timer", 0, "frustration", 0);

};
var get_canvas = function () {
return document.getElementById("game-canvas");

};
var get_ctx = function () {
return get_canvas().getContext("2d");

};
var draw_person = function (ctx, x, y, size, color) {
ctx.save();
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(x, (y - (size * 0.35)), (size * 0.22), 0, (2 * Math.PI));
ctx.fill();
ctx.strokeStyle = color;
ctx.lineWidth = (size * 0.13);
ctx.lineCap = "round";
ctx.beginPath();
ctx.moveTo(x, (y - (size * 0.12)));
ctx.lineTo(x, (y + (size * 0.15)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo((x - (size * 0.22)), (y - (size * 0.02)));
ctx.lineTo((x + (size * 0.22)), (y - (size * 0.02)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo(x, (y + (size * 0.15)));
ctx.lineTo((x - (size * 0.15)), (y + (size * 0.4)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo(x, (y + (size * 0.15)));
ctx.lineTo((x + (size * 0.15)), (y + (size * 0.4)));
ctx.stroke();
return ctx.restore();

};
var draw_suitcase = function (ctx, x, y) {
ctx.fillStyle = "#8b7355";
ctx.fillRect((x - 4), y, 8, 6);
ctx.strokeStyle = "#6b5335";
ctx.lineWidth = 0.5;
return ctx.strokeRect((x - 4), y, 8, 6);

};
var render = function (st) {
const ctx1 = get_ctx();
ctx1.fillStyle = "#e8e4df";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.strokeStyle = "#bbb5aa";
ctx1.lineWidth = 1;
for (let G__2 of squint_core.iterable(squint_core.range((num_lanes + 1)))) {
const i3 = G__2;
const x4 = (i3 * lane_w);
ctx1.beginPath();
ctx1.moveTo(x4, queue_top);
ctx1.lineTo(x4, queue_bottom);
ctx1.stroke()
};
ctx1.strokeStyle = "#27ae60";
ctx1.lineWidth = 2;
const ex5 = (num_lanes * lane_w);
ctx1.beginPath();
ctx1.moveTo(ex5, queue_top);
ctx1.lineTo(ex5, queue_bottom);
ctx1.stroke();
ctx1.fillStyle = "#8b7355";
for (let G__6 of squint_core.iterable(squint_core.range((num_lanes + 1)))) {
const i7 = G__6;
for (let G__8 of squint_core.iterable(squint_core.range(queue_top, queue_bottom, 40))) {
const yy9 = G__8;
const x10 = (i7 * lane_w);
ctx1.beginPath();
ctx1.arc(x10, yy9, 2.5, 0, (2 * Math.PI));
ctx1.fill()
}
};
ctx1.fillStyle = "#7f8c8d";
ctx1.font = "9px monospace";
ctx1.textAlign = "center";
for (let G__11 of squint_core.iterable(squint_core.range(num_lanes))) {
const i12 = G__11;
ctx1.fillText(`${"LANE "}${(i12 + 1)??''}`, lane_x(i12), (queue_top - 5))
};
ctx1.fillStyle = "#27ae60";
ctx1.fillText("EXPRESS", express_lane_x(), (queue_top - 5));
ctx1.fillStyle = "#27ae60";
ctx1.font = "7px monospace";
ctx1.fillText("US/GLOBAL ENTRY", express_lane_x(), (queue_top - 15));
ctx1.save();
ctx1.textAlign = "center";
for (let G__13 of squint_core.iterable(squint_core.get(st, "booths"))) {
const b14 = G__13;
const x15 = (lane_x(squint_core.get(b14, "lane")) - 22);
const open16 = squint_core.get(b14, "open");
ctx1.fillStyle = ((squint_core.truth_(open16)) ? ("#5d4e37") : ("#c0392b"));
ctx1.fillRect(x15, 10, 44, 35);
ctx1.fillStyle = "#fff";
ctx1.font = "bold 8px monospace";
ctx1.fillText(((squint_core.truth_(open16)) ? ("CBP") : ("CLOSED")), (x15 + 22), 25);
if (squint_core.truth_(open16)) {
ctx1.font = "7px monospace";
ctx1.fillText("OFFICER", (x15 + 22), 38)}
};
const ex17 = (express_lane_x() - 22);
ctx1.fillStyle = "#27ae60";
ctx1.fillRect(ex17, 10, 44, 35);
ctx1.fillStyle = "#fff";
ctx1.font = "bold 8px monospace";
ctx1.fillText("FAST", (ex17 + 22), 25);
ctx1.font = "7px monospace";
ctx1.fillText("TRACK", (ex17 + 22), 38);
ctx1.restore();
for (let G__18 of squint_core.iterable(squint_core.get(st, "lane-events"))) {
const ev19 = G__18;
if ((squint_core.get(ev19, "timer") > 0)) {
const x20 = lane_x(squint_core.get(ev19, "lane"));
const label21 = (((squint_core.get(ev19, "type") === "break")) ? ("BREAK") : ("JAMMED"));
ctx1.fillStyle = "rgba(192,57,43,0.15)";
ctx1.fillRect((x20 - (lane_w / 2)), queue_top, lane_w, queue_length);
ctx1.fillStyle = "#c0392b";
ctx1.font = "bold 9px monospace";
ctx1.textAlign = "center";
ctx1.fillText(label21, x20, (queue_top + (queue_length / 2)))}
};
for (let G__22 of squint_core.iterable(squint_core.get(st, "lane-people"))) {
const p23 = G__22;
if (squint_core.truth_(((squint_core.get(p23, "y") > (queue_top + 20)) && (squint_core.get(p23, "y") < queue_bottom)))) {
draw_person(ctx1, lane_x(squint_core.get(p23, "lane")), squint_core.get(p23, "y"), 12, "#95a5a6")}
};
for (let G__24 of squint_core.iterable(squint_core.get(st, "us-citizens"))) {
const c25 = G__24;
if (squint_core.truth_(((squint_core.get(c25, "y") > (queue_top + 10)) && (squint_core.get(c25, "y") < queue_bottom)))) {
draw_person(ctx1, express_lane_x(), squint_core.get(c25, "y"), 13, "#27ae60")}
};
const px26 = lane_x(squint_core.get(st, "player-lane"));
const py27 = squint_core.get(st, "player-y");
ctx1.fillStyle = "rgba(41,128,185,0.15)";
ctx1.beginPath();
ctx1.arc(px26, py27, 14, 0, (2 * Math.PI));
ctx1.fill();
draw_person(ctx1, px26, py27, 16, "#2c5f8a");
ctx1.fillStyle = "#2c5f8a";
ctx1.font = "bold 8px monospace";
ctx1.textAlign = "center";
ctx1.fillText("YOU", px26, (py27 - 14));
const progress28 = ((queue_bottom - squint_core.get(st, "player-y")) / queue_length);
const bar_h29 = 200;
const bar_x30 = (canvas_w - 15);
const bar_y31 = (queue_top + 50);
ctx1.fillStyle = "#ccc7be";
ctx1.fillRect(bar_x30, bar_y31, 8, bar_h29);
ctx1.fillStyle = "#2c5f8a";
ctx1.fillRect(bar_x30, (bar_y31 + (bar_h29 - (progress28 * bar_h29))), 8, (progress28 * bar_h29));
const frust32 = squint_core.get(st, "frustration");
const bar_w33 = (canvas_w - 40);
const bar_x34 = 20;
const bar_y35 = (canvas_h - 22);
ctx1.fillStyle = "#d4cfc8";
ctx1.fillRect(bar_x34, bar_y35, bar_w33, 10);
ctx1.fillStyle = (((frust32 < 40)) ? ("#f39c12") : ((((frust32 < 70)) ? ("#e67e22") : ((("else") ? ("#c0392b") : (null))))));
ctx1.fillRect(bar_x34, bar_y35, (bar_w33 * (frust32 / 100)), 10);
ctx1.fillStyle = "#2c3e50";
ctx1.font = "8px monospace";
ctx1.textAlign = "left";
ctx1.fillText("PATIENCE", (bar_x34 + 2), (bar_y35 - 3));
if (squint_core.truth_(squint_core.get(st, "commentary"))) {
ctx1.fillStyle = "rgba(44,62,80,0.9)";
ctx1.fillRect(5, (canvas_h - 48), (canvas_w - 10), 22);
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "10px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText(squint_core.get(st, "commentary"), (canvas_w / 2), (canvas_h - 33))};
if (squint_core.truth_(squint_core.get(st, "over"))) {
ctx1.fillStyle = "rgba(0,0,0,0.7)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
const rage36 = (squint_core.get(st, "frustration") >= 100);
ctx1.fillStyle = ((rage36) ? ("#e74c3c") : ("#27ae60"));
ctx1.font = "bold 20px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText(((rage36) ? ("YOU SNAPPED") : ("YOU MADE IT?!")), (canvas_w / 2), ((canvas_h / 2) - 60));
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "13px 'Courier New',monospace";
ctx1.fillText(`${"Time wasted: "}${squint_core.get(st, "score")??''}${" min"}`, (canvas_w / 2), ((canvas_h / 2) - 30));
ctx1.fillText(`${"Times redirected: "}${squint_core.get(st, "redirects")??''}`, (canvas_w / 2), ((canvas_h / 2) - 10));
ctx1.fillText(`${"Times almost there: "}${squint_core.get(st, "times-near-front")??''}`, (canvas_w / 2), ((canvas_h / 2) + 10));
if (squint_core.truth_(squint_core.get(st, "commentary"))) {
ctx1.fillStyle = "#f39c12";
ctx1.font = "italic 10px 'Courier New',monospace";
ctx1.fillText(squint_core.get(st, "commentary"), (canvas_w / 2), ((canvas_h / 2) + 40))};
ctx1.fillStyle = "#bdc3c7";
ctx1.font = "11px 'Courier New',monospace";
ctx1.fillText("Tap or Space to try again", (canvas_w / 2), ((canvas_h / 2) + 70))};
if (squint_core.truth_((() => {
const and__23554__auto__37 = squint_core.get(st, "paused");
if (squint_core.truth_(and__23554__auto__37)) {
return squint_core.not(squint_core.get(st, "over"))} else {
return and__23554__auto__37};

})())) {
ctx1.fillStyle = "rgba(0,0,0,0.5)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "bold 18px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText("PAUSED", (canvas_w / 2), ((canvas_h / 2) - 10));
ctx1.font = "11px 'Courier New',monospace";
return ctx1.fillText("(the line is also paused. as always.)", (canvas_w / 2), ((canvas_h / 2) + 15));
};

};
var update_display = function (st) {
const se1 = document.getElementById("score");
const re2 = document.getElementById("redirects");
const fe3 = document.getElementById("frustration");
if (squint_core.truth_(se1)) {
se1.textContent = `${squint_core.get(st, "score")??''}${" min"}`};
if (squint_core.truth_(re2)) {
re2.textContent = squint_core.get(st, "redirects")};
if (squint_core.truth_(fe3)) {
return fe3.textContent = `${Math.floor(squint_core.get(st, "frustration"))??''}${"%"}`;
};

};
var game_tick = function () {
squint_core.swap_BANG_(state, move_forward);
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
var switch_lane = function (dir) {
if (squint_core.truth_((() => {
const or__23522__auto__1 = squint_core.get(squint_core.deref(state), "over");
if (squint_core.truth_(or__23522__auto__1)) {
return or__23522__auto__1} else {
return squint_core.get(squint_core.deref(state), "paused")};

})())) {
return null} else {
const current2 = squint_core.get(squint_core.deref(state), "player-lane");
const target3 = (current2 + dir);
if (squint_core.truth_(((target3 >= 0) && (target3 < num_lanes)))) {
return squint_core.swap_BANG_(state, squint_core.assoc, "player-lane", target3);
};
};

};
var handle_key = function (e) {
const k1 = e.key;
if (squint_core.truth_((() => {
const or__23522__auto__2 = (k1 === "ArrowLeft");
if (or__23522__auto__2) {
return or__23522__auto__2} else {
const or__23522__auto__3 = (k1 === "a");
if (or__23522__auto__3) {
return or__23522__auto__3} else {
return (k1 === "A")};
};

})())) {
e.preventDefault();
return switch_lane(-1);
} else {
if (squint_core.truth_((() => {
const or__23522__auto__4 = (k1 === "ArrowRight");
if (or__23522__auto__4) {
return or__23522__auto__4} else {
const or__23522__auto__5 = (k1 === "d");
if (or__23522__auto__5) {
return or__23522__auto__5} else {
return (k1 === "D")};
};

})())) {
e.preventDefault();
return switch_lane(1);
} else {
if ((k1 === " ")) {
e.preventDefault();
if (squint_core.truth_(squint_core.get(squint_core.deref(state), "over"))) {
squint_core.swap_BANG_(state, reset_game);
return start_loop();
} else {
return squint_core.swap_BANG_(state, squint_core.update, "paused", squint_core.not)};
} else {
return null}}};

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
if (squint_core.truth_(((ax6 < 20) && (ay7 < 20)))) {
if (squint_core.truth_(squint_core.get(squint_core.deref(state), "over"))) {
squint_core.swap_BANG_(state, reset_game);
start_loop()} else {
squint_core.swap_BANG_(state, squint_core.update, "paused", squint_core.not)}} else {
if ((ax6 > ay7)) {
switch_lane((((dx4 > 0)) ? (1) : (-1)))}}};
return squint_core.reset_BANG_(touch_st, null);

};
var setup_dpad = function () {
for (let G__1 of squint_core.iterable([["btn-left", -1], ["btn-right", 1]])) {
const vec__25 = G__1;
const id6 = squint_core.nth(vec__25, 0, null);
const dir7 = squint_core.nth(vec__25, 1, null);
const temp__23184__auto__8 = document.getElementById(id6);
if (squint_core.truth_(temp__23184__auto__8)) {
const btn9 = temp__23184__auto__8;
btn9.addEventListener("touchstart", (function (e) {
e.preventDefault();
return switch_lane(dir7);

}), ({"passive": false}));
btn9.addEventListener("mousedown", (function (e) {
e.preventDefault();
return switch_lane(dir7);

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

export { canvas_h, rand_redirect_line, move_forward, reset_game, rand_between, touch_st, draw_suitcase, lane_w, commentary, start_loop, init_lane_people, num_lanes, queue_length, express_lane_x, tick_ms, game_tick, base_speed, player_size, lane_x, get_canvas, handle_key, switch_lane, draw_person, get_ctx, queue_bottom, rand_commentary, render, init_booths, setup_dpad, state, redirect_lines, init, handle_te, update_display, canvas_w, resize, handle_ts, queue_top }
