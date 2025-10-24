(() => {
    const eyes = [...document.querySelectorAll('.eye')];

    // Bail early for reduced motion users
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || eyes.length === 0) return;

    // Helper: move a single eye’s pupil toward the pointer, clamped to a radius
    function lookAt(eye, clientX, clientY){
    const rect = eye.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;

    // Max radius the pupil can travel from center (keeps it inside the white)
    const maxR = rect.width * 0.28; // tweak if you change sizes

    // Normalize and clamp displacement
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    const moveX = ux * Math.min(dist, maxR);
    const moveY = uy * Math.min(dist, maxR);

    const pupil = eye.querySelector('.pupil');
    pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    }

    function handlePoint(e){
    const isTouch = e.touches && e.touches[0];
    const x = isTouch ? e.touches[0].clientX : e.clientX;
    const y = isTouch ? e.touches[0].clientY : e.clientY;
    eyes.forEach(eye => lookAt(eye, x, y));
    }

    // Track both mouse and touch
    window.addEventListener('mousemove', handlePoint, { passive: true });
    window.addEventListener('touchmove', handlePoint, { passive: true });

    // On load, center pupils (already centered via CSS); optional nudge:
    const center = () => {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) / 2;
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) / 2;
    eyes.forEach(eye => lookAt(eye, vw, vh));
    };
    window.addEventListener('load', center);
    window.addEventListener('resize', center);
})();

document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section");
  const navLinks = document.querySelectorAll(".toc a");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute("id");
      const link = document.querySelector(`.toc a[href="#${id}"]`);
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, {
    rootMargin: "-50% 0px -50% 0px", // triggers around middle of viewport
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
});

// Right-rail notes
// --- helpers ---
const tocLinks = Array.from(document.querySelectorAll('.toc a'));           // your existing TOC links
const sections  = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const notes     = Array.from(document.querySelectorAll('.right .note'));

const noteFor   = key => notes.find(n => n.dataset.for === key);
const setActiveNote = (key) => {
  notes.forEach(n => n.classList.toggle('active', n.dataset.for === key));
};

// --- 1) Section observer (for TOC + fallback note) ---
const linkForId = id => tocLinks.find(a => a.getAttribute('href') === `#${id}`);

const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;

    // Highlight TOC
    tocLinks.forEach(a => a.classList.remove('active'));
    const link = linkForId(id);
    if (link) link.classList.add('active');

    // Fallback note (only if no waypoint has set one recently)
    if (!document.body.dataset.noteLocked) {
      const fallback = noteFor(id);
      if (fallback) setActiveNote(id);
    }
  });
}, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });

sections.forEach(s => sectionIO.observe(s));

// --- 2) Waypoint observer (overrides section note) ---
const waypoints = Array.from(document.querySelectorAll('[data-note-key]'));

let waypointTimer;
const unlockAfter = 300; // ms to let the waypoint animation settle

const waypointIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const key = entry.target.dataset.noteKey;
    const n = noteFor(key);
    if (!n) return;

    // Lock note selection briefly so section IO doesn't immediately override it
    document.body.dataset.noteLocked = '1';
    clearTimeout(waypointTimer);
    setActiveNote(key);
    waypointTimer = setTimeout(() => {
      delete document.body.dataset.noteLocked;
    }, unlockAfter);
  });
}, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });

waypoints.forEach(wp => waypointIO.observe(wp));

// On load: show first reasonable note
const initialKey = (waypoints[0] && waypoints[0].dataset.noteKey) || (sections[0] && sections[0].id);
if (initialKey && noteFor(initialKey)) setActiveNote(initialKey);

// Scroll reveal
(() => {
  const revealables = Array.from(document.querySelectorAll('[data-reveal]'));
  const staggers = Array.from(document.querySelectorAll('[data-stagger]'));

  // assign stagger indices so CSS can compute delays
  staggers.forEach(group => {
    Array.from(group.children).forEach((el, i) => {
      el.style.setProperty('--i', i);
    });
  });

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      obs.unobserve(el); // reveal once
    });
  }, {
    // trigger when element enters ~35% from top until ~15% from bottom
    rootMargin: '-35% 0px -15% 0px',
    threshold: 0
  });

  revealables.forEach(el => io.observe(el));
})();
