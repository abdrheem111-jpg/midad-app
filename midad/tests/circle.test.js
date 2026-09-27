/* اختبار الدائرة التفاعلية: القوانين، ونظريات الدائرة على آلاف الأشكال العشوائية، والبطاقات والأسئلة */
const T = require('./harness');
document.getElementById = () => null;
const M = T.load('js/core.js', 'js/circle.js');
const G = M.circleGeo;
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);
const PI = Math.PI, TAU = 2 * PI, DEG = 180 / PI;
const rnd = (a, b) => a + Math.random() * (b - a);

// القوانين
const m = G.measures(5);
T.check('محيط دائرة نق = ٥ هو ١٠ط ومساحتها ٢٥ط', near(m.C, 10 * PI) && near(m.A, 25 * PI) && m.d === 10);
const sc = G.sector(6, PI / 3);
T.check('قطاع نق = ٦ و θ = ٦٠°: القوس ٢ط والمساحة ٦ط والمحيط ١٢ + ٢ط', near(sc.arc, 2 * PI) && near(sc.area, 6 * PI) && near(sc.perim, 12 + 2 * PI));
T.check('قطعة نق = ٦ و θ = ٩٠°: المساحة ٩ط − ١٨', near(G.segment(6, PI / 2).area, 9 * PI - 18));
T.check('وتر يقابل ٦٠° طوله = نق', near(G.segment(7, PI / 3).chord, 7));
T.check('الالتصاق: ١٤٫٢° ⇐ ١٥° و ٣٧٫٤° ⇐ ٣٧°', near(G.snapAng(14.2 / DEG) * DEG, 15) && near(G.snapAng(37.4 / DEG) * DEG, 37));

// نظريات الدائرة على أشكال عشوائية
const N = 3000;
let okI = 0, okS = 0, okSame = 0, okCyc = 0, okT = 0, okCh = 0, okTC = 0, cntCh = 0;
for (let i = 0; i < N; i++) {
  const o = G.create(rnd(-300, 300), rnd(-300, 300), rnd(40, 260), 'inscribed');
  const A = rnd(0, TAU), B = rnd(0, TAU), P = rnd(0, TAU), Q = rnd(0, TAU);
  if (Math.min(Math.abs(A - B), Math.abs(A - P), Math.abs(B - P), Math.abs(Q - A), Math.abs(Q - B)) < 0.05) { okI++; okS++; okSame++; okCyc++; okT++; okTC++; continue; }
  const pA = G.pt(o, A), pB = G.pt(o, B), pP = G.pt(o, P), pQ = G.pt(o, Q);
  // المحيطية = نصف القوس المقابل (الذي لا يحوي رأسها)
  const arc = G.onArc(P, A, B) ? ((A - B) % TAU + TAU) % TAU : ((B - A) % TAU + TAU) % TAU;
  if (near(G.angleAt(pP, pA, pB), (arc * DEG) / 2, 1e-6)) okI++;
  // نصف الدائرة
  if (near(G.angleAt(pP, pA, G.pt(o, A + PI)), 90, 1e-6)) okS++;
  // على القوس نفسه: متساويتان، أو متكاملتان إن كانتا على جهتين
  const same = G.onArc(P, B, A) === G.onArc(Q, B, A), ap = G.angleAt(pP, pA, pB), aq = G.angleAt(pQ, pA, pB);
  if (same ? near(ap, aq, 1e-6) : near(ap + aq, 180, 1e-6)) okSame++;
  // الرباعي الدائري
  const ang = [A, B, P, Q].map((x) => ((x % TAU) + TAU) % TAU).sort((x, y) => x - y).map((x) => G.pt(o, x));
  const qa = ang.map((p, j) => G.angleAt(p, ang[(j + 3) % 4], ang[(j + 1) % 4]));
  if (near(qa[0] + qa[2], 180, 1e-6) && near(qa[1] + qa[3], 180, 1e-6)) okCyc++;
  // المماسان: متساويان ويعامدان نصف القطر
  o.e = { k: rnd(1.1, 4), a: rnd(0, TAU) };
  const t = G.tangents(o), E = [o.cx + o.e.k * o.r * Math.cos(o.e.a), o.cy - o.e.k * o.r * Math.sin(o.e.a)], T1 = G.pt(o, t.a1), T2 = G.pt(o, t.a2);
  if (near(Math.hypot(E[0] - T1[0], E[1] - T1[1]), t.len, 1e-6) && near(Math.hypot(E[0] - T2[0], E[1] - T2[1]), t.len, 1e-6) && near(G.angleAt(T1, [o.cx, o.cy], E), 90, 1e-6) && near(G.angleAt(T2, [o.cx, o.cy], E), 90, 1e-6)) okT++;
  // الأوتار المتقاطعة
  const X = G.segX(pA, pB, pP, pQ);
  if (X) { cntCh++; const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]); if (near(d(pA, X) * d(X, pB), d(pP, X) * d(X, pQ), 1e-6 * o.r * o.r)) okCh++; }
  // المماس والوتر: الزاوية بينهما = المحيطية في القطعة المتبادلة
  const td = [Math.sin(A), Math.cos(A)], q1 = [pA[0] + td[0] * 50, pA[1] + td[1] * 50], q2 = [pA[0] - td[0] * 50, pA[1] - td[1] * 50];
  const ip = G.angleAt(pP, pA, pB), t1 = G.angleAt(pA, q1, pB), t2 = G.angleAt(pA, q2, pB);
  if (near(t1 + t2, 180, 1e-6) && (near(t1, ip, 1e-6) || near(t2, ip, 1e-6))) okTC++;
}
T.check(`الزاوية المركزية ضعف المحيطية (${N} شكل)`, okI === N, `${okI}/${N}`);
T.check('الزاوية المحيطية في نصف دائرة قائمة', okS === N, `${okS}/${N}`);
T.check('الزوايا المحيطية على القوس نفسه متساوية (أو متكاملة على جهتين)', okSame === N, `${okSame}/${N}`);
T.check('الزاويتان المتقابلتان في الرباعي الدائري متكاملتان', okCyc === N, `${okCyc}/${N}`);
T.check('المماسان من نقطة خارجية متساويان ويعامدان نصف القطر', okT === N, `${okT}/${N}`);
T.check(`الأوتار المتقاطعة: أهـ×هـب = جهـ×هـد (${cntCh} تقاطعاً)`, cntCh > 100 && okCh === cntCh, `${okCh}/${cntCh}`);
T.check('زاوية المماس والوتر = المحيطية في القطعة المتبادلة', okTC === N, `${okTC}/${N}`);

