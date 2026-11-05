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

// Carrusel de la galería: las flechas desplazan la pista un "paso",
// que es el ancho de una foto más el espacio entre ellas. El deslizado
// con el dedo o el trackpad funciona solo, sin JS.
document.querySelectorAll('.carousel').forEach(car => {
  const pista = car.querySelector('.gallery-grid');
  const prev = car.querySelector('.carousel-prev');
  const next = car.querySelector('.carousel-next');
  if (!pista || !prev || !next) return;

  // El ancho de una diapositiva se deduce del total de la pista dividido
  // por el número de fotos: medir la primera da valores erráticos mientras
  // la sección se está abriendo y la grilla aún no asienta sus tamaños.
  const paso = () => {
    const n = pista.querySelectorAll('.gallery-item').length;
    if (!n) return pista.clientWidth;
    return pista.scrollWidth / n;
  };

  const actualizar = () => {
    const max = pista.scrollWidth - pista.clientWidth - 2;
    prev.disabled = pista.scrollLeft <= 2;
    next.disabled = pista.scrollLeft >= max;
  };

  prev.addEventListener('click', () => pista.scrollBy({ left: -paso(), behavior: 'smooth' }));
  next.addEventListener('click', () => pista.scrollBy({ left: paso(), behavior: 'smooth' }));
  pista.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  // La galería arranca colapsada: al abrirla cambian los anchos
  new ResizeObserver(actualizar).observe(pista);
  actualizar();
});

// Secciones plegables: el h2 es un botón que abre y cierra su .section-body.
// El contenido sigue en el DOM aunque esté cerrado (buscadores y Ctrl+F lo
// ven); solo cambia el alto. Al abrir, se marcan visibles los .reveal de
// dentro, porque el observador no los detecta mientras están colapsados.
document.querySelectorAll('.section-toggle').forEach(btn => {
  const body = document.getElementById(btn.getAttribute('aria-controls'));
  if (!body) return;
  btn.addEventListener('click', () => {
    const abrir = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(abrir));
    body.classList.toggle('is-open', abrir);
    if (abrir) {
      body.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }
  });
});

// Un enlace del menú hacia una sección cerrada la abre antes de saltar
document.querySelectorAll('.nav-links a[href^="#"], a.hero-cta[href^="#"]').forEach(a => {
  a.addEventListener('click', () => {
    const destino = document.querySelector(a.getAttribute('href'));
    const btn = destino && destino.querySelector('.section-toggle');
    if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
  });
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
