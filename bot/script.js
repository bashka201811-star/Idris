const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 }
);

document
  .querySelectorAll(".feature, .step, .final-cta h2, .final-cta p, .final-cta .btn")
  .forEach((el) => observer.observe(el));