// كل المشاهد: البطاقة بلا قيم مفقودة، والسؤال بإجابة صحيحة، والنقاط قابلة للسحب
for (const k of Object.keys(G.SCENES)) {
  const o = G.create(0, 0, 200, k);
  const inf = G.info(o);
  const bad = inf.lines.filter((l) => /NaN|undefined|= —|∞/.test(l));
  T.check(`مشهد «${G.SCENES[k].t}»: البطاقة سليمة`, inf.lines.length >= 2 && !bad.length, bad.join(' | '));
  const q = G.quiz(o);
  T.check(`مشهد «${G.SCENES[k].t}»: سؤال بإجابة`, q && q.q && (typeof q.a === 'string' || Number.isFinite(q.a)), q && q.a);
  const hs = G.handles(o);
  T.check(`مشهد «${G.SCENES[k].t}»: المركز قابل للسحب`, hs[0].k === 'O');
}
// السحب
const o = G.create(0, 0, 200, 'sector');
const hA = G.handles(o).find((q) => q.k === 'A');
T.check('التقاط النقطة أ بالقلم', G.handleAt(o, hA.p[0] + 5, hA.p[1] - 4, 18) === 'A');
G.drag(o, 'A', 0, -300); // أعلى الدائرة ⇐ ٩٠°
T.check('سحب أ إلى الأعلى ⇐ الزاوية ٩٠°', near(o.a.A * DEG, 90));
G.drag(o, 'O', 0, 0, 30, -20);
T.check('سحب المركز يحرّك الدائرة', o.cx === 30 && o.cy === -20);
const b = G.create(0, 0, 120, 'basic');
G.drag(b, 'R', 197, 0);
T.check('سحب نصف القطر يلتصق بأنصاف السنتيمترات (٢٠٠ بكسل = ٥ سم)', b.r === 200);
// أرقام البطاقة
const s = G.create(0, 0, 200, 'sector'); s.a.A = 0; s.a.B = PI / 2;
const lines = G.info(s).lines.join(' ');
T.check('بطاقة القطاع: نق = ٥ ، θ = ٩٠° ، القوس ٢٫٥ط', /٩٠°/.test(lines) && /٢٫٥ط/.test(lines) && /٦٫٢٥ط/.test(lines), lines);
s.opts.pi = '3.14';
T.check('ط = ٣٫١٤ ⇐ مساحة القطاع ١٩٫٦٣', /١٩٫٦٣/.test(G.info(s).lines.join(' ')), G.info(s).lines.join(' '));
process.exitCode = T.report('اختبار الدائرة التفاعلية');
