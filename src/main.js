import './css/layout.css'

// Scroll-based section highlighting
document.addEventListener('DOMContentLoaded', () => {
  const introSection = document.getElementById('intro');
  const workSection = document.getElementById('work');
  
  if (!introSection || !workSection) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Update the URL hash to trigger CSS highlighting via :has(:target)
          // Use replaceState to avoid cluttering browser history
          const hash = `#${entry.target.id}`;
          window.history.replaceState(null, '', hash);
        }
      });
    },
    {
      threshold: 0.3, // Trigger when 30% of section is visible
    }
  );

  observer.observe(introSection);
  observer.observe(workSection);
});

