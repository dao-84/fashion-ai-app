(function () {
  if (window.__authClientInstalled) return;
  window.__authClientInstalled = true;

  var origFetch = window.fetch.bind(window);
  var modalElements = null;
  var pendingAuthRequest = null;
  var activeTab = 'login';

  /* ── Token ─────────────────────────────────────────────────── */
  function getToken() { return localStorage.getItem('auth_token') || ''; }
  function storeToken(token) { localStorage.setItem('auth_token', token); }
  function storeUser(user) { localStorage.setItem('auth_user', JSON.stringify(user)); }
  function clearAuth() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch (_) { return null; }
  }

  /* ── Stili ──────────────────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById('authModalStyles')) return;
    var s = document.createElement('style');
    s.id = 'authModalStyles';
    s.textContent =
      '.auth-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.76);z-index:20000;backdrop-filter:blur(10px);}' +
      '.auth-modal.is-open{display:flex;}' +
      '.auth-modal__panel{width:min(420px,100%);background:linear-gradient(180deg,rgba(15,15,18,.98),rgba(10,10,12,.98));border:1px solid rgba(212,175,55,.24);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:32px;color:#f4f0e6;font-family:inherit;}' +
      '.auth-modal__logo{font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:rgba(212,175,55,.78);}' +
      '.auth-modal__tabs{display:flex;gap:4px;background:rgba(255,255,255,.05);border-radius:12px;padding:4px;margin-bottom:24px;}' +
      '.auth-modal__tab{flex:1;padding:9px;border:0;border-radius:9px;background:transparent;color:rgba(255,255,255,.55);font-size:13px;letter-spacing:.06em;cursor:pointer;transition:.18s;}' +
      '.auth-modal__tab.is-active{background:rgba(212,175,55,.18);color:#f4f0e6;font-weight:600;}' +
      '.auth-modal__field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}' +
      '.auth-modal__label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6);}' +
      '.auth-modal__input{width:100%;padding:13px 16px;border-radius:12px;border:1px solid rgba(212,175,55,.22);background:rgba(255,255,255,.04);color:#fff;font-size:15px;outline:none;box-sizing:border-box;}' +
      '.auth-modal__input:focus{border-color:rgba(212,175,55,.55);box-shadow:0 0 0 3px rgba(212,175,55,.1);}' +
      '.auth-modal__status{min-height:18px;margin:4px 0 10px;font-size:13px;color:#f3c969;}' +
      '.auth-modal__status.is-error{color:#ff8f8f;}' +
      '.auth-modal__btn{width:100%;border:0;border-radius:999px;padding:13px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-weight:700;background:linear-gradient(135deg,#d4af37,#f6dd8a);color:#141414;margin-top:4px;}' +
      '.auth-modal__btn:disabled{opacity:.5;cursor:not-allowed;}' +
      '.auth-modal__footer{margin-top:18px;color:rgba(255,255,255,.4);font-size:12px;text-align:center;line-height:1.6;}' +
      '.auth-modal__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}' +
      '.auth-modal__logo{font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:rgba(212,175,55,.78);margin-bottom:0;}' +
      '.auth-modal__close{background:none;border:0;color:rgba(255,255,255,.4);font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:6px;transition:.18s;}' +
      '.auth-modal__close:hover{color:#fff;background:rgba(255,255,255,.08);}';
    document.head.appendChild(s);
  }

  /* ── Modal ──────────────────────────────────────────────────── */
  function ensureModal() {
    if (modalElements) return modalElements;
    ensureStyles();

    var overlay = document.createElement('div');
    overlay.className = 'auth-modal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="auth-modal__panel" role="dialog" aria-modal="true">' +
      '<div class="auth-modal__header">' +
      '<div class="auth-modal__logo">Shotless.ai</div>' +
      '<button type="button" class="auth-modal__close" id="authClose" aria-label="Chiudi">&times;</button>' +
      '</div>' +
      '<div class="auth-modal__tabs">' +
      '<button type="button" class="auth-modal__tab is-active" id="authTabLogin">Accedi</button>' +
      '<button type="button" class="auth-modal__tab" id="authTabRegister">Registrati</button>' +
      '</div>' +
      '<div class="auth-modal__field">' +
      '<label class="auth-modal__label" for="authEmail">Email</label>' +
      '<input class="auth-modal__input" id="authEmail" type="email" autocomplete="email" placeholder="la@tua.email">' +
      '</div>' +
      '<div class="auth-modal__field">' +
      '<label class="auth-modal__label" for="authPassword">Password</label>' +
      '<input class="auth-modal__input" id="authPassword" type="password" autocomplete="current-password" placeholder="••••••••">' +
      '</div>' +
      '<div class="auth-modal__status" id="authStatus"></div>' +
      '<button type="button" class="auth-modal__btn" id="authSubmit">Accedi</button>' +
      '<div class="auth-modal__footer" id="authFooter">Nuovo utente? Clicca su <strong>Registrati</strong>.</div>' +
      '</div>';

    document.body.appendChild(overlay);

    modalElements = {
      overlay: overlay,
      email: overlay.querySelector('#authEmail'),
      password: overlay.querySelector('#authPassword'),
      status: overlay.querySelector('#authStatus'),
      submit: overlay.querySelector('#authSubmit'),
      footer: overlay.querySelector('#authFooter'),
      tabLogin: overlay.querySelector('#authTabLogin'),
      tabRegister: overlay.querySelector('#authTabRegister'),
      close: overlay.querySelector('#authClose'),
    };

    modalElements.close.addEventListener('click', closeModal);
    modalElements.tabLogin.addEventListener('click', function () { setTab('login'); });
    modalElements.tabRegister.addEventListener('click', function () { setTab('register'); });

    modalElements.password.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); modalElements.submit.click(); }
    });

    modalElements.submit.addEventListener('click', handleSubmit);

    return modalElements;
  }

  function setTab(tab) {
    activeTab = tab;
    var m = ensureModal();
    m.tabLogin.classList.toggle('is-active', tab === 'login');
    m.tabRegister.classList.toggle('is-active', tab === 'register');
    m.submit.textContent = tab === 'login' ? 'Accedi' : 'Crea account';
    m.footer.innerHTML = tab === 'login'
      ? 'Nuovo utente? Clicca su <strong>Registrati</strong>.'
      : 'Hai già un account? Clicca su <strong>Accedi</strong>.';
    setStatus('', false);
  }

  function setStatus(msg, isError) {
    var m = ensureModal();
    m.status.textContent = msg || '';
    m.status.classList.toggle('is-error', !!isError);
  }

  function openModal(tab) {
    var m = ensureModal();
    setTab(tab || 'login');
    m.overlay.classList.add('is-open');
    m.overlay.setAttribute('aria-hidden', 'false');
    setTimeout(function () { m.email.focus(); }, 50);
  }

  function closeModal() {
    if (!modalElements) return;
    modalElements.overlay.classList.remove('is-open');
    modalElements.overlay.setAttribute('aria-hidden', 'true');
    setStatus('', false);
  }

  /* ── Chiamate API ───────────────────────────────────────────── */
  function apiCall(endpoint, body) {
    return origFetch('/api/auth/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function handleSubmit() {
    var m = ensureModal();
    var email = (m.email.value || '').trim();
    var password = m.password.value || '';

    if (!email || !password) { setStatus('Inserisci email e password.', true); return; }

    m.submit.disabled = true;
    setStatus('Attendere...', false);

    var endpoint = activeTab === 'register' ? 'register' : 'login';
    apiCall(endpoint, { email: email, password: password })
      .then(function (result) {
        m.submit.disabled = false;
        if (!result.ok) {
          setStatus(result.data.error || 'Errore. Riprova.', true);
          return;
        }
        // Registrazione: email di verifica inviata
        if (result.data.emailSent) {
          setTab('login');
          m.email.value = email;
          m.password.value = '';
          setStatus('✓ Controlla la tua email per confermare l\'account.', false);
          return;
        }
        storeToken(result.data.token);
        storeUser(result.data.user);
        setStatus('', false);
        closeModal();
        updateNavbar();
        if (pendingAuthRequest) {
          pendingAuthRequest.resolve(result.data.token);
          pendingAuthRequest = null;
        }
      })
      .catch(function () {
        m.submit.disabled = false;
        setStatus('Errore di rete. Riprova.', true);
      });
  }

  /* ── Richiedi autenticazione ────────────────────────────────── */
  function requestAuth(tab) {
    var token = getToken();
    if (token) return Promise.resolve(token);
    return new Promise(function (resolve, reject) {
      pendingAuthRequest = { resolve: resolve, reject: reject };
      openModal(tab || 'login');
    });
  }

  /* ── Navbar ─────────────────────────────────────────────────── */
  function updateNavbar() {
    var user = getUser();
    var links = document.querySelectorAll('[data-auth-link]');
    links.forEach(function (el) {
      if (user) {
        el.textContent = user.email.split('@')[0];
        el.href = 'profile.html';
        el.onclick = null;
      } else {
        el.textContent = el.getAttribute('data-auth-default') || 'Accedi';
        el.href = '#';
        el.onclick = function (e) { e.preventDefault(); openModal('login'); };
      }
    });
  }

  /* ── Logout ─────────────────────────────────────────────────── */
  function authLogout() {
    clearAuth();
    updateNavbar();
    window.location.href = 'index.html';
  }

  /* ── Fetch interceptor ──────────────────────────────────────── */
  function isApiRequest(url) {
    try {
      var pathname = typeof url === 'string'
        ? new URL(url, window.location.origin).pathname
        : new URL(url.url, window.location.origin).pathname;
      return pathname.indexOf('/api/') === 0;
    } catch (_) { return false; }
  }

  function attempt(url, opts, token) {
    var o = Object.assign({}, opts || {});
    o.headers = Object.assign({}, (opts && opts.headers) || {});
    if (token) o.headers.Authorization = 'Bearer ' + token;
    return origFetch(url, o);
  }

  window.fetch = function (url, opts) {
    if (!isApiRequest(url)) return origFetch(url, opts);
    var token = getToken();
    return attempt(url, opts, token).then(function (response) {
      if (response.status !== 401) return response;
      clearAuth();
      return requestAuth('login').then(function (t) { return attempt(url, opts, t); });
    });
  };

  /* ── Protezione studio ──────────────────────────────────────── */
  var onStudioPage = window.location.pathname === '/studio.html' ||
    window.location.pathname.endsWith('/studio.html');

  if (onStudioPage && !getToken()) {
    requestAuth('login').catch(function () {
      window.location.href = 'index.html';
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!link) return;
    var rawHref = link.getAttribute('href') || '';
    var isStudio = rawHref === 'studio.html' ||
      (function () { try { return new URL(link.href, window.location.origin).pathname === '/studio.html'; } catch (_) { return false; } }());
    if (!isStudio) return;
    event.preventDefault();
    if (getToken()) { window.location.href = 'studio.html'; return; }
    requestAuth('login')
      .then(function () { window.location.href = 'studio.html'; })
      .catch(function () { window.location.href = 'index.html'; });
  });

  /* ── API pubblica ───────────────────────────────────────────── */
  window.openAuthModal = openModal;
  window.authLogout = authLogout;
  window.getAuthUser = getUser;

  /* ── Init ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavbar);
  } else {
    updateNavbar();
  }
})();
