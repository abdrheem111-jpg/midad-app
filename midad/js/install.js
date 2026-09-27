/* ==========================================================================
   تثبيت مِداد كتطبيق (PWA): زر «ثبّت التطبيق» حين يسمح المتصفح،
   ودليل التثبيت لكل جهاز (ويندوز، سبورة Promethean ActivPanel، آيباد، نسخة الملف الواحد)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  let deferred = null;
  const btn = document.querySelector('[data-act="install"]');
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  if (btn) {
    btn.innerHTML = icon('download') + '<span>ثبّت التطبيق</span>';
    btn.onclick = () => install();
    if (!standalone() && !M.inArtifact) btn.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; if (btn) btn.hidden = false; });
  window.addEventListener('appinstalled', () => { deferred = null; if (btn) btn.hidden = true; M.toast('🎉 ثُبّت مِداد كتطبيق — تجده في قائمة البرامج وسطح المكتب ويعمل دون إنترنت', { time: 7000 }); });
  async function install() {
    if (deferred) {
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (r && r.outcome === 'accepted') return;
    }
    guide();
  }
  function guide() {
    const wrap = h('div', { class: 'install-guide' });
    const card = (ic, title, steps) => `<div class="ig-card"><b>${ic} ${title}</b><ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>`;
    wrap.innerHTML = `
      <p>مِداد تطبيق ويب تقدّمي: يُثبَّت مثل أي برنامج، ويعمل <b>دون إنترنت</b> بعد أول فتح، ويُحدَّث تلقائياً.</p>
      ${card('🖥️', 'حاسوب ويندوز أو ماك (Chrome أو Edge)', ['افتح رابط مِداد في Chrome أو Edge.', 'اضغط زر «ثبّت التطبيق» أعلى الشاشة، أو أيقونة التثبيت ⊕ في شريط العنوان.', 'يظهر مِداد في قائمة ابدأ وسطح المكتب ويفتح في نافذة مستقلة بملء الشاشة.'])}
      ${card('🧑‍🏫', 'سبورة Promethean ActivPanel (أندرويد) أو الشاشات التفاعلية', ['افتح المتصفح المدمج (Chromium) واكتب رابط مِداد.', 'من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'فعّل من الإعدادات «وضع السبورة التفاعلية» وجرّب «اختبار القلم».'])}
      ${card('📱', 'آيباد أو آيفون (Safari)', ['افتح الرابط في Safari.', 'اضغط زر المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية».'])}
      ${card('💾', 'دون تثبيت: نسخة الملف الواحد', ['احفظ الملف midad.html على الجهاز أو ذاكرة USB.', 'افتحه بالنقر المزدوج في Chrome أو Edge — يعمل كاملاً دون إنترنت ودون تثبيت.'])}
      <p class="hint">لنشره لكل معلمي المدرسة: ارفع مجلد التطبيق على أي خادم ويب أو GitHub Pages، ثم يثبّته كل معلم من الرابط.</p>`;
    M.modal({ title: 'تثبيت مِداد كتطبيق', icon: 'download', body: wrap, size: 'lg' });
  }
  // اختصارات التطبيق المثبّت: ?mode=circle أو ?mode=space3d أو ?new
  try {
    const q = new URLSearchParams(location.search);
    const mode = q.get('mode');
    if (mode || q.has('new')) setTimeout(() => { if (q.has('new') && M.board) M.board.addPage('grid'); if (mode && M.modes) M.modes.open(mode); }, 900);
  } catch (e) { /* */ }
  M.installApp = { install, guide };
})();
