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
var person_colors = ["#95a5a6", "#7f8c8d", "#8e6e53", "#a0522d", "#6b7b8d", "#9b7cb8", "#5d8a6b", "#b07d62", "#708090", "#a0856e", "#6a5acd", "#8b6969", "#556b2f", "#4a708b", "#8b7765"];
var make_person = function (lane, y) {
return ({"lane": lane, "y": y, "xoff": ((Math.random() * 22) - 11), "size": (9 + Math.floor((Math.random() * 5))), "color": squint_core.nth(person_colors, Math.floor((Math.random() * squint_core.count(person_colors)))), "acc": Math.floor((Math.random() * 5))});

};
var init_lane_people = function () {
const people1 = squint_core.atom([]);
for (let G__2 of squint_core.iterable(squint_core.range(num_lanes))) {
const lane3 = G__2;
const n4 = (25 + Math.floor((Math.random() * 10)));
for (let G__5 of squint_core.iterable(squint_core.range(n4))) {
const i6 = G__5;
const y7 = (queue_bottom - (i6 * (10 + (Math.random() * 5))));
if ((y7 > queue_top)) {
squint_core.swap_BANG_(people1, squint_core.conj, make_person(lane3, y7))}
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
const booth5 = squint_core.nth(squint_core.get(st, "booths"), lane3);
const booth_closed6 = squint_core.not(squint_core.get(booth5, "open"));
const lane_blocked7 = (() => {
const or__23522__auto__8 = booth_closed6;
if (or__23522__auto__8) {
return or__23522__auto__8} else {
return squint_core.some((function (ev) {
return (squint_core._EQ_(squint_core.get(ev, "lane"), lane3) && (squint_core.get(ev, "timer") > 0));

}), squint_core.get(st, "lane-events"))};

})();
const effective_speed9 = ((squint_core.truth_(lane_blocked7)) ? (0) : (speed4));
const new_y10 = (squint_core.get(st, "player-y") - effective_speed9);
const near_front11 = (new_y10 < (queue_top + 50));
const over_2h12 = (squint_core.get(st, "score") >= 120);
const redirect_cooldown13 = squint_core.get(st, "redirect-timer");
const should_redirect14 = (near_front11 && (!over_2h12 && ((redirect_cooldown13 < 1) && ((squint_core.get(st, "times-near-front") > 0) && (Math.random() < 0.7)))));
const first_time_near15 = (near_front11 && (squint_core.get(st, "times-near-front") === 0));
const force_redirect16 = (() => {
const and__23554__auto__17 = first_time_near15;
if (squint_core.truth_(and__23554__auto__17)) {
return ((redirect_cooldown13 < 1) && !over_2h12)} else {
return and__23554__auto__17};

})();
const do_redirect18 = (() => {
const or__23522__auto__19 = should_redirect14;
if (squint_core.truth_(or__23522__auto__19)) {
return or__23522__auto__19} else {
return force_redirect16};

})();
const other_lanes20 = squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return !squint_core._EQ_(_PERCENT_1, lane3);

}), squint_core.range(num_lanes)));
const redirect_lane21 = ((squint_core.truth_(do_redirect18)) ? (squint_core.nth(other_lanes20, Math.floor((Math.random() * squint_core.count(other_lanes20))))) : (null));
const add_minute22 = (squint_core.mod(ticks2, 90) === 0);
const new_score23 = ((add_minute22) ? ((squint_core.get(st, "score") + 1)) : (squint_core.get(st, "score")));
const new_frust24 = squint_core.min(100, (squint_core.get(st, "frustration") + ((squint_core.truth_(lane_blocked7)) ? (0.02) : (0.007)) + ((squint_core.truth_(do_redirect18)) ? (3) : (0))));
const ct25 = squint_core.get(st, "commentary-timer");
const show_comment26 = (squint_core.mod(ticks2, 150) === 0);
const new_comment27 = ((squint_core.truth_(do_redirect18)) ? (rand_redirect_line(redirect_lane21)) : (((show_comment26) ? (rand_commentary()) : ((("else") ? (squint_core.get(st, "commentary")) : (null))))));
const new_ct28 = ((squint_core.truth_((() => {
const or__23522__auto__29 = do_redirect18;
if (squint_core.truth_(or__23522__auto__29)) {
return or__23522__auto__29} else {
return show_comment26};

})())) ? (0) : ((ct25 + 1)));
const moved_people30 = squint_core.vec(squint_core.map((function (p) {
const pbooth31 = squint_core.nth(squint_core.get(st, "booths"), squint_core.get(p, "lane"));
const pbooth_closed32 = squint_core.not(squint_core.get(pbooth31, "open"));
const pspeed33 = (base_speed * squint_core.nth(squint_core.get(st, "lane-speeds"), squint_core.get(p, "lane")) * 0.7);
const blocked34 = (() => {
const or__23522__auto__35 = pbooth_closed32;
if (or__23522__auto__35) {
return or__23522__auto__35} else {
return squint_core.some((function (ev) {
return (squint_core._EQ_(squint_core.get(ev, "lane"), squint_core.get(p, "lane")) && (squint_core.get(ev, "timer") > 0));

}), squint_core.get(st, "lane-events"))};

})();
const ps36 = ((squint_core.truth_(blocked34)) ? (0) : (pspeed33));
return squint_core.update(p, "y", squint_core._, ps36);

}), squint_core.get(st, "lane-people")));
const alive_people37 = squint_core.vec(squint_core.filter((function (p) {
return (squint_core.get(p, "y") > (queue_top + 10));

}), moved_people30));
const spawn_people38 = (squint_core.mod(ticks2, 8) === 0);
const new_people39 = ((spawn_people38) ? (squint_core.into(alive_people37, squint_core.apply(squint_core.concat, squint_core.lazy((function* () {
for (let G__40 of squint_core.iterable(squint_core.range(num_lanes))) {
const l41 = G__40;
const lane_ppl42 = squint_core.filter((function (_PERCENT_1) {
return squint_core._EQ_(squint_core.get(_PERCENT_1, "lane"), l41);

}), alive_people37);
const lane_count43 = squint_core.count(lane_ppl42);
const max_y44 = (((lane_count43 > 0)) ? (squint_core.apply(squint_core.max, squint_core.map("y", lane_ppl42))) : (queue_bottom));
if ((lane_count43 < 30)) {
yield squint_core.lazy((function* () {
for (let G__45 of squint_core.iterable(squint_core.range(squint_core.min(3, (30 - lane_count43))))) {
const j46 = G__45;
yield make_person(l41, (max_y44 + 10 + (j46 * (10 + rand_between(0, 4)))));
}
return null;

}));}
}
return null;

}))))) : (alive_people37));
const ut47 = squint_core.get(st, "us-timer");
const spawn_us48 = (squint_core.mod(ticks2, 60) === 0);
const new_us49 = squint_core.vec(squint_core.filter((function (c) {
return (squint_core.get(c, "y") > (queue_top - 20));

}), squint_core.map((function (c) {
return squint_core.update(c, "y", squint_core._, squint_core.get(c, "speed"));

}), squint_core.get(st, "us-citizens"))));
const final_us50 = ((spawn_us48) ? (squint_core.conj(new_us49, ({"y": queue_bottom, "speed": (2 + (Math.random() * 2))}))) : (new_us49));
const new_events51 = squint_core.vec(squint_core.map((function (ev) {
return squint_core.update(ev, "timer", squint_core.dec);

}), squint_core.get(st, "lane-events")));
const spawn_event52 = ((squint_core.mod(ticks2, 200) === 0) && (Math.random() < 0.6));
const event_lane53 = Math.floor((Math.random() * num_lanes));
const final_events54 = ((squint_core.truth_(spawn_event52)) ? (squint_core.conj(squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return (squint_core.get(_PERCENT_1, "timer") > 0);

}), new_events51)), ({"lane": event_lane53, "type": (((Math.random() < 0.5)) ? ("break") : ("scanner")), "timer": 180}))) : (squint_core.vec(squint_core.filter((function (_PERCENT_1) {
return (squint_core.get(_PERCENT_1, "timer") > 0);

}), new_events51))));
const new_speeds55 = (((squint_core.mod(ticks2, 300) === 0)) ? (squint_core.vec(squint_core.map((function (_) {
return (0.4 + (Math.random() * 1.2));

}), squint_core.range(num_lanes)))) : (squint_core.get(st, "lane-speeds")));
const new_booths56 = (((squint_core.mod(ticks2, 400) === 0)) ? (squint_core.vec(squint_core.map((function (b) {
if ((Math.random() < 0.3)) {
return squint_core.update(b, "open", squint_core.not)} else {
return b};

}), squint_core.get(st, "booths")))) : (squint_core.get(st, "booths")));
const reached_booth57 = ((new_y10 < (queue_top + 20)) && (squint_core.not(do_redirect18) && squint_core.get(booth5, "open")));
const rage_quit58 = (new_frust24 >= 100);
if (squint_core.truth_(do_redirect18)) {
return squint_core.assoc(st, "player-lane", redirect_lane21, "player-y", queue_bottom, "ticks", ticks2, "score", new_score23, "redirects", (squint_core.get(st, "redirects") + 1), "times-near-front", (squint_core.get(st, "times-near-front") + 1), "redirect-timer", 300, "frustration", new_frust24, "commentary", new_comment27, "commentary-timer", new_ct28, "lane-people", new_people39, "us-citizens", final_us50, "lane-events", final_events54, "lane-speeds", new_speeds55, "booths", new_booths56)} else {
if (squint_core.truth_((() => {
const or__23522__auto__59 = reached_booth57;
if (squint_core.truth_(or__23522__auto__59)) {
return or__23522__auto__59} else {
return rage_quit58};

})())) {
return squint_core.assoc(st, "over", true, "ticks", ticks2, "score", new_score23, "frustration", new_frust24, "commentary", ((rage_quit58) ? ("You snapped. Security is on their way.") : ("You... actually made it through?! Is this real?")))} else {
if ("else") {
return squint_core.assoc(st, "player-y", squint_core.max((queue_top + 15), new_y10), "ticks", ticks2, "score", new_score23, "frustration", new_frust24, "commentary", new_comment27, "commentary-timer", new_ct28, "redirect-timer", squint_core.max(0, (redirect_cooldown13 - 1)), "lane-people", new_people39, "us-citizens", final_us50, "lane-events", final_events54, "lane-speeds", new_speeds55, "booths", new_booths56)} else {
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
var draw_person = function (ctx, x, y, size, color, acc) {
ctx.save();
const head_r1 = (size * 0.25);
const head_y2 = (y - (size * 0.38));
const a3 = (() => {
const or__23522__auto__4 = acc;
if (squint_core.truth_(or__23522__auto__4)) {
return or__23522__auto__4} else {
return 0};

})();
ctx.fillStyle = "rgba(0,0,0,0.08)";
ctx.beginPath();
ctx.ellipse(x, (y + (size * 0.45)), (size * 0.25), (size * 0.08), 0, 0, (2 * Math.PI));
ctx.fill();
ctx.strokeStyle = (((color === "#2c5f8a")) ? ("#1a3d5c") : ("#555"));
ctx.lineWidth = (size * 0.12);
ctx.lineCap = "round";
ctx.beginPath();
ctx.moveTo(x, (y + (size * 0.12)));
ctx.lineTo((x - (size * 0.13)), (y + (size * 0.4)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo(x, (y + (size * 0.12)));
ctx.lineTo((x + (size * 0.13)), (y + (size * 0.4)));
ctx.stroke();
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo((x - (size * 0.2)), (y - (size * 0.15)));
ctx.lineTo((x + (size * 0.2)), (y - (size * 0.15)));
ctx.quadraticCurveTo((x + (size * 0.22)), (y + (size * 0.15)), x, (y + (size * 0.18)));
ctx.quadraticCurveTo((x - (size * 0.22)), (y + (size * 0.15)), (x - (size * 0.2)), (y - (size * 0.15)));
ctx.fill();
ctx.strokeStyle = color;
ctx.lineWidth = (size * 0.1);
ctx.beginPath();
ctx.moveTo((x - (size * 0.2)), (y - (size * 0.08)));
ctx.lineTo((x - (size * 0.32)), (y + (size * 0.08)));
ctx.stroke();
ctx.beginPath();
ctx.moveTo((x + (size * 0.2)), (y - (size * 0.08)));
ctx.lineTo((x + (size * 0.32)), (y + (size * 0.08)));
ctx.stroke();
ctx.strokeStyle = "#dbb896";
ctx.lineWidth = (size * 0.1);
ctx.beginPath();
ctx.moveTo(x, (y - (size * 0.15)));
ctx.lineTo(x, (y - (size * 0.25)));
ctx.stroke();
ctx.fillStyle = "#dbb896";
ctx.beginPath();
ctx.arc(x, head_y2, head_r1, 0, (2 * Math.PI));
ctx.fill();
ctx.fillStyle = (((a3 < 2)) ? ("#3d2b1f") : ((((a3 === 2)) ? ("#8b6914") : ((("else") ? ("#1a1a2e") : (null))))));
ctx.beginPath();
ctx.arc(x, (head_y2 - (head_r1 * 0.15)), head_r1, (Math.PI * 1), (Math.PI * 2));
ctx.fill();
ctx.fillStyle = "#222";
ctx.beginPath();
ctx.arc((x - (head_r1 * 0.4)), (head_y2 + (head_r1 * 0.1)), (head_r1 * 0.12), 0, (2 * Math.PI));
ctx.fill();
ctx.beginPath();
ctx.arc((x + (head_r1 * 0.4)), (head_y2 + (head_r1 * 0.1)), (head_r1 * 0.12), 0, (2 * Math.PI));
ctx.fill();
if ((a3 === 1)) {
ctx.fillStyle = "#2c3e50";
ctx.fillRect((x - (head_r1 * 1.4)), (head_y2 - (head_r1 * 1.1)), (head_r1 * 2.8), (head_r1 * 0.4));
ctx.fillRect((x - (head_r1 * 0.8)), (head_y2 - (head_r1 * 1.5)), (head_r1 * 1.6), (head_r1 * 0.6))} else {
if ((a3 === 2)) {
const sx5 = (x + (size * 0.3));
const sy6 = (y + (size * 0.05));
ctx.fillStyle = "#4a6fa5";
ctx.fillRect(sx5, (sy6 - 2), 7, 8);
ctx.strokeStyle = "#3a5a85";
ctx.lineWidth = 0.8;
ctx.strokeRect(sx5, (sy6 - 2), 7, 8);
ctx.strokeStyle = "#666";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo((sx5 + 3.5), (sy6 - 2));
ctx.lineTo((sx5 + 3.5), (sy6 - 9));
ctx.stroke();
ctx.fillStyle = "#333";
ctx.beginPath();
ctx.arc((sx5 + 1.5), (sy6 + 6.5), 1.2, 0, (2 * Math.PI));
ctx.fill();
ctx.beginPath();
ctx.arc((sx5 + 5.5), (sy6 + 6.5), 1.2, 0, (2 * Math.PI));
ctx.fill()} else {
if ((a3 === 3)) {
ctx.fillStyle = "#c0392b";
const bx7 = (x + (size * 0.06));
const by8 = (y - (size * 0.12));
const bw9 = (size * 0.22);
const bh10 = (size * 0.28);
ctx.beginPath();
ctx.moveTo(bx7, (by8 + (bh10 * 0.15)));
ctx.quadraticCurveTo(bx7, by8, (bx7 + (bw9 * 0.3)), by8);
ctx.lineTo((bx7 + (bw9 * 0.7)), by8);
ctx.quadraticCurveTo((bx7 + bw9), by8, (bx7 + bw9), (by8 + (bh10 * 0.15)));
ctx.lineTo((bx7 + bw9), (by8 + bh10));
ctx.lineTo(bx7, (by8 + bh10));
ctx.closePath();
ctx.fill();
ctx.fillStyle = "#a93226";
ctx.fillRect((bx7 + 2), (by8 + (bh10 * 0.5)), (bw9 - 4), (bh10 * 0.3))} else {
if ((a3 === 4)) {
ctx.fillStyle = "#222";
ctx.fillRect((x - (size * 0.38)), (y - (size * 0.02)), 4, 6);
ctx.fillStyle = "#55aaff";
ctx.fillRect((x - (size * 0.37)), (y - (size * 0.01)), 2.5, 4)} else {
}}}};
return ctx.restore();

};
var draw_floor = function (ctx) {
const tile_size1 = 20;
for (let G__2 of squint_core.iterable(squint_core.range(0, canvas_w, tile_size1))) {
const tx3 = G__2;
for (let G__4 of squint_core.iterable(squint_core.range(queue_top, queue_bottom, tile_size1))) {
const ty5 = G__4;
ctx.fillStyle = ((squint_core.truth_(squint_core.even_QMARK_((squint_core.quot(tx3, tile_size1) + squint_core.quot(ty5, tile_size1))))) ? ("#e8e4df") : ("#ddd8d2"));
ctx.fillRect(tx3, ty5, tile_size1, tile_size1)
}
}
return null;

};
var draw_ropes = function (ctx) {
for (let G__1 of squint_core.iterable(squint_core.range((num_lanes + 1)))) {
const i2 = G__1;
const x3 = (i2 * lane_w);
ctx.strokeStyle = "#c9a96e";
ctx.lineWidth = 1.5;
ctx.setLineDash([4, 3]);
ctx.beginPath();
ctx.moveTo(x3, queue_top);
ctx.lineTo(x3, queue_bottom);
ctx.stroke();
ctx.setLineDash([]);
ctx.fillStyle = "#b8963e";
for (let G__4 of squint_core.iterable(squint_core.range(queue_top, queue_bottom, 40))) {
const yy5 = G__4;
ctx.beginPath();
ctx.arc(x3, (yy5 + 2), 3.5, 0, (2 * Math.PI));
ctx.fill();
ctx.fillStyle = "#d4af37";
ctx.beginPath();
ctx.arc(x3, yy5, 2.5, 0, (2 * Math.PI));
ctx.fill();
ctx.fillStyle = "#b8963e"
}
}
return null;

};
var draw_booth = function (ctx, x, open, lane_num) {
ctx.save();
ctx.fillStyle = ((squint_core.truth_(open)) ? ("#3d3225") : ("#4a1a1a"));
ctx.fillRect((x - 25), 4, 50, 48);
ctx.fillStyle = ((squint_core.truth_(open)) ? ("#5d4e37") : ("#6b2020"));
ctx.fillRect((x - 23), 42, 46, 10);
ctx.strokeStyle = "rgba(180,220,255,0.4)";
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo((x - 20), 8);
ctx.lineTo((x - 20), 40);
ctx.stroke();
ctx.beginPath();
ctx.moveTo((x + 20), 8);
ctx.lineTo((x + 20), 40);
ctx.stroke();
if (squint_core.truth_(open)) {
ctx.fillStyle = "#111";
ctx.fillRect((x - 8), 10, 16, 11);
ctx.fillStyle = "#2ecc71";
ctx.fillRect((x - 7), 11, 14, 9);
ctx.fillStyle = "#333";
ctx.fillRect((x - 2), 21, 4, 3)};
ctx.fillStyle = ((squint_core.truth_(open)) ? ("#d4af37") : ("#666"));
ctx.beginPath();
ctx.moveTo(x, 26);
ctx.lineTo((x - 6), 30);
ctx.lineTo((x - 4), 37);
ctx.lineTo(x, 40);
ctx.lineTo((x + 4), 37);
ctx.lineTo((x + 6), 30);
ctx.closePath();
ctx.fill();
ctx.fillStyle = "#fff";
ctx.font = "bold 7px monospace";
ctx.textAlign = "center";
ctx.fillText(((squint_core.truth_(open)) ? ("CBP") : ("CLOSED")), x, 35);
ctx.fillStyle = "#aaa";
ctx.font = "6px monospace";
ctx.fillText(`${lane_num??''}`, x, 50);
ctx.fillStyle = ((squint_core.truth_(open)) ? ("#2ecc71") : ("#e74c3c"));
ctx.beginPath();
ctx.arc((x + 18), 8, 3, 0, (2 * Math.PI));
ctx.fill();
ctx.fillStyle = ((squint_core.truth_(open)) ? ("rgba(46,204,113,0.2)") : ("rgba(231,76,60,0.2)"));
ctx.beginPath();
ctx.arc((x + 18), 8, 6, 0, (2 * Math.PI));
ctx.fill();
return ctx.restore();

};
var draw_ceiling_lights = function (ctx, ticks) {
for (let G__1 of squint_core.iterable(squint_core.range(30, canvas_w, 80))) {
const lx2 = G__1;
const flicker3 = ((squint_core.truth_(((squint_core.mod((ticks + lx2), 400) === 0) && (Math.random() < 0.3)))) ? (0.3) : (0.9));
ctx.fillStyle = "#ccc";
ctx.fillRect((lx2 - 18), 0, 36, 3);
ctx.fillStyle = `${"rgba(255,255,230,"}${flicker3??''}${")"}`;
ctx.fillRect((lx2 - 16), 0, 32, 2);
ctx.fillStyle = `${"rgba(255,255,220,"}${(flicker3 * 0.04)??''}${")"}`;
ctx.beginPath();
ctx.moveTo((lx2 - 10), 3);
ctx.lineTo((lx2 - 30), queue_top);
ctx.lineTo((lx2 + 30), queue_top);
ctx.lineTo((lx2 + 10), 3);
ctx.closePath();
ctx.fill()
}
return null;

};
var draw_floor_arrows = function (ctx) {
ctx.fillStyle = "rgba(0,0,0,0.06)";
for (let G__1 of squint_core.iterable(squint_core.range(num_lanes))) {
const lane2 = G__1;
const x3 = lane_x(lane2);
for (let G__4 of squint_core.iterable(squint_core.range((queue_top + 80), queue_bottom, 100))) {
const ay5 = G__4;
ctx.beginPath();
ctx.moveTo(x3, (ay5 - 6));
ctx.lineTo((x3 - 5), (ay5 + 2));
ctx.lineTo((x3 - 2), (ay5 + 2));
ctx.lineTo((x3 - 2), (ay5 + 6));
ctx.lineTo((x3 + 2), (ay5 + 6));
ctx.lineTo((x3 + 2), (ay5 + 2));
ctx.lineTo((x3 + 5), (ay5 + 2));
ctx.closePath();
ctx.fill()
}
}
return null;

};
var draw_cameras = function (ctx, ticks) {
const cam_positions1 = [[15, 4], [(canvas_w - 20), 4]];
for (let G__2 of squint_core.iterable(cam_positions1)) {
const vec__36 = G__2;
const cx7 = squint_core.nth(vec__36, 0, null);
const cy8 = squint_core.nth(vec__36, 1, null);
ctx.fillStyle = "#444";
ctx.fillRect((cx7 - 2), cy8, 4, 8);
ctx.fillStyle = "#222";
ctx.beginPath();
ctx.arc(cx7, (cy8 + 10), 5, 0, (2 * Math.PI));
ctx.fill();
ctx.fillStyle = "#0af";
ctx.beginPath();
ctx.arc(cx7, (cy8 + 12), 2, 0, (2 * Math.PI));
ctx.fill();
if ((squint_core.mod(ticks, 60) < 30)) {
ctx.fillStyle = "#e74c3c";
ctx.beginPath();
ctx.arc((cx7 + 3), (cy8 + 7), 1.5, 0, (2 * Math.PI));
ctx.fill()}
}
return null;

};
var draw_flight_board = function (ctx, ticks) {
const bx1 = 60;
const by2 = 0;
const bw3 = 120;
const bh4 = 55;
ctx.fillStyle = "#1a1a2e";
ctx.fillRect(bx1, by2, bw3, bh4);
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.strokeRect(bx1, by2, bw3, bh4);
ctx.fillStyle = "#e74c3c";
ctx.fillRect((bx1 + 2), (by2 + 2), (bw3 - 4), 10);
ctx.fillStyle = "#fff";
ctx.font = "bold 7px monospace";
ctx.textAlign = "center";
ctx.fillText("DEPARTURES", (bx1 + (bw3 / 2)), (by2 + 10));
const flights5 = [["AA 1247", "CHICAGO", "BOARDING"], ["DL 582", "ATLANTA", "DELAYED"], ["UA 903", "DENVER", "ON TIME"], ["B6 211", "BOSTON", "FINAL CALL"]];
ctx.font = "5px monospace";
ctx.textAlign = "left";
for (let G__6 of squint_core.iterable(squint_core.map_indexed(squint_core.vector, flights5))) {
const vec__713 = G__6;
const i14 = squint_core.nth(vec__713, 0, null);
const vec__1015 = squint_core.nth(vec__713, 1, null);
const flight16 = squint_core.nth(vec__1015, 0, null);
const dest17 = squint_core.nth(vec__1015, 1, null);
const status18 = squint_core.nth(vec__1015, 2, null);
const ry19 = (by2 + 18 + (i14 * 9));
ctx.fillStyle = "#0f0";
ctx.fillText(flight16, (bx1 + 4), ry19);
ctx.fillStyle = "#0f0";
ctx.fillText(dest17, (bx1 + 42), ry19);
ctx.fillStyle = (((status18 === "DELAYED")) ? ("#f33") : ((((status18 === "FINAL CALL")) ? ("#ff0") : ((("else") ? ("#0f0") : (null))))));
if (squint_core.truth_(((status18 === "DELAYED") && (squint_core.mod(ticks, 40) < 10)))) {
} else {
ctx.fillText(status18, (bx1 + 82), ry19)}
}
return null;

};
var draw_welcome_sign = function (ctx) {
const sx1 = 200;
const sy2 = 0;
const sw3 = 140;
const sh4 = 55;
ctx.fillStyle = "#001a4d";
ctx.fillRect(sx1, sy2, sw3, sh4);
ctx.strokeStyle = "#d4af37";
ctx.lineWidth = 1.5;
ctx.strokeRect((sx1 + 2), (sy2 + 2), (sw3 - 4), (sh4 - 4));
ctx.fillStyle = "#d4af37";
for (let G__5 of squint_core.iterable(squint_core.range(5))) {
const i6 = G__5;
const stx7 = (sx1 + 10 + (i6 * 26));
ctx.beginPath();
ctx.arc(stx7, (sy2 + 10), 2, 0, (2 * Math.PI));
ctx.fill()
};
ctx.fillStyle = "#fff";
ctx.font = "bold 6px monospace";
ctx.textAlign = "center";
ctx.fillText("WELCOME TO THE", (sx1 + (sw3 / 2)), (sy2 + 24));
ctx.font = "bold 8px monospace";
ctx.fillText("UNITED STATES", (sx1 + (sw3 / 2)), (sy2 + 34));
ctx.font = "5px monospace";
ctx.fillStyle = "#aaa";
return ctx.fillText("U.S. Customs & Border Protection", (sx1 + (sw3 / 2)), (sy2 + 46));

};
var render = function (st) {
const ctx1 = get_ctx();
const ticks2 = squint_core.get(st, "ticks");
ctx1.fillStyle = "#e8e4df";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
draw_floor(ctx1);
draw_floor_arrows(ctx1);
draw_ropes(ctx1);
ctx1.strokeStyle = "#27ae60";
ctx1.lineWidth = 2.5;
const ex3 = (num_lanes * lane_w);
ctx1.beginPath();
ctx1.setLineDash([6, 3]);
ctx1.moveTo(ex3, queue_top);
ctx1.lineTo(ex3, queue_bottom);
ctx1.stroke();
ctx1.setLineDash([]);
ctx1.fillStyle = "#27ae60";
for (let G__4 of squint_core.iterable(squint_core.range(queue_top, queue_bottom, 40))) {
const yy5 = G__4;
ctx1.beginPath();
ctx1.arc((num_lanes * lane_w), yy5, 3, 0, (2 * Math.PI));
ctx1.fill()
};
ctx1.fillStyle = "#2c2c2c";
ctx1.fillRect(0, 0, canvas_w, 56);
draw_ceiling_lights(ctx1, ticks2);
draw_flight_board(ctx1, ticks2);
draw_welcome_sign(ctx1);
draw_cameras(ctx1, ticks2);
for (let G__6 of squint_core.iterable(squint_core.get(st, "booths"))) {
const b7 = G__6;
draw_booth(ctx1, lane_x(squint_core.get(b7, "lane")), squint_core.get(b7, "open"), (squint_core.get(b7, "lane") + 1))
};
const ex8 = express_lane_x();
ctx1.save();
ctx1.fillStyle = "#0d4d2b";
ctx1.fillRect((ex8 - 25), 4, 50, 48);
ctx1.fillStyle = "#1a7a42";
ctx1.fillRect((ex8 - 23), 42, 46, 10);
ctx1.strokeStyle = "rgba(180,220,255,0.4)";
ctx1.lineWidth = 1.5;
ctx1.beginPath();
ctx1.moveTo((ex8 - 20), 8);
ctx1.lineTo((ex8 - 20), 40);
ctx1.stroke();
ctx1.beginPath();
ctx1.moveTo((ex8 + 20), 8);
ctx1.lineTo((ex8 + 20), 40);
ctx1.stroke();
ctx1.fillStyle = "#fff";
ctx1.font = "bold 7px monospace";
ctx1.textAlign = "center";
ctx1.fillText("GLOBAL", ex8, 30);
ctx1.fillText("ENTRY", ex8, 39);
ctx1.fillStyle = "#2ecc71";
ctx1.beginPath();
ctx1.arc((ex8 + 18), 8, 3, 0, (2 * Math.PI));
ctx1.fill();
ctx1.restore();
ctx1.textAlign = "center";
for (let G__9 of squint_core.iterable(squint_core.range(num_lanes))) {
const i10 = G__9;
ctx1.fillStyle = "rgba(0,0,0,0.12)";
ctx1.font = "bold 9px monospace";
ctx1.fillText(`${"LANE "}${(i10 + 1)??''}`, lane_x(i10), (queue_top + 15))
};
ctx1.fillStyle = "rgba(39,174,96,0.25)";
ctx1.font = "bold 8px monospace";
ctx1.fillText("US/GLOBAL", express_lane_x(), (queue_top + 11));
ctx1.fillText("ENTRY", express_lane_x(), (queue_top + 20));
for (let G__11 of squint_core.iterable(squint_core.get(st, "lane-events"))) {
const ev12 = G__11;
if ((squint_core.get(ev12, "timer") > 0)) {
const x13 = lane_x(squint_core.get(ev12, "lane"));
const label14 = (((squint_core.get(ev12, "type") === "break")) ? ("BREAK") : ("JAMMED"));
const lx15 = (x13 - (lane_w / 2));
ctx1.fillStyle = "rgba(192,57,43,0.12)";
ctx1.fillRect(lx15, queue_top, lane_w, queue_length);
ctx1.fillStyle = "rgba(241,196,15,0.5)";
for (let G__16 of squint_core.iterable(squint_core.range(lx15, (lx15 + lane_w), 8))) {
const sx17 = G__16;
ctx1.save();
ctx1.beginPath();
ctx1.rect(lx15, queue_top, lane_w, 6);
ctx1.clip();
ctx1.translate(sx17, queue_top);
ctx1.rotate(0.7);
ctx1.fillStyle = "rgba(241,196,15,0.6)";
ctx1.fillRect(0, 0, 3, 12);
ctx1.restore()
};
ctx1.fillStyle = "#c0392b";
ctx1.font = "bold 10px monospace";
ctx1.textAlign = "center";
ctx1.fillText(label14, x13, (queue_top + (queue_length / 2)));
if ((squint_core.mod(ticks2, 40) < 25)) {
ctx1.fillStyle = "#e74c3c";
ctx1.font = "14px sans-serif";
ctx1.fillText("⚠", x13, (queue_top + (queue_length / 2) + 18))}}
};
for (let G__18 of squint_core.iterable(squint_core.get(st, "lane-people"))) {
const p19 = G__18;
if (squint_core.truth_(((squint_core.get(p19, "y") > (queue_top + 20)) && (squint_core.get(p19, "y") < (queue_bottom + 10))))) {
const xoff20 = (() => {
const or__23522__auto__21 = squint_core.get(p19, "xoff");
if (squint_core.truth_(or__23522__auto__21)) {
return or__23522__auto__21} else {
return 0};

})();
const px22 = (lane_x(squint_core.get(p19, "lane")) + xoff20);
draw_person(ctx1, px22, squint_core.get(p19, "y"), (() => {
const or__23522__auto__23 = squint_core.get(p19, "size");
if (squint_core.truth_(or__23522__auto__23)) {
return or__23522__auto__23} else {
return 11};

})(), (() => {
const or__23522__auto__24 = squint_core.get(p19, "color");
if (squint_core.truth_(or__23522__auto__24)) {
return or__23522__auto__24} else {
return "#95a5a6"};

})(), squint_core.get(p19, "acc"))}
};
for (let G__25 of squint_core.iterable(squint_core.get(st, "us-citizens"))) {
const c26 = G__25;
if (squint_core.truth_(((squint_core.get(c26, "y") > (queue_top + 10)) && (squint_core.get(c26, "y") < queue_bottom)))) {
const xoff27 = (6 * Math.sin((squint_core.get(c26, "y") * 0.3)));
draw_person(ctx1, (express_lane_x() + xoff27), squint_core.get(c26, "y"), 13, "#27ae60", 0)}
};
const px28 = lane_x(squint_core.get(st, "player-lane"));
const py29 = squint_core.get(st, "player-y");
const pulse30 = (14 + (2 * Math.sin((ticks2 * 0.05))));
ctx1.strokeStyle = "rgba(41,128,185,0.3)";
ctx1.lineWidth = 2;
ctx1.beginPath();
ctx1.arc(px28, py29, pulse30, 0, (2 * Math.PI));
ctx1.stroke();
ctx1.fillStyle = "rgba(41,128,185,0.12)";
ctx1.beginPath();
ctx1.arc(px28, py29, 14, 0, (2 * Math.PI));
ctx1.fill();
draw_person(ctx1, px28, py29, 16, "#2c5f8a", 2);
ctx1.fillStyle = "#1a3a5c";
ctx1.fillRect((px28 - 12), (py29 - 1), 5, 7);
ctx1.fillStyle = "#d4af37";
ctx1.font = "3px monospace";
ctx1.textAlign = "center";
ctx1.fillText("⌂", (px28 - 9.5), (py29 + 4));
ctx1.fillStyle = "#e74c3c";
ctx1.beginPath();
ctx1.moveTo(px28, (py29 - 22));
ctx1.lineTo((px28 - 4), (py29 - 28));
ctx1.lineTo((px28 + 4), (py29 - 28));
ctx1.closePath();
ctx1.fill();
ctx1.fillStyle = "#e74c3c";
const tw31 = 22;
const th32 = 10;
const tx33 = (px28 - (tw31 / 2));
const ty34 = (py29 - 38);
ctx1.beginPath();
ctx1.moveTo((tx33 + 3), ty34);
ctx1.lineTo((tx33 + tw31 + -3), ty34);
ctx1.quadraticCurveTo((tx33 + tw31), ty34, (tx33 + tw31), (ty34 + 3));
ctx1.lineTo((tx33 + tw31), (ty34 + th32 + -3));
ctx1.quadraticCurveTo((tx33 + tw31), (ty34 + th32), (tx33 + tw31 + -3), (ty34 + th32));
ctx1.lineTo((tx33 + 3), (ty34 + th32));
ctx1.quadraticCurveTo(tx33, (ty34 + th32), tx33, (ty34 + th32 + -3));
ctx1.lineTo(tx33, (ty34 + 3));
ctx1.quadraticCurveTo(tx33, ty34, (tx33 + 3), ty34);
ctx1.fill();
ctx1.fillStyle = "#fff";
ctx1.font = "bold 8px monospace";
ctx1.textAlign = "center";
ctx1.fillText("YOU", px28, (py29 - 30));
const progress35 = ((queue_bottom - squint_core.get(st, "player-y")) / queue_length);
const bar_h36 = 200;
const bar_x37 = (canvas_w - 15);
const bar_y38 = (queue_top + 50);
ctx1.fillStyle = "#ccc7be";
ctx1.beginPath();
ctx1.moveTo((bar_x37 + 4), bar_y38);
ctx1.arcTo((bar_x37 + 8), bar_y38, (bar_x37 + 8), (bar_y38 + 4), 4);
ctx1.lineTo((bar_x37 + 8), (bar_y38 + bar_h36 + -4));
ctx1.arcTo((bar_x37 + 8), (bar_y38 + bar_h36), (bar_x37 + 4), (bar_y38 + bar_h36), 4);
ctx1.lineTo((bar_x37 + 4), (bar_y38 + bar_h36));
ctx1.arcTo(bar_x37, (bar_y38 + bar_h36), bar_x37, (bar_y38 + bar_h36 + -4), 4);
ctx1.lineTo(bar_x37, (bar_y38 + 4));
ctx1.arcTo(bar_x37, bar_y38, (bar_x37 + 4), bar_y38, 4);
ctx1.fill();
const fill_h39 = (progress35 * bar_h36);
const fill_y40 = (bar_y38 + (bar_h36 - fill_h39));
ctx1.fillStyle = "#2c5f8a";
ctx1.fillRect(bar_x37, fill_y40, 8, fill_h39);
ctx1.fillStyle = "#555";
ctx1.font = "6px monospace";
ctx1.textAlign = "center";
ctx1.save();
ctx1.translate((bar_x37 + 4), (bar_y38 + (bar_h36 / 2)));
ctx1.rotate((-(Math.PI / 2)));
ctx1.fillText("PROGRESS", 0, 0);
ctx1.restore();
const frust41 = squint_core.get(st, "frustration");
const bar_w42 = (canvas_w - 40);
const bar_x43 = 20;
const bar_y44 = (canvas_h - 22);
ctx1.fillStyle = "#d4cfc8";
ctx1.fillRect(bar_x43, bar_y44, bar_w42, 10);
const fill_w45 = (bar_w42 * (frust41 / 100));
const col46 = (((frust41 < 40)) ? ("#f39c12") : ((((frust41 < 70)) ? ("#e67e22") : ((("else") ? ("#c0392b") : (null))))));
ctx1.fillStyle = col46;
ctx1.fillRect(bar_x43, bar_y44, fill_w45, 10);
ctx1.fillStyle = "rgba(255,255,255,0.15)";
ctx1.fillRect(bar_x43, bar_y44, fill_w45, 4);
ctx1.strokeStyle = "#bbb";
ctx1.lineWidth = 0.5;
ctx1.strokeRect(bar_x43, bar_y44, bar_w42, 10);
ctx1.fillStyle = "#2c3e50";
ctx1.font = "bold 8px monospace";
ctx1.textAlign = "left";
ctx1.fillText("PATIENCE", (bar_x43 + 2), (bar_y44 - 3));
ctx1.textAlign = "right";
ctx1.fillText(`${Math.floor(frust41)??''}${"%"}`, (bar_x43 + bar_w42), (bar_y44 - 3));
if (squint_core.truth_(squint_core.get(st, "commentary"))) {
const cx47 = 5;
const cy48 = (canvas_h - 48);
const cw49 = (canvas_w - 10);
const ch50 = 22;
ctx1.fillStyle = "rgba(44,62,80,0.92)";
ctx1.beginPath();
ctx1.moveTo((cx47 + 4), cy48);
ctx1.lineTo((cx47 + cw49 + -4), cy48);
ctx1.quadraticCurveTo((cx47 + cw49), cy48, (cx47 + cw49), (cy48 + 4));
ctx1.lineTo((cx47 + cw49), (cy48 + ch50 + -4));
ctx1.quadraticCurveTo((cx47 + cw49), (cy48 + ch50), (cx47 + cw49 + -4), (cy48 + ch50));
ctx1.lineTo((cx47 + 4), (cy48 + ch50));
ctx1.quadraticCurveTo(cx47, (cy48 + ch50), cx47, (cy48 + ch50 + -4));
ctx1.lineTo(cx47, (cy48 + 4));
ctx1.quadraticCurveTo(cx47, cy48, (cx47 + 4), cy48);
ctx1.fill();
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "10px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText(squint_core.get(st, "commentary"), (canvas_w / 2), (canvas_h - 33))};
if (squint_core.truth_(squint_core.get(st, "over"))) {
ctx1.fillStyle = "rgba(0,0,0,0.75)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
const rage51 = (squint_core.get(st, "frustration") >= 100);
const cx52 = (canvas_w / 2);
const cy53 = (canvas_h / 2);
ctx1.fillStyle = "rgba(30,30,30,0.95)";
ctx1.fillRect(40, (cy53 - 85), (canvas_w - 80), 185);
ctx1.strokeStyle = ((rage51) ? ("#e74c3c") : ("#27ae60"));
ctx1.lineWidth = 2;
ctx1.strokeRect(40, (cy53 - 85), (canvas_w - 80), 185);
ctx1.fillStyle = ((rage51) ? ("#e74c3c") : ("#27ae60"));
ctx1.font = "bold 20px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText(((rage51) ? ("YOU SNAPPED") : ("YOU MADE IT?!")), cx52, (cy53 - 55));
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "13px 'Courier New',monospace";
ctx1.fillText(`${"Time wasted: "}${squint_core.get(st, "score")??''}${" min"}`, cx52, (cy53 - 25));
ctx1.fillText(`${"Times redirected: "}${squint_core.get(st, "redirects")??''}`, cx52, (cy53 - 5));
ctx1.fillText(`${"Times almost there: "}${squint_core.get(st, "times-near-front")??''}`, cx52, (cy53 + 15));
if (squint_core.truth_(squint_core.get(st, "commentary"))) {
ctx1.fillStyle = "#f39c12";
ctx1.font = "italic 10px 'Courier New',monospace";
ctx1.fillText(squint_core.get(st, "commentary"), cx52, (cy53 + 45))};
ctx1.fillStyle = "#bdc3c7";
ctx1.font = "11px 'Courier New',monospace";
ctx1.fillText("Tap or Space to try again", cx52, (cy53 + 75))};
if (squint_core.truth_((() => {
const and__23554__auto__54 = squint_core.get(st, "paused");
if (squint_core.truth_(and__23554__auto__54)) {
return squint_core.not(squint_core.get(st, "over"))} else {
return and__23554__auto__54};

})())) {
ctx1.fillStyle = "rgba(0,0,0,0.55)";
ctx1.fillRect(0, 0, canvas_w, canvas_h);
const cx55 = (canvas_w / 2);
const cy56 = (canvas_h / 2);
ctx1.fillStyle = "rgba(30,30,30,0.9)";
ctx1.fillRect(60, (cy56 - 35), (canvas_w - 120), 70);
ctx1.strokeStyle = "#f39c12";
ctx1.lineWidth = 1;
ctx1.strokeRect(60, (cy56 - 35), (canvas_w - 120), 70);
ctx1.fillStyle = "#ecf0f1";
ctx1.font = "bold 18px 'Courier New',monospace";
ctx1.textAlign = "center";
ctx1.fillText("PAUSED", cx55, (cy56 - 8));
ctx1.font = "10px 'Courier New',monospace";
ctx1.fillStyle = "#95a5a6";
return ctx1.fillText("(the line is also paused. as always.)", cx55, (cy56 + 15));
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
return squint_core.swap_BANG_(state, squint_core.assoc, "player-lane", target3, "player-y", queue_bottom);
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

export { canvas_h, rand_redirect_line, draw_cameras, move_forward, reset_game, rand_between, touch_st, lane_w, commentary, start_loop, init_lane_people, draw_floor, draw_floor_arrows, num_lanes, queue_length, express_lane_x, tick_ms, make_person, game_tick, base_speed, player_size, lane_x, draw_booth, get_canvas, handle_key, draw_ropes, switch_lane, draw_person, draw_flight_board, get_ctx, person_colors, queue_bottom, rand_commentary, render, init_booths, setup_dpad, state, redirect_lines, init, handle_te, update_display, canvas_w, resize, draw_welcome_sign, handle_ts, queue_top, draw_ceiling_lights }
