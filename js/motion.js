// Motion по разделу 5 мастер-промпта. Без WebGL: двигаем готовый фон (.world) и несколько DOM-элементов.
// Включается только классом .motion — его ставит скрипт в <head>, если нет prefers-reduced-motion и Save-Data.
// Всё сглаживает один rAF-цикл, он засыпает, когда значения дошли до цели. Прокрутку не перехватываем.
if (document.documentElement.classList.contains('motion')) {
  const $ = (s) => document.querySelector(s);
  const worlds = [...document.querySelectorAll('.world')]; // два окна одной полосы двигаются одинаково, поэтому стык не расходится
  const approach = $('.approach'), contact = $('.contact'), cycle = $('.cycle');
  const card = $('.cycle [data-scheme]'), sticky = $('.cycle .in');
  const fine = matchMedia('(hover: hover) and (pointer: fine)'); // параллакс и камера — не на тач-экранах
  const pin = matchMedia('(min-width: 1001px) and (min-height: 640px) and (hover: hover) and (pointer: fine)'); // то же условие, что у sticky в CSS
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const tgt = { cam: 0, mx: 0, my: 0, p: 0, h: 0 };
  const cur = { ...tgt };
  let raf = 0, snap = true, last = 0, sent = '';

  const frame = (ts) => {
    raf = 0;
    const now = ts || performance.now();
    const k = 1 - 0.86 ** (Math.min(64, now - last) / 16.7); // сглаживание не зависит от частоты кадров (на 60 Гц — 0,14 за кадр)
    last = now;
    const vh = innerHeight;

    // Сначала все чтения макета, потом записи: иначе каждый кадр принудительно пересчитывает раскладку
    const aTop = approach.getBoundingClientRect().top;
    const cTop = contact.getBoundingClientRect().top, cH = contact.offsetHeight;
    const r = pin.matches ? cycle.getBoundingClientRect() : null;
    const sH = r ? sticky.offsetHeight : 0;

    tgt.cam = fine.matches ? clamp(scrollY / (0.9 * vh)) : 0; // камера приближается на первом экране прокрутки
    tgt.p = clamp((vh - aTop) / (0.85 * vh)); // блок 05: 0 — панели разобщены, 1 — выровнены
    tgt.h = 1 - clamp((vh - cTop) / Math.min(0.9 * vh, cH)); // блок 07: 1 — диагональ, 0 — горизонталь; к концу страницы горизонталь при любой высоте окна
    let busy = false;
    for (const key in tgt) {
      const d = tgt[key] - cur[key];
      if (snap || document.hidden || Math.abs(d) < 0.0008) cur[key] = tgt[key]; // в фоновой вкладке не разгоняемся: сразу итоговое состояние
      else { cur[key] += d * k; busy = true; }
    }
    snap = false; // первый кадр — без разгона с нуля (страницу могли открыть посреди прокрутки)

    const cam = cur.cam.toFixed(4), mx = cur.mx.toFixed(4), my = cur.my.toFixed(4);
    for (const w of worlds) {
      w.style.setProperty('--cam', cam);
      w.style.setProperty('--mx', mx);
      w.style.setProperty('--my', my);
    }
    approach.style.setProperty('--p', cur.p.toFixed(4));
    contact.style.setProperty('--h', cur.h.toFixed(4));

    if (r) { // sticky-эпизод: семь равных отрезков прокрутки — семь этапов; путь = высота секции − высота закреплённого блока
      const len = r.height - Math.max(vh, sH);
      if (len > 0) {
        const i = Math.min(6, Math.floor(clamp(-r.top / len) * 7));
        const inside = r.top <= 0 && r.bottom >= Math.max(vh, sH), visible = r.top < vh && r.bottom > 0;
        const key = `${i}${inside ? 'i' : ''}${visible ? 'v' : ''}`;
        if (key !== sent) { // событие — только при смене состояния
          sent = key;
          card.dispatchEvent(new CustomEvent('scheme:scroll', { detail: { i, inside, visible } }));
        }
      }
    }
    if (busy) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (document.hidden) frame(); else if (!raf) raf = requestAnimationFrame(frame); };

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  pin.addEventListener('change', kick);
  addEventListener('pointermove', (e) => { // курсор смещает фон ≤ 10 px и наклоняет ≤ 1,2°; только мышь и только у героя
    if (e.pointerType !== 'mouse' || !fine.matches || scrollY > innerHeight) return;
    tgt.mx = (e.clientX / innerWidth) * 2 - 1;
    tgt.my = (e.clientY / innerHeight) * 2 - 1;
    kick();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { tgt.mx = tgt.my = 0; kick(); });
  document.fonts.ready.then(kick);
  kick();
}
