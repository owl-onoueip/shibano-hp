document.addEventListener('DOMContentLoaded', function () {

    // Initialize AOS (Animation On Scroll)
    AOS.init({
        once: true,
        offset: 100,
        duration: 800,
        easing: 'ease-out-cubic'
    });

    // Loader Animation
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 2000); // Wait 2 seconds
    }

    // Header Scroll Effect
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth Scroll for Anchors
    document.querySelector('.main-nav').addEventListener('click', function (e) {
        if (e.target.tagName === 'A' && e.target.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                window.scrollTo({
                    top: target.offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});
