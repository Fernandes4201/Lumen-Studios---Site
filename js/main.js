/* ==========================================================================
   Lumen Studios — interações
   JavaScript puro, sem dependências. Cada módulo só roda na página que tem os
   seus elementos. Sem JS, o conteúdo continua visível e os links de contato
   continuam funcionando.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobileNav = window.matchMedia('(max-width: 1100px)');
  const verticalSteps = window.matchMedia('(max-width: 960px)');

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const scrollBehavior = () => (reduceMotion ? 'auto' : 'smooth');
  const onVisible = (el, fn, threshold = 0.4) => {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      fn();
    }, { threshold }).observe(el);
  };

  /* ---------- Toast + copiar ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ==========================================================================
     Rolagem: cabeçalho, barra de progresso e botão flutuante
     ========================================================================== */
  const header = $('.header');
  const progressBar = $('.progress span');
  const fab = $('.fab');
  const scrollHooks = [];

  let scrollTicking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 16);
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    fab.classList.toggle('is-on', y > window.innerHeight * 0.6);
    scrollHooks.forEach((fn) => fn());
    scrollTicking = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  /* ==========================================================================
     Menu principal e menu suspenso de serviços
     ========================================================================== */
  const menuBtn = $('.menu-toggle');
  const nav = $('#menu');
  const drops = $$('[data-drop]');

  function setDrop(item, open) {
    item.classList.toggle('is-open', open);
    $('.nav__trigger', item).setAttribute('aria-expanded', String(open));
  }
  const closeDrops = (except) => drops.forEach((item) => { if (item !== except) setDrop(item, false); });

  function setMenu(open) {
    document.documentElement.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (!open) closeDrops();
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if (!e.target.closest('a')) return;
    setMenu(false);
  });

  drops.forEach((item) => {
    const trigger = $('.nav__trigger', item);
    let hoverTimer;
    let openedByHoverAt = 0;

    trigger.addEventListener('click', () => {
      // o hover já abriu: o clique logo em seguida não deve fechar
      if (item.classList.contains('is-open') && performance.now() - openedByHoverAt < 450) return;
      setDrop(item, !item.classList.contains('is-open'));
    });
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || mobileNav.matches) return;
      clearTimeout(hoverTimer);
      if (!item.classList.contains('is-open')) openedByHoverAt = performance.now();
      closeDrops(item);
      setDrop(item, true);
    });
    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || mobileNav.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => setDrop(item, false), 180);
    });
    item.addEventListener('focusout', (e) => {
      if (!mobileNav.matches && !item.contains(e.relatedTarget)) setDrop(item, false);
    });
    $$('.drop a', item).forEach((link) => link.addEventListener('click', () => setDrop(item, false)));
  });

  document.addEventListener('click', (e) => {
    if (!mobileNav.matches && !e.target.closest('[data-drop]')) closeDrops();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = drops.find((item) => item.classList.contains('is-open'));
    if (open) {
      setDrop(open, false);
      $('.nav__trigger', open).focus();
      return;
    }
    if (menuBtn.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuBtn.focus();
    }
  });
  mobileNav.addEventListener('change', (e) => {
    closeDrops();
    if (!e.matches) setMenu(false);
  });

  /* ==========================================================================
     Luz que segue o cursor (fundo, cards, rodapé) e efeitos de ponteiro
     ========================================================================== */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-pointer');
    const bg = $('.bg');
    let mx = window.innerWidth * 0.7;
    let my = window.innerHeight * 0.22;
    let cx = mx;
    let cy = my;
    let raf = null;
    const follow = () => {
      cx += (mx - cx) * 0.16;
      cy += (my - cy) * 0.16;
      bg.style.setProperty('--mx', `${cx.toFixed(1)}px`);
      bg.style.setProperty('--my', `${cy.toFixed(1)}px`);
      raf = (Math.abs(mx - cx) > 0.4 || Math.abs(my - cy) > 0.4) ? requestAnimationFrame(follow) : null;
    };
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });

    $$('.glow-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - r.left}px`);
        card.style.setProperty('--y', `${e.clientY - r.top}px`);
      });
    });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--bx', `${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
        el.style.setProperty('--by', `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--bx', '0px');
        el.style.setProperty('--by', '0px');
      });
    });

    const giant = $('.footer__giant');
    $('.footer').addEventListener('pointermove', (e) => {
      const r = giant.getBoundingClientRect();
      giant.style.setProperty('--fx', `${e.clientX - r.left}px`);
      giant.style.setProperty('--fy', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- Revelar ao rolar + contadores ---------- */
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealer.observe(el));

  const counter = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counter.unobserve(entry.target);
      const el = entry.target;
      const end = Number(el.dataset.count);
      if (reduceMotion) return;
      const start = performance.now();
      const duration = 1100;
      const step = (now) => {
        const k = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(end * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => counter.observe(el));

  /* ---------- Rótulos que se "decodificam" ao aparecer ---------- */
  // o texto real fica num <span> só para leitores de tela; o visível embaralha e se resolve
  if (!reduceMotion) {
    const GLYPHS = '</>{}[]=+*01#_';
    const scramble = (el) => {
      const text = el.textContent.trim();
      const shown = document.createElement('span');
      shown.setAttribute('aria-hidden', 'true');
      const real = document.createElement('span');
      real.className = 'sr-only';
      real.textContent = text;
      el.textContent = '';
      el.append(real, shown);
      const t0 = performance.now();
      const step = (now) => {
        const done = Math.floor((now - t0) / 28);
        shown.textContent = [...text].map((ch, i) => {
          if (ch === ' ' || i < done) return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }).join('');
        if (done < text.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const decoder = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        decoder.unobserve(entry.target);
        scramble(entry.target);
      });
    }, { threshold: 0.6 });
    $$('main .eyebrow').forEach((el) => decoder.observe(el));
  }

  /* ==========================================================================
     Início — palavra que troca, antes e depois e faixa
     ========================================================================== */

  // Palavra que troca: apaga com desfoque e volta "acesa" por um feixe de luz
  const rotator = $('.rotator');
  if (rotator && !reduceMotion) {
    const words = rotator.dataset.words.split('|');
    let index = 0;
    setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % words.length;
      rotator.classList.remove('is-lit');
      rotator.classList.add('is-out');
      setTimeout(() => {
        rotator.textContent = words[index];
        rotator.classList.remove('is-out');
        void rotator.offsetWidth;
        rotator.classList.add('is-lit');
      }, 360);
    }, 2600);
  }

  // Antes e depois: arraste o feixe de luz para "iluminar" o perfil
  const ba = $('[data-ba]');
  if (ba) {
    const baStage = $('.ba-stage');
    const baRange = $('.ba__range', ba);
    let baTouched = false;
    let baDrag = null;

    const setBa = (p) => {
      const v = clamp(p, 0, 1);
      ba.style.setProperty('--p', v.toFixed(4));
      baRange.value = String(Math.round(v * 100));
      baRange.setAttribute('aria-valuetext', `${Math.round((1 - v) * 100)}% do perfil iluminado`);
    };
    const touchBa = () => {
      if (baTouched) return;
      baTouched = true;
      baStage.classList.add('is-touched');
    };
    // a posição considera só a tela do celular, sem a moldura de 10px
    const baFromX = (clientX) => {
      const r = ba.getBoundingClientRect();
      return (clientX - r.left - 10) / (r.width - 20);
    };

    ba.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      baDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: e.pointerType === 'mouse' };
      if (baDrag.active) {
        e.preventDefault();
        ba.setPointerCapture(e.pointerId);
        ba.classList.add('is-dragging');
        touchBa();
        setBa(baFromX(e.clientX));
      }
    });
    ba.addEventListener('pointermove', (e) => {
      if (!baDrag || baDrag.id !== e.pointerId) return;
      if (!baDrag.active) {
        // no toque, só arrasta quando o gesto é horizontal; vertical continua rolando a página
        const dx = Math.abs(e.clientX - baDrag.x);
        const dy = Math.abs(e.clientY - baDrag.y);
        if (dx < 6 || dx < dy) return;
        baDrag.active = true;
        ba.setPointerCapture(e.pointerId);
        ba.classList.add('is-dragging');
        touchBa();
      }
      setBa(baFromX(e.clientX));
    });
    const endBa = () => { baDrag = null; ba.classList.remove('is-dragging'); };
    ba.addEventListener('pointerup', endBa);
    ba.addEventListener('pointercancel', endBa);
    baRange.addEventListener('input', () => { touchBa(); setBa(Number(baRange.value) / 100); });

    // Entrada: o feixe começa quase todo no "antes" e desliza revelando o "depois"
    if (!reduceMotion) {
      setBa(0.86);
      onVisible(ba, () => {
        setTimeout(() => {
          if (baTouched) return;
          const from = 0.86;
          const to = 0.42;
          const t0 = performance.now();
          const step = (now) => {
            if (baTouched) return;
            const k = Math.min(1, (now - t0) / 1600);
            setBa(from + (to - from) * (1 - (1 - k) ** 3));
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, 700);
      }, 0.5);
    } else {
      setBa(0.42);
    }

    // Parallax suave dos elementos do palco
    if (finePointer && !reduceMotion) {
      const layers = $$('[data-depth]', baStage);
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;
      let raf = null;
      const loop = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.depth);
          layer.style.setProperty('--px', `${(cx * depth * -22).toFixed(2)}px`);
          layer.style.setProperty('--py', `${(cy * depth * -16).toFixed(2)}px`);
        });
        raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : null;
      };
      $('.hero').addEventListener('pointermove', (e) => {
        if (baDrag) return;
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
        if (!raf) raf = requestAnimationFrame(loop);
      });
    }
  }

  // Faixa: anda sozinha e acelera (e muda de sentido) com a rolagem
  const marquee = $('.marquee');
  if (marquee && !reduceMotion) {
    const track = $('.marquee__track', marquee);
    let x = 0;
    let half = track.scrollWidth / 2;
    let dir = -1;
    let boost = 0;
    let lastY = window.scrollY;
    let last = 0;
    let running = false;
    let raf = null;
    const measure = () => { half = track.scrollWidth / 2; };
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    window.addEventListener('scroll', () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (!dy) return;
      dir = dy > 0 ? -1 : 1;
      boost = Math.min(boost + Math.abs(dy) * 0.05, 9);
    }, { passive: true });

    const tick = (now) => {
      const dt = last ? Math.min(64, now - last) / 16.67 : 1;
      last = now;
      x += dir * (0.55 + boost) * dt;
      boost *= 0.93;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      if (running) raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    }).observe(marquee);
  }

  /* ==========================================================================
     Serviços — demonstrações de cada capítulo
     As abas avisam qual capítulo abriu pelo evento "lumen:tab".
     ========================================================================== */

  // 01 · Social media: calendário editorial que se planeja sozinho
  const cal = $('[data-cal]');
  if (cal) {
    const igTiles = $$('[data-ig] i');
    const planBtn = $('[data-plan-month]');
    const WEEK_PLAN = ['reels', 'post', 'story', 'reels', 'post', 'story', null];
    for (let day = 1; day <= 30; day += 1) {
      const cell = document.createElement('span');
      cell.textContent = day;
      cal.appendChild(cell);
    }
    const calCells = $$('span', cal);
    let calPlanned = false;
    let planTimers = [];

    const planMonth = () => {
      planTimers.forEach(clearTimeout);
      planTimers = [];
      calCells.forEach((c) => { c.className = ''; });
      igTiles.forEach((t) => { t.className = ''; });
      calPlanned = true;
      planBtn.textContent = 'Replanejar';

      const delay = reduceMotion ? 0 : 45;
      calCells.forEach((cell, i) => {
        const type = WEEK_PLAN[i % 7];
        if (!type) return;
        planTimers.push(setTimeout(() => {
          cell.classList.add(type, 'pop');
          planTimers.push(setTimeout(() => cell.classList.remove('pop'), 220));
        }, i * delay));
      });
      igTiles.forEach((tile, i) => {
        planTimers.push(setTimeout(() => {
          tile.classList.add('is-on');
          if (i % 3 === 0) tile.classList.add('is-reel');
        }, 300 + i * (reduceMotion ? 0 : 110)));
      });
    };
    planBtn.addEventListener('click', planMonth);
    onVisible(cal, () => { if (!calPlanned) planMonth(); });
    document.addEventListener('lumen:tab', (e) => {
      if (e.detail === 'social-media' && !calPlanned) planMonth();
    });
  }

  // 02 · Vídeo: player de demonstração
  const player = $('[data-player]');
  if (player) {
    const DURATION = 45;
    const wave = $('.wave', player);
    for (let i = 0; i < 64; i += 1) {
      const bar = document.createElement('i');
      const h = 18 + 78 * Math.abs(Math.sin(i * 0.62) * Math.cos(i * 0.21) + 0.25 * Math.sin(i * 1.7));
      bar.style.setProperty('--h', `${Math.min(100, h).toFixed(0)}%`);
      wave.appendChild(bar);
    }
    const waveBars = $$('i', wave);
    const tcEl = $('[data-tc]', player);
    const barEl = $('.player__bar span', player);
    const headEl = $('.playhead', player);
    const playBtn = $('[data-play]', player);
    const timeline = $('.player__timeline', player);

    let playhead = 14;
    let playing = false;
    let lastFrame = 0;
    let playerRaf = null;

    const renderPlayer = () => {
      const p = playhead / DURATION;
      tcEl.textContent = `00:00:${String(Math.floor(playhead)).padStart(2, '0')}`;
      barEl.style.width = `${(p * 100).toFixed(2)}%`;
      headEl.style.left = `calc(${(p * 100).toFixed(2)}% - ${(p * 20).toFixed(2)}px)`;
      const lit = Math.floor(p * waveBars.length);
      waveBars.forEach((bar, i) => bar.classList.toggle('is-played', i < lit));
    };

    const playerFrame = (now) => {
      if (!playing) return;
      const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
      lastFrame = now;
      playhead = (playhead + dt) % DURATION;
      renderPlayer();
      playerRaf = requestAnimationFrame(playerFrame);
    };

    const setPlaying = (on) => {
      playing = on;
      player.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-pressed', String(on));
      playBtn.setAttribute('aria-label', on ? 'Pausar demonstração' : 'Reproduzir demonstração');
      cancelAnimationFrame(playerRaf);
      if (on) {
        lastFrame = 0;
        playerRaf = requestAnimationFrame(playerFrame);
      }
    };

    playBtn.addEventListener('click', () => setPlaying(!playing));
    timeline.addEventListener('click', (e) => {
      const r = timeline.getBoundingClientRect();
      const k = Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width));
      playhead = k * DURATION;
      renderPlayer();
    });
    renderPlayer();

    // Pausa quando sai da tela ou quando outro capítulo é aberto
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && playing) setPlaying(false);
    }).observe(player);
    document.addEventListener('lumen:tab', (e) => { if (e.detail !== 'video') setPlaying(false); });
  }

  // 03 · Design: paleta que aplica e copia a cor
  const board = $('.brandboard');
  if (board) {
    const swatches = $$('.swatch', board);
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', async () => {
        const hex = swatch.dataset.hex;
        board.style.setProperty('--accent', hex);
        swatches.forEach((s) => s.setAttribute('aria-pressed', String(s === swatch)));
        toast((await copyText(hex)) ? `Cor ${hex} aplicada e copiada ✓` : `Cor ${hex} aplicada`);
      });
    });
  }

  // 04 · Sites: o mesmo site no computador, tablet e celular
  const browser = $('.browser');
  if (browser) {
    const deviceBtns = $$('[data-device]');
    deviceBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        browser.dataset.view = btn.dataset.device;
        deviceBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      });
    });
  }

  // 05 · Marketing digital: a empresa sobe na busca local
  const local = $('[data-local]');
  if (local) {
    const rows = $$('.lr', local);
    const modeBtns = $$('[data-local-mode]', local);
    let autoplayed = false;

    const setLocal = (mode) => {
      local.dataset.mode = mode;
      rows.forEach((row) => row.style.setProperty('--rank', row.dataset[mode]));
      modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.localMode === mode)));
    };
    const autoplay = () => {
      if (autoplayed) return;
      autoplayed = true;
      setTimeout(() => setLocal('on'), reduceMotion ? 0 : 900);
    };
    modeBtns.forEach((b) => b.addEventListener('click', () => {
      autoplayed = true;
      setLocal(b.dataset.localMode);
    }));
    setLocal('off');
    document.addEventListener('lumen:tab', (e) => { if (e.detail === 'marketing-digital') autoplay(); });
  }

  /* ---------- Abas dos capítulos (com link direto: servicos.html#video) ---------- */
  const tablist = $('[role="tablist"]');
  if (tablist) {
    const tabs = $$('[role="tab"]', tablist);
    const ink = $('.tabs__ink', tablist);

    const moveInk = (tab) => {
      ink.style.width = `${tab.offsetWidth}px`;
      ink.style.transform = `translateX(${tab.offsetLeft}px)`;
    };
    const activeTab = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true');

    const selectTab = (tab, focus = false) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        if (selected) {
          panel.hidden = false;
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        } else {
          panel.hidden = true;
        }
      });
      moveInk(tab);
      if (focus) tab.focus();
      if (tablist.scrollWidth > tablist.clientWidth) {
        tablist.scrollTo({ left: tab.offsetLeft - 16, behavior: scrollBehavior() });
      }
      document.dispatchEvent(new CustomEvent('lumen:tab', { detail: tab.dataset.tab }));
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          selectTab(tabs[next], true);
        }
      });
    });

    const tabFromHash = (hash) => tabs.find((t) => `#${t.dataset.tab}` === hash);
    const scrollToTabs = (behavior) => {
      const top = tablist.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 20;
      window.scrollTo({ top, behavior });
    };
    const openFromHash = (hash, behavior = scrollBehavior()) => {
      const tab = tabFromHash(hash);
      if (!tab) return false;
      selectTab(tab);
      requestAnimationFrame(() => scrollToTabs(behavior));
      return true;
    };

    // links para um capítulo na própria página (menu, sumário, rodapé)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="#"]');
      if (!link || link.pathname !== window.location.pathname || !tabFromHash(link.hash)) return;
      e.preventDefault();
      setMenu(false);
      if (window.location.hash !== link.hash) history.pushState(null, '', link.hash);
      openFromHash(link.hash);
    });
    window.addEventListener('hashchange', () => openFromHash(window.location.hash));

    if (openFromHash(window.location.hash, 'auto')) {
      // o navegador rola até a âncora quando a página termina de carregar; voltamos para as abas
      window.addEventListener('load', () => scrollToTabs('auto'), { once: true });
    }

    window.addEventListener('resize', () => moveInk(activeTab()));
    moveInk(activeTab());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveInk(activeTab()));
  }

  /* ==========================================================================
     Portfólio — filtros e visualizador de projetos
     ========================================================================== */
  const projectsList = $('[data-projects]');
  if (projectsList) {
    const projects = JSON.parse($('#portfolio-data').textContent);
    const cards = $$('.project', projectsList);
    const filters = $$('[data-filter]');

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const apply = () => cards.forEach((card) => {
          card.hidden = !(filter === 'todos' || card.dataset.tags.split(' ').includes(filter));
        });
        if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
        else apply();
      });
    });

    const dlg = $('#lightbox');
    const img = $('[data-lb-img]', dlg);
    const title = $('#lb-title', dlg);
    const meta = $('[data-lb-meta]', dlg);
    const count = $('[data-lb-count]', dlg);
    const caption = $('[data-lb-caption]', dlg);
    const dots = $('[data-lb-dots]', dlg);
    const prevBtn = $('[data-lb-prev]', dlg);
    const nextBtn = $('[data-lb-next]', dlg);
    let project = 0;
    let index = 0;

    const preload = (src) => { const pre = new Image(); pre.src = src; };

    const show = (i) => {
      const slides = projects[project].slides;
      index = (i + slides.length) % slides.length;
      const slide = slides[index];
      img.classList.add('is-swapping');
      const next = new Image();
      next.src = slide.src;
      const swap = () => {
        img.src = slide.src;
        img.width = slide.w;
        img.height = slide.h;
        img.alt = slide.alt;
        requestAnimationFrame(() => img.classList.remove('is-swapping'));
      };
      if (next.decode) next.decode().then(swap, swap);
      else swap();
      caption.textContent = slide.alt;
      count.textContent = slides.length > 1 ? `${index + 1} de ${slides.length}` : '1 peça';
      $$('button', dots).forEach((dot, d) => dot.setAttribute('aria-current', String(d === index)));
      if (slides.length > 1) preload(slides[(index + 1) % slides.length].src);
    };

    const open = (p) => {
      project = p;
      const { slides } = projects[p];
      title.textContent = projects[p].title;
      meta.textContent = projects[p].meta;
      prevBtn.hidden = slides.length < 2;
      nextBtn.hidden = slides.length < 2;
      dots.textContent = '';
      if (slides.length > 1) {
        slides.forEach((slide, d) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', `Ver peça ${d + 1} de ${slides.length}`);
          dot.addEventListener('click', () => show(d));
          dots.appendChild(dot);
        });
      }
      show(0);
      dlg.showModal();
    };

    $$('[data-project]', projectsList).forEach((btn) => {
      btn.addEventListener('click', () => open(Number(btn.dataset.project)));
    });
    prevBtn.addEventListener('click', () => show(index - 1));
    nextBtn.addEventListener('click', () => show(index + 1));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // deslizar para os lados no celular
    let swipe = null;
    const stage = $('.lightbox__stage', dlg);
    stage.addEventListener('pointerdown', (e) => { swipe = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener('pointerup', (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && projects[project].slides.length > 1) {
        show(index + (dx < 0 ? 1 : -1));
      }
    });
  }

  /* ==========================================================================
     Sobre nós — código que se digita sozinho
     ========================================================================== */
  const code = $('[data-code]');
  if (code) {
    const lines = $$('.code__line', code);
    const out = $('[data-code-out]', code);
    const runBtn = $('[data-code-run]', code);
    const OUTPUTS = [
      '→ sua marca, iluminada.',
      '→ ideia recebida. Preparando a luz…',
      '→ resultado: mais clientes enxergando você.',
    ];
    let runs = 0;

    const type = () => {
      let t = 0;
      lines.forEach((line) => {
        const n = Math.max(1, line.textContent.length);
        line.style.setProperty('--n', n);
        line.style.setProperty('--t', `${t}ms`);
        t += n * 24 + 140;
      });
      code.classList.add('is-typing');
      setTimeout(() => {
        code.classList.remove('is-typing');
        code.classList.add('is-typed');
      }, t + 100);
    };
    if (reduceMotion) code.classList.add('is-typed');
    else onVisible(code, type, 0.35);

    runBtn.addEventListener('click', () => {
      code.classList.remove('is-typing');
      code.classList.add('is-typed');
      out.textContent = OUTPUTS[runs % OUTPUTS.length];
      runs += 1;
      out.classList.add('is-on');
      code.classList.remove('is-lit');
      void code.offsetWidth;
      code.classList.add('is-lit');
    });
  }

  /* ==========================================================================
     Como trabalhamos — linha que acende ao rolar
     ========================================================================== */
  const stepsWrap = $('.steps-wrap');
  if (stepsWrap) {
    const steps = $$('.step', stepsWrap);
    const updateSteps = () => {
      const r = stepsWrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const vertical = verticalSteps.matches;
      let p = vertical
        ? (vh * 0.62 - r.top) / r.height
        : (vh * 0.82 - r.top) / (vh * 0.45);
      p = clamp(p, 0, 1);
      stepsWrap.style.setProperty('--p', p.toFixed(3));

      const length = (vertical ? r.height : r.width) - 28;
      steps.forEach((step) => {
        const offset = vertical ? step.offsetTop : step.offsetLeft;
        step.classList.toggle('is-lit', p > 0.001 && p * length >= offset);
      });
    };
    scrollHooks.push(updateSteps);
    verticalSteps.addEventListener('change', updateSteps);
  }

  /* ==========================================================================
     Contato — formulário do Google com serviço pré-selecionado
     Ex.: contato.html?servico=video&contratacao=mensal#formulario
     ========================================================================== */
  const formFrame = $('[data-form-frame]');
  if (formFrame) {
    const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfqDbTl9C8j1ZO8-qBzuVMaF_iWy1MmkgR4wSIQWnKQoiw5Iw/viewform';
    const ENTRY = {
      servicos: 'entry.1622429667',
      tipo: 'entry.881500124',
      contratacao: 'entry.1321763328',
    };
    const SERVICES = {
      social: { label: 'Social media', values: ['Conteúdo para redes sociais'] },
      video: { label: 'Edição de vídeo', values: ['Edição de vídeo'] },
      design: { label: 'Design', values: ['Design gráfico', 'Identidade visual'] },
      sites: { label: 'Sites', values: ['Desenvolvimento de sites'] },
      // o formulário não tem essa opção, e o Google não exibe "Outro" pré-preenchido
      marketing: { note: 'Para marketing digital, marque “Outro...” no formulário e informe o serviço.' },
    };
    const TYPES = { industria: 'Indústria', alimenticia: 'Redes Alimentícias', agencia: 'Agências' };
    const HIRING = {
      pontual: 'Projeto pontual',
      recorrente: 'Serviços recorrentes',
      mensal: 'Contrato mensal',
      parceria: 'Parceria entre agências',
      terceirizacao: 'Terceirização de serviços',
    };

    const query = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    const chosen = [];
    const notes = [];

    (query.get('servico') || '').split(',').map((s) => s.trim()).forEach((key) => {
      const service = SERVICES[key];
      if (!service) return;
      if (service.values) {
        chosen.push(service.label);
        service.values.forEach((value) => params.append(ENTRY.servicos, value));
      }
      if (service.note) notes.push(service.note);
    });
    const type = TYPES[query.get('tipo')];
    if (type) {
      params.append(ENTRY.tipo, type);
      chosen.push(type);
    }
    const hiring = HIRING[query.get('contratacao')];
    if (hiring) {
      params.append(ENTRY.contratacao, hiring);
      chosen.push(hiring);
    }

    if (chosen.length) {
      const prefill = `usp=pp_url&${params.toString()}`;
      formFrame.dataset.src = `${FORM_URL}?embedded=true&${prefill}`;
      $$('[data-form-link]').forEach((link) => { link.href = `${FORM_URL}?${prefill}`; });
    }
    if (chosen.length || notes.length) {
      const chosenEl = $('[data-form-chosen]');
      const summary = chosen.length ? `Pré-selecionado no formulário: ${chosen.join(' · ')}.` : '';
      $('[data-form-chosen-text]', chosenEl).textContent = [summary, ...notes].filter(Boolean).join(' ');
      chosenEl.hidden = false;
    }

    // o formulário só é carregado dentro da página quando a pessoa pede
    const box = $('[data-gform]');
    const intro = $('[data-gform-intro]', box);
    const frameWrap = $('[data-gform-frame]', box);
    formFrame.addEventListener('load', () => box.classList.add('is-loaded'));
    $('[data-form-inline]', box).addEventListener('click', () => {
      formFrame.src = formFrame.dataset.src;
      intro.hidden = true;
      frameWrap.hidden = false;
      box.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
  }

  /* ==========================================================================
     Página 404 — cordinha que acende o letreiro
     Dá para puxar (arrastando para baixo), clicar ou usar o teclado.
     ========================================================================== */
  const cord = $('[data-cord]');
  if (cord) {
    const status = $('[data-lost-status]');
    const PULL_MAX = 72;
    const PULL_TRIGGER = 36;
    let pull = 0;
    let swing = 0;
    let vPull = 0;
    let vSwing = 0;
    let raf = null;
    let grab = null;
    let dragged = false;

    const paint = () => {
      cord.style.setProperty('--pull', pull.toFixed(2));
      cord.style.setProperty('--swing', swing.toFixed(2));
    };
    // a cordinha volta ao lugar como uma mola, balançando um pouco
    const settle = () => {
      cancelAnimationFrame(raf);
      if (reduceMotion) {
        pull = 0;
        swing = 0;
        paint();
        return;
      }
      const step = () => {
        vPull = (vPull - pull * 0.16) * 0.76;
        vSwing = (vSwing - swing * 0.04) * 0.97;
        pull += vPull;
        swing += vSwing;
        paint();
        const moving = Math.abs(pull) + Math.abs(vPull) + Math.abs(swing) + Math.abs(vSwing) > 0.03;
        raf = moving ? requestAnimationFrame(step) : null;
      };
      raf = requestAnimationFrame(step);
    };
    const toggleLight = () => {
      const on = document.body.classList.toggle('is-lit');
      cord.setAttribute('aria-label', `Puxar a cordinha para ${on ? 'apagar' : 'acender'} a luz`);
      status.textContent = on ? 'Luz de volta' : 'Sem energia';
    };

    cord.addEventListener('pointerdown', (e) => {
      cancelAnimationFrame(raf);
      cord.setPointerCapture(e.pointerId);
      grab = { x: e.clientX, y: e.clientY };
      dragged = false;
      vPull = 0;
      vSwing = 0;
      cord.classList.add('is-held');
    });
    cord.addEventListener('pointermove', (e) => {
      if (!grab) return;
      const dx = e.clientX - grab.x;
      const dy = e.clientY - grab.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragged = true;
      pull = clamp(dy, 0, PULL_MAX);
      swing = clamp(dx * -0.2, -18, 18);
      paint();
    });
    const release = (e) => {
      if (!grab) return;
      grab = null;
      cord.classList.remove('is-held');
      if (e.type === 'pointerup' && pull >= PULL_TRIGGER) toggleLight();
      settle();
    };
    cord.addEventListener('pointerup', release);
    cord.addEventListener('pointercancel', release);
    // clique simples e teclado (detail === 0); depois de arrastar, o clique é ignorado
    cord.addEventListener('click', (e) => {
      if (dragged && e.detail) return;
      toggleLight();
      vPull = 12;
      vSwing = 1.4;
      settle();
    });

    // mostra o endereço que a pessoa tentou abrir (textContent: nunca vira HTML)
    const pathOut = $('[data-lost-path]');
    let asked = location.pathname;
    try { asked = decodeURI(asked); } catch { /* endereço malformado: mostra como veio */ }
    if (asked !== '/404.html') {
      $('code', pathOut).textContent = asked.length > 64 ? `${asked.slice(0, 63)}…` : asked;
      pathOut.hidden = false;
    }
  }

  /* ==========================================================================
     Geral
     ========================================================================== */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? `${btn.dataset.copyLabel} copiado ✓` : 'Não foi possível copiar');
      if (!ok) return;
      btn.classList.add('is-done');
      setTimeout(() => btn.classList.remove('is-done'), 1600);
    });
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  onScroll();
})();
