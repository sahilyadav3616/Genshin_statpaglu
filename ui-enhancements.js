/* Lightweight StatPaglu interactions inspired by modern component libraries.
 * No new runtime dependencies; graceful fallback for touch and reduced-motion users.
 */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function enhanceCards() {
    const cards = document.querySelectorAll('.build-card');
    cards.forEach((card, index) => {
      card.style.setProperty('--card-order', String(Math.min(index, 8)));
      card.dataset.tilt = finePointer && !reduceMotion ? 'on' : 'off';
      if (card.dataset.polished === 'true') return;
      card.dataset.polished = 'true';
      if (!finePointer || reduceMotion) return;
      let frame = 0;
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        card.style.setProperty('--pointer-x', (x / rect.width * 100) + '%');
        card.style.setProperty('--pointer-y', (y / rect.height * 100) + '%');
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rx = ((y / rect.height) - .5) * -2.2;
          const ry = ((x / rect.width) - .5) * 2.2;
          card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-3px)';
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        card.style.transform = '';
      }, { passive: true });
    });
  }

  function addLoadingFeedback() {
    const form = document.querySelector('#uidForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !button || form.dataset.loadingPolished) return;
    form.dataset.loadingPolished = 'true';
    form.addEventListener('submit', () => {
      const input = form.querySelector('input');
      if (!input || !/^\d{9,10}$/.test(input.value.trim())) return;
      button.setAttribute('aria-busy', 'true');
      button.dataset.originalLabel = button.childNodes[0]?.textContent?.trim() || 'LOAD PROFILE';
      const label = button.childNodes[0];
      if (label) label.textContent = 'LOADING PROFILE ';
      window.setTimeout(() => {
        button.removeAttribute('aria-busy');
        if (label && button.isConnected) label.textContent = button.dataset.originalLabel || 'LOAD PROFILE';
      }, 12000);
    });
  }

  function observeRoster() {
    const roster = document.querySelector('#roster');
    if (!roster || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(() => enhanceCards());
    observer.observe(roster, { childList: true, subtree: true });
    enhanceCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { observeRoster(); addLoadingFeedback(); });
  } else {
    observeRoster();
    addLoadingFeedback();
  }
})();
