let loadPromise = null;

export function loadRecaptcha() {
  if (window.grecaptcha && window.grecaptcha.execute) {
    return Promise.resolve(window.grecaptcha);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    const existing = document.querySelector('script[data-recaptcha-loader]');

    if (existing) {
      window.grecaptcha?.ready(() => resolve(window.grecaptcha));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaLoader = "true";

    script.onload = () => {
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("reCAPTCHA not loaded. Please refresh the page and try again."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function getRecaptchaToken(action) {
  const grecaptcha = await loadRecaptcha();
  return grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_SITE_KEY, { action });
}
