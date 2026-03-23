(function () {
  if (window.__betaGuardClientInstalled) return;
  window.__betaGuardClientInstalled = true;

  var origFetch = window.fetch.bind(window);
  var modalElements = null;
  var pendingTokenRequest = null;

  function ensureStyles() {
    if (document.getElementById('betaGuardModalStyles')) return;
    var style = document.createElement('style');
    style.id = 'betaGuardModalStyles';
    style.textContent =
      '.beta-guard-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.72);z-index:20000;backdrop-filter:blur(10px);}' +
      '.beta-guard-modal.is-open{display:flex;}' +
      '.beta-guard-modal__panel{width:min(460px,100%);background:linear-gradient(180deg,rgba(15,15,18,.98),rgba(10,10,12,.98));border:1px solid rgba(212,175,55,.24);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:24px;color:#f4f0e6;font-family:inherit;}' +
      '.beta-guard-modal__eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(212,175,55,.78);margin-bottom:10px;}' +
      '.beta-guard-modal__title{margin:0 0 10px;font-size:28px;line-height:1.05;}' +
      '.beta-guard-modal__copy{margin:0 0 18px;color:rgba(255,255,255,.72);line-height:1.5;font-size:14px;}' +
      '.beta-guard-modal__field{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}' +
      '.beta-guard-modal__label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7);}' +
      '.beta-guard-modal__input{width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(212,175,55,.24);background:rgba(255,255,255,.04);color:#fff;font-size:15px;outline:none;box-sizing:border-box;}' +
      '.beta-guard-modal__input:focus{border-color:rgba(212,175,55,.58);box-shadow:0 0 0 3px rgba(212,175,55,.12);}' +
      '.beta-guard-modal__status{min-height:20px;margin:8px 0 0;color:#f3c969;font-size:13px;}' +
      '.beta-guard-modal__status.is-error{color:#ff8f8f;}' +
      '.beta-guard-modal__actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;}' +
      '.beta-guard-modal__button{border:0;border-radius:999px;padding:11px 18px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;}' +
      '.beta-guard-modal__button--ghost{background:rgba(255,255,255,.06);color:#fff;}' +
      '.beta-guard-modal__button--primary{background:linear-gradient(135deg,#d4af37,#f6dd8a);color:#141414;font-weight:700;}' +
      '.beta-guard-modal__hint{margin-top:16px;color:rgba(255,255,255,.52);font-size:12px;line-height:1.5;}';
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (modalElements) return modalElements;
    ensureStyles();

    var overlay = document.createElement('div');
    overlay.className = 'beta-guard-modal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="beta-guard-modal__panel" role="dialog" aria-modal="true" aria-labelledby="betaGuardTitle">' +
      '<div class="beta-guard-modal__eyebrow">Beta Access</div>' +
      '<h2 class="beta-guard-modal__title" id="betaGuardTitle">Sblocca le funzioni protette</h2>' +
      '<p class="beta-guard-modal__copy">Inserisci il token beta per autorizzare le chiamate API e usare gallery e generate.</p>' +
      '<label class="beta-guard-modal__field">' +
      '<span class="beta-guard-modal__label">Beta Token</span>' +
      '<input class="beta-guard-modal__input" id="betaGuardInput" type="password" autocomplete="off" placeholder="Inserisci il token">' +
      '</label>' +
      '<div class="beta-guard-modal__status" id="betaGuardStatus"></div>' +
      '<div class="beta-guard-modal__actions">' +
      '<button type="button" class="beta-guard-modal__button beta-guard-modal__button--ghost" id="betaGuardCancel">Chiudi</button>' +
      '<button type="button" class="beta-guard-modal__button beta-guard-modal__button--primary" id="betaGuardSave">Entra</button>' +
      '</div>' +
      '<div class="beta-guard-modal__hint">Il token viene salvato nella sessione corrente del browser.</div>' +
      '</div>';

    document.body.appendChild(overlay);

    modalElements = {
      overlay: overlay,
      input: overlay.querySelector('#betaGuardInput'),
      status: overlay.querySelector('#betaGuardStatus'),
      save: overlay.querySelector('#betaGuardSave'),
      cancel: overlay.querySelector('#betaGuardCancel'),
    };

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeModal();
      }
    });

    modalElements.cancel.addEventListener('click', function () {
      if (pendingTokenRequest) {
        pendingTokenRequest.reject(new Error('Beta access denied'));
        pendingTokenRequest = null;
        renderBetaDenied();
      }
      closeModal();
    });

    modalElements.input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        modalElements.save.click();
      }
      if (event.key === 'Escape') {
        if (pendingTokenRequest) {
          pendingTokenRequest.reject(new Error('Beta access denied'));
          pendingTokenRequest = null;
          renderBetaDenied();
        }
        closeModal();
      }
    });

    modalElements.save.addEventListener('click', function () {
      var token = (modalElements.input.value || '').trim();
      if (!token) {
        setStatus('Inserisci un token valido.', true);
        return;
      }

      storeToken(token);
      if (pendingTokenRequest) {
        pendingTokenRequest.resolve(token);
        pendingTokenRequest = null;
      }
      closeModal();
    });

    return modalElements;
  }

  function setStatus(message, isError) {
    var modal = ensureModal();
    modal.status.textContent = message || '';
    modal.status.classList.toggle('is-error', !!isError);
  }

  function openModal() {
    var modal = ensureModal();
    modal.input.value = getStoredToken();
    setStatus('');
    modal.overlay.classList.add('is-open');
    modal.overlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () {
      modal.input.focus();
      modal.input.select();
    }, 0);
  }

  function closeModal() {
    if (!modalElements) return;
    modalElements.overlay.classList.remove('is-open');
    modalElements.overlay.setAttribute('aria-hidden', 'true');
    setStatus('');
  }

  function renderBetaDenied() {
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;">' +
      '<p style="color:#fff;font-family:sans-serif;font-size:18px;letter-spacing:2px;">Accesso non autorizzato.</p>' +
      '</div>';
  }

  function getStoredToken() {
    return sessionStorage.getItem('beta_token') || '';
  }

  function storeToken(token) {
    sessionStorage.setItem('beta_token', token);
  }

  function clearToken() {
    sessionStorage.removeItem('beta_token');
  }

  function requestBetaToken() {
    var stored = getStoredToken();
    if (stored) return Promise.resolve(stored);

    return new Promise(function (resolve, reject) {
      ensureModal();
      pendingTokenRequest = { resolve: resolve, reject: reject };
      openModal();
    });
  }

  function isApiRequest(url) {
    try {
      if (typeof url === 'string') {
        return new URL(url, window.location.origin).pathname.indexOf('/api/') === 0;
      }
      if (url && typeof url.url === 'string') {
        return new URL(url.url, window.location.origin).pathname.indexOf('/api/') === 0;
      }
    } catch (_err) {
      return false;
    }
    return false;
  }

  function attempt(url, opts, token) {
    var requestOpts = Object.assign({}, opts || {});
    requestOpts.headers = Object.assign({}, (opts && opts.headers) || {});
    if (token) {
      requestOpts.headers.Authorization = 'Bearer ' + token;
    }
    return origFetch(url, requestOpts);
  }

  window.fetch = function (url, opts) {
    if (!isApiRequest(url)) {
      return origFetch(url, opts);
    }

    return attempt(url, opts, getStoredToken()).then(function (response) {
      if (response.status !== 401) {
        return response;
      }

      clearToken();
      return requestBetaToken().then(function (token) {
        return attempt(url, opts, token);
      });
    });
  };

  function isSignupLink(link) {
    if (!link || !link.getAttribute) return false;
    var rawHref = link.getAttribute('href') || '';
    if (rawHref === '#signup' || rawHref === 'index.html#signup') {
      return true;
    }

    try {
      var resolved = new URL(link.href, window.location.origin);
      return resolved.hash === '#signup';
    } catch (_err) {
      return false;
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!isSignupLink(link)) return;
    event.preventDefault();
    openModal();
  });

  window.openBetaAccessModal = openModal;
})();
