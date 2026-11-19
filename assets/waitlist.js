const waitlist = document.querySelector('#lista-form');
const formFields = waitlist.querySelector('fieldset');
const submit = waitlist.querySelector('button[type="submit"]');
const feedback = document.querySelector('#lista-status');
const sessionKey = 'saifen:waitlist-submitted';

function submittedInSession() {
  try {
    return sessionStorage.getItem(sessionKey) === '1';
  } catch {
    return false;
  }
}

function showConfirmation() {
  waitlist.reset();
  submit.disabled = true;
  formFields.disabled = true;
  formFields.hidden = true;
  feedback.textContent = 'Sua inscrição foi recebida. Avisaremos quando a Saifen estiver disponível.';
}

if (submittedInSession()) {
  showConfirmation();
} else if (waitlist.elements.access_key.value) {
  submit.disabled = false;
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted && submittedInSession()) showConfirmation();
});

waitlist.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submit.disabled) return;

  const fields = new FormData(waitlist);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  submit.disabled = true;
  feedback.textContent = 'Enviando sua inscrição…';

  try {
    const response = await fetch(waitlist.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fields,
      signal: controller.signal,
    });
    if (!response.ok || (await response.json()).success !== true) {
      throw new Error('Inscrição recusada');
    }

    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // A página atual mantém o bloqueio se o navegador impedir a gravação.
    }
    showConfirmation();
  } catch {
    feedback.textContent = 'Não conseguimos enviar sua inscrição. Tente novamente.';
    submit.disabled = false;
  } finally {
    clearTimeout(timeout);
  }
});
