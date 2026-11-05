function openLightbox(el) {
  const img = el.querySelector('img');
  document.getElementById('lightbox-img').src = img.src;
  document.getElementById('lightbox-img').alt = img.alt;
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-links');
if (navToggle && navMenu) {
  const setNav = (open) => {
    navMenu.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  };
  navToggle.addEventListener('click', () => {
    setNav(!navMenu.classList.contains('open'));
  });
  // Close the menu after tapping a link
  navMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setNav(false));
  });
}

// Reset video to its poster once it finishes playing
document.querySelectorAll('#quienes-somos video').forEach(v => {
  v.addEventListener('ended', () => v.load());
});

// Aparición al hacer scroll: añade .is-visible a los elementos .reveal
// cuando asoman en pantalla. Si el sistema pide menos movimiento, se
// marcan todos como visibles de entrada y no se observa nada.
const revealEls = document.querySelectorAll('.reveal');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealEls.forEach(el => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target); // una sola vez: no reaparece al volver
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
}

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = a.getAttribute('href') === '#' + entry.target.id
          ? '#FFBD59' : '';
      });
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => observer.observe(s));
