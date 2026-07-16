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

    // Mobile Menu Toggle
    const menuTrigger = document.querySelector('.menu-trigger');
    const body = document.body;
    const navLinks = document.querySelectorAll('.main-nav a');

    if (menuTrigger) {
        menuTrigger.addEventListener('click', function () {
            body.classList.toggle('menu-active');
        });
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            body.classList.remove('menu-active');
        });
    });

    // Smooth Scroll for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);

            if (target) {
                const headerHeight = document.querySelector('.site-header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact Form (fetch POST -> /api/contact)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const statusEl = document.getElementById('contact-status');
        const submitBtn = contactForm.querySelector('.btn-submit');
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = contactForm.name.value.trim();
            const email = contactForm.email.value.trim();
            const message = contactForm.message.value.trim();

            statusEl.className = 'contact-status';
            if (!name || !email || !message) {
                statusEl.textContent = 'お名前・メールアドレス・メッセージをご入力ください。';
                statusEl.classList.add('is-error');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                statusEl.textContent = 'メールアドレスの形式をご確認ください。';
                statusEl.classList.add('is-error');
                return;
            }

            submitBtn.disabled = true;
            statusEl.textContent = '送信しています…';

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });
                const data = await res.json().catch(() => ({}));

                if (res.ok && data.success) {
                    contactForm.reset();
                    statusEl.textContent = 'お問い合わせを受け付けました。ありがとうございます。';
                    statusEl.classList.add('is-success');
                } else {
                    statusEl.textContent = data.error || '送信に失敗しました。時間をおいて再度お試しください。';
                    statusEl.classList.add('is-error');
                }
            } catch (err) {
                statusEl.textContent = '通信エラーが発生しました。時間をおいて再度お試しください。';
                statusEl.classList.add('is-error');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
});
