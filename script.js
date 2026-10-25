/**
 * script.js
 */
document.addEventListener('DOMContentLoaded', () => {

    // Dark Mode Toggle Functionality
    const themeToggleBtn = document.getElementById('theme-toggle');
    const bodyElement = document.body;

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        bodyElement.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '☀️ Light Mode';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDarkMode = bodyElement.getAttribute('data-theme') === 'dark';

            if (isDarkMode) {
                bodyElement.removeAttribute('data-theme');
                themeToggleBtn.innerHTML = '🌙 Dark Mode';
                localStorage.setItem('theme', 'light');
            } else {
                bodyElement.setAttribute('data-theme', 'dark');
                themeToggleBtn.innerHTML = '☀️ Light Mode';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Scroll Animation for Cards
    const cards = document.querySelectorAll('.custom-card');

    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const cardObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach((card, index) => {
        card.style.opacity = 0;
        card.style.transform = 'translateY(40px)';
        card.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`;
        cardObserver.observe(card);
    });
});
