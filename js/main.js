const html = document.documentElement;

// Появление блоков при прокрутке: 450–700 мс; внутри «пачки» задержка не больше трёх шагов по 30 мс (без каскада из десятков).
// Без JS, при reduced-motion и Save-Data (нет класса .motion) всё видно сразу.
const reveal = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && html.classList.contains('motion')) {
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target;
      el.style.transitionDelay = Math.min(i, 3) * 30 + 'ms';
      el.classList.add('is-in');
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  reveal.forEach((el) => io.observe(el));
} else {
  reveal.forEach((el) => el.classList.add('is-in'));
}

// Схема «Полный цикл»: вкладки (стрелки — вдоль списка, Home/End). Без JS все описания видны списком.
// На десктопе прокрутка (motion.js) сама переключает этапы, пока человек не выбрал этап вручную.
document.querySelectorAll('[data-scheme]').forEach((card) => {
  const scheme = card.querySelector('.scheme');
  const live = card.querySelector('.panels');
  const tablist = card.querySelector('[role=tablist]');
  const tabs = [...tablist.querySelectorAll('[role=tab]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const vertical = matchMedia('(max-width: 900px)'); // на телефоне этапы — вертикальный список
  let current = -1, manual = false;

  const orient = () => tablist.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
  vertical.addEventListener('change', orient);
  orient();

  live.setAttribute('aria-live', 'off'); // пока этапы листает прокрутка, экранный диктор молчит
  const arm = () => live.setAttribute('aria-live', 'polite'); // включаем заранее, до смены текста, иначе первое сообщение теряется
  tablist.addEventListener('pointerdown', arm);
  tablist.addEventListener('focusin', arm);

  const select = (i, focus) => {
    if (i !== current) {
      current = i;
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', i === j);
        t.tabIndex = i === j ? 0 : -1;
        t.classList.toggle('reached', j < i);
        panels[j].hidden = i !== j;
      });
      scheme.style.setProperty('--a', i);
    }
    if (focus) tabs[i].focus();
  };
  const choose = (i, focus) => { manual = true; arm(); select(i, focus); };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => choose(i));
    t.addEventListener('keydown', (e) => {
      // Стрелки только вдоль списка: вертикальные стрелки на горизонтальной схеме остаются прокруткой страницы
      const step = (vertical.matches ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowRight: 1, ArrowLeft: -1 })[e.key];
      if (step) { e.preventDefault(); choose((i + step + tabs.length) % tabs.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); choose(0, true); }
      else if (e.key === 'End') { e.preventDefault(); choose(tabs.length - 1, true); }
    });
  });

  card.addEventListener('scheme:scroll', (e) => {
    if (!e.detail.visible) { manual = false; live.setAttribute('aria-live', 'off'); select(e.detail.i); } // вышли из секции — автоматика снова (выше: этап 1, ниже: «Результат»)
    if (e.detail.inside && !manual) select(e.detail.i);
  });
  select(0);
});

// Подсветка пункта меню по положению на странице (полоса в середине окна)
const links = new Map([...document.querySelectorAll('.top nav a')].map((a) => [a.hash.slice(1), a]));
const spy = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e) => {
    links.forEach((a) => a.removeAttribute('aria-current'));
    links.get(e.target.id)?.setAttribute('aria-current', 'true');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
[document.querySelector('.hero'), ...['about', 'cycle', 'geo', 'approach', 'simurg', 'contact'].map((id) => document.getElementById(id))]
  .forEach((el) => spy.observe(el));

// Заглушки без адреса (.todo с href="#"): клик не должен открывать новую вкладку с этой же страницей
document.querySelectorAll('a.todo[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

html.classList.add('ready'); // скрипт отработал: css отменяет запасное появление блоков
// Плавная прокрутка — только после загрузки: при открытии с #якорем страница не «пролетает» все блоки
if (document.readyState === 'complete') html.classList.add('loaded');
else addEventListener('load', () => html.classList.add('loaded'));
