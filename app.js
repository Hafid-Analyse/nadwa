// دوال مشتركة بين كل الصفحات
(function () {
  const C = window.NADWA_CONFIG;

  // استدعاء دالة في Supabase
  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: C.SUPABASE_KEY };
    // المفتاح القديم (anon JWT) يُرسل أيضًا في Authorization؛ المفتاح الجديد sb_publishable لا
    if (C.SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + C.SUPABASE_KEY;
    let res;
    try {
      res = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers, body: JSON.stringify(args || {}),
      });
    } catch (e) {
      throw new Error('تعذّر الاتصال، تحقق من الإنترنت');
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      const msg = (data && data.message) || 'حدث خطأ، أعد المحاولة';
      const err = new Error(msg); err.status = res.status; throw err;
    }
    // دوال المنشّط تُرجع {error: "..."} عند خطأ الرمز
    if (data && !Array.isArray(data) && typeof data === 'object' && data.error) {
      const err = new Error(data.error); err.pin = true; throw err;
    }
    return data;
  }

  // معرّف ثابت لكل جهاز (لمنع الإعجاب المكرر)
  function deviceId() {
    let id = store.get('nadwa_device');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      store.set('nadwa_device', id);
    }
    return id;
  }

  // تخزين محلي آمن (لا ينكسر إن كان معطّلًا)
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (_) { delete mem[k]; } },
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return mem['s_' + k] ?? null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) { mem['s_' + k] = v; } },
    del(k) { try { sessionStorage.removeItem(k); } catch (_) { delete mem['s_' + k]; } },
  };

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------------- الوضع الليلي / النهاري ----------------
  // الأولوية: ?theme= في الرابط ← اختيار هذا الجهاز ← إعداد الندوة ← ليلي
  let lastEv = null;
  function pickTheme(evTheme) {
    let t = null;
    try { t = new URLSearchParams(location.search).get('theme'); } catch (_) {}
    t = t || store.get('nadwa_theme') || evTheme || 'dark';
    if (t === 'auto') t = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    return t === 'light' ? 'light' : 'dark';
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = t === 'light' ? '#ffffff' : '#0b1418';
    paintLogos();
  }
  function paintLogos() {
    const light = document.documentElement.dataset.theme === 'light';
    const def = light ? (C.DEFAULT_LOGO_LIGHT || C.DEFAULT_LOGO) : C.DEFAULT_LOGO;
    const logo = (lastEv && lastEv.logo_url) || def || '';
    document.querySelectorAll('[data-logo]').forEach(img => {
      if (logo) { if (img.getAttribute('src') !== logo) img.src = logo; img.hidden = false; } else img.hidden = true;
    });
    document.querySelectorAll('[data-emblem]').forEach(img => { img.src = 'assets/istiqama-emblem.svg'; });
  }
  // زر صغير يبدّل الوضع على هذا الجهاز فقط
  function themeButton() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'theme-btn'; b.title = 'تبديل الوضع الليلي/النهاري'; b.setAttribute('aria-label', b.title);
    b.innerHTML = '<svg class="moon" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>' +
      '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    b.onclick = () => {
      const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      store.set('nadwa_theme', t); setTheme(t);
    };
    return b;
  }

  // تطبيق إعدادات مظهر الندوة: الوضع، اللون، الشعار
  function applyTheme(ev) {
    if (!ev) return;
    lastEv = ev;
    const root = document.documentElement.style;
    let acc = (ev.accent || '').toLowerCase();
    if (['#0f766e', '#19e3c0', '#0c9e85'].includes(acc)) acc = '';   // الألوان الافتراضية ← لون كل وضع
    if (/^#[0-9a-f]{6}$/i.test(acc)) {
      root.setProperty('--accent', acc);
      const n = parseInt(acc.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      root.setProperty('--on-accent', lum > 0.55 ? '#04201b' : '#ffffff');
    } else { root.removeProperty('--accent'); root.removeProperty('--on-accent'); }
    setTheme(pickTheme(ev.theme));
  }

  function initials(name) {
    const p = String(name || '').replace(/^(د|أ|ش|م)\.\s*/, '').trim().split(/\s+/);
    return (p[0] || '').charAt(0);
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('ar-DZ-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) { return d; }
  }

  let toastTimer;
  function toast(msg, kind) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show ' + (kind || '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3200);
  }

  // رابط صفحة الحاضرين (نفس المجلد)
  function attendeeUrl() {
    const u = new URL('./', location.href);
    return u.href;
  }

  // تحريك ناعم عند تغيّر ترتيب العناصر (FLIP)
  function flip(container, renderFn) {
    const before = new Map();
    container.querySelectorAll('[data-id]').forEach(el => before.set(el.dataset.id, el.getBoundingClientRect().top));
    renderFn();
    container.querySelectorAll('[data-id]').forEach(el => {
      const old = before.get(el.dataset.id);
      if (old === undefined) { el.classList.add('enter'); return; }
      const dy = old - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 2) {
        el.style.transform = `translateY(${dy}px)`; el.style.transition = 'none';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)'; el.style.transform = '';
        }));
      }
    });
  }

  // تسجيل دخول المنشّط (الرمز يبقى في هذه النافذة فقط)
  function adminGate(onReady) {
    const gate = document.getElementById('gate');
    const form = gate.querySelector('form');
    const input = gate.querySelector('input');
    async function tryPin(pin, silent) {
      try {
        await rpc('admin_login', { p_pin: pin });
        session.set('nadwa_pin', pin);
        gate.hidden = true;
        onReady(pin);
      } catch (e) {
        session.del('nadwa_pin');
        gate.hidden = false;
        if (!silent) toast(e.message, 'err');
      }
    }
    form.addEventListener('submit', ev => { ev.preventDefault(); tryPin(input.value.trim(), false); });
    const saved = session.get('nadwa_pin');
    if (saved) tryPin(saved, true); else { gate.hidden = false; input.focus(); }
  }

  // رسم رمز QR داخل عنصر (يعمل دون إنترنت خارجي — المكتبة في lib/qrcode.js)
  function drawQr(el, text, px) {
    if (!window.qrcode) return null;
    const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), margin = 2, scale = Math.max(4, Math.floor(px / (n + margin * 2)));
    const size = (n + margin * 2) * scale;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++)
      if (qr.isDark(r, k)) g.fillRect((k + margin) * scale, (r + margin) * scale, scale, scale);
    el.innerHTML = ''; el.appendChild(c);
    return c;
  }

  setTheme(pickTheme(null));

  const STATUS_LABEL = { pending: 'بانتظار المراجعة', approved: 'معروض', answered: 'تمت الإجابة', hidden: 'مخفي' };

  window.Nadwa = { rpc, drawQr, setTheme, pickTheme, themeButton, initials, deviceId, store, session, esc, applyTheme, formatDate, toast, attendeeUrl, flip, adminGate, STATUS_LABEL, C };
})();
