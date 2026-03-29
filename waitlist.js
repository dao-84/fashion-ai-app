(function () {
  'use strict';

  /* ── Translations ─────────────────────────────────────────── */
  var T = {
    it: {
      title: 'Entra nella lista d\'attesa',
      subtitle: 'Sii tra i primi ad accedere a Shotless.ai. Ti avviseremo non appena sarà disponibile.',
      name_ph: 'Il tuo nome (opzionale)',
      email_ph: 'La tua email *',
      submit: 'Unisciti alla lista',
      success_title: 'Sei nella lista!',
      success_msg: 'Ti contatteremo non appena Shotless.ai sarà disponibile.',
      err_email: 'Inserisci un indirizzo email valido.',
      err_generic: 'Qualcosa è andato storto. Riprova.',
    },
    en: {
      title: 'Join the waitlist',
      subtitle: 'Be among the first to access Shotless.ai. We\'ll notify you as soon as it\'s available.',
      name_ph: 'Your name (optional)',
      email_ph: 'Your email *',
      submit: 'Join the waitlist',
      success_title: 'You\'re on the list!',
      success_msg: 'We\'ll reach out as soon as Shotless.ai is available.',
      err_email: 'Please enter a valid email address.',
      err_generic: 'Something went wrong. Please try again.',
    },
    es: {
      title: 'Únete a la lista de espera',
      subtitle: 'Sé de los primeros en acceder a Shotless.ai. Te avisaremos en cuanto esté disponible.',
      name_ph: 'Tu nombre (opcional)',
      email_ph: 'Tu email *',
      submit: 'Unirme a la lista',
      success_title: '¡Ya estás en la lista!',
      success_msg: 'Te contactaremos en cuanto Shotless.ai esté disponible.',
      err_email: 'Por favor, introduce un email válido.',
      err_generic: 'Algo salió mal. Inténtalo de nuevo.',
    },
  };

  function getLang() {
    return localStorage.getItem('fashionai_lang') || 'it';
  }

  function t(key) {
    var lang = getLang();
    return (T[lang] && T[lang][key]) || T.it[key] || key;
  }

  /* ── CSS ──────────────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.wl-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s ease;}',
    '.wl-overlay.active{opacity:1;pointer-events:all;}',
    '.wl-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);}',
    '.wl-dialog{position:relative;z-index:1;background:#111;border:1px solid rgba(212,175,55,.2);border-radius:16px;padding:48px 40px 40px;width:100%;max-width:440px;margin:16px;box-shadow:0 24px 64px rgba(0,0,0,.6);}',
    '.wl-close{position:absolute;top:16px;right:20px;background:none;border:none;color:#888;font-size:26px;cursor:pointer;line-height:1;padding:4px 8px;transition:color .2s;}',
    '.wl-close:hover{color:#fff;}',
    '.wl-icon{font-size:28px;color:#d4af37;margin-bottom:16px;}',
    '.wl-title{font-size:22px;font-weight:700;color:#fff;margin:0 0 8px;letter-spacing:-.3px;}',
    '.wl-subtitle{font-size:14px;color:#aaa;margin:0 0 28px;line-height:1.6;}',
    '.wl-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:14px;padding:12px 16px;margin-bottom:12px;outline:none;box-sizing:border-box;transition:border-color .2s;font-family:inherit;}',
    '.wl-input::placeholder{color:rgba(255,255,255,.3);}',
    '.wl-input:focus{border-color:rgba(212,175,55,.5);}',
    '.wl-error{font-size:13px;color:#e05858;margin:-4px 0 12px;}',
    '.wl-submit{width:100%;background:linear-gradient(90deg,#d4af37,#b8962e);border:none;border-radius:8px;color:#000;font-size:15px;font-weight:700;padding:14px;cursor:pointer;margin-top:4px;transition:opacity .2s;font-family:inherit;letter-spacing:.3px;}',
    '.wl-submit:hover{opacity:.88;}',
    '.wl-submit:disabled{opacity:.5;cursor:not-allowed;}',
    '.wl-success{text-align:center;padding:16px 0 8px;}',
    '.wl-success-icon{font-size:48px;color:#d4af37;margin-bottom:20px;}',
    '@media(max-width:480px){.wl-dialog{padding:40px 24px 32px;}}',
  ].join('');
  document.head.appendChild(styleEl);

  /* ── HTML ─────────────────────────────────────────────────── */
  var modalEl = document.createElement('div');
  modalEl.id = 'waitlistModal';
  modalEl.className = 'wl-overlay';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.innerHTML =
    '<div class="wl-backdrop" id="wlBackdrop"></div>' +
    '<div class="wl-dialog">' +
      '<button class="wl-close" id="wlClose" aria-label="Chiudi">&times;</button>' +
      '<div id="wlFormState">' +
        '<div class="wl-icon">\u2736</div>' +
        '<h2 class="wl-title" id="wlTitle"></h2>' +
        '<p class="wl-subtitle" id="wlSubtitle"></p>' +
        '<form id="wlForm" novalidate>' +
          '<input type="text" id="wlName" class="wl-input" autocomplete="name">' +
          '<input type="email" id="wlEmail" class="wl-input" required autocomplete="email">' +
          '<p class="wl-error" id="wlError" style="display:none;"></p>' +
          '<button type="submit" class="wl-submit" id="wlSubmitBtn"></button>' +
        '</form>' +
      '</div>' +
      '<div id="wlSuccessState" class="wl-success" style="display:none;">' +
        '<div class="wl-success-icon">\u2713</div>' +
        '<h2 class="wl-title" id="wlSuccessTitle"></h2>' +
        '<p class="wl-subtitle" id="wlSuccessMsg"></p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modalEl);

  /* ── State ────────────────────────────────────────────────── */
  var currentSource = '';

  /* ── Helpers ──────────────────────────────────────────────── */
  function updateTexts() {
    document.getElementById('wlTitle').textContent = t('title');
    document.getElementById('wlSubtitle').textContent = t('subtitle');
    document.getElementById('wlName').placeholder = t('name_ph');
    document.getElementById('wlEmail').placeholder = t('email_ph');
    document.getElementById('wlSubmitBtn').textContent = t('submit');
    document.getElementById('wlSuccessTitle').textContent = t('success_title');
    document.getElementById('wlSuccessMsg').textContent = t('success_msg');
  }

  function openModal(source) {
    currentSource = source || '';
    updateTexts();
    document.getElementById('wlFormState').style.display = '';
    document.getElementById('wlSuccessState').style.display = 'none';
    document.getElementById('wlError').style.display = 'none';
    document.getElementById('wlError').textContent = '';
    document.getElementById('wlName').value = '';
    document.getElementById('wlEmail').value = '';
    document.getElementById('wlSubmitBtn').disabled = false;
    document.getElementById('wlSubmitBtn').textContent = t('submit');
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      document.getElementById('wlEmail').focus();
    }, 50);
  }

  function closeModal() {
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ── Events ───────────────────────────────────────────────── */
  document.getElementById('wlClose').addEventListener('click', closeModal);
  document.getElementById('wlBackdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalEl.classList.contains('active')) closeModal();
  });

  document.getElementById('wlForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('wlEmail').value.trim();
    var name = document.getElementById('wlName').value.trim();
    var errorEl = document.getElementById('wlError');
    var submitBtn = document.getElementById('wlSubmitBtn');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = t('err_email');
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: name,
        language: getLang(),
        source: currentSource,
      }),
    })
      .then(function (res) {
        if (res.ok) {
          document.getElementById('wlFormState').style.display = 'none';
          document.getElementById('wlSuccessState').style.display = '';
        } else {
          throw new Error('server');
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t('submit');
        errorEl.textContent = t('err_generic');
        errorEl.style.display = 'block';
      });
  });

  /* Update texts on language change */
  document.addEventListener('fashionai:langchange', updateTexts);

  /* ── Public API ───────────────────────────────────────────── */
  window.openWaitlistModal = openModal;
})();
