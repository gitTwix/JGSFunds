// --- SMOOTH SCROLLING ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        if (targetId === '#') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return;
        }

        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, 
                behavior: 'smooth'
            });
        }
    });
});

// --- SCROLL REVEAL SCRIPT ---
const revealElements = document.querySelectorAll('.service-card, .process-step');

const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

revealElements.forEach(el => {
    el.classList.add('is-hidden');
    observer.observe(el);
});

// --- STICKY/SHRINKING HEADER ---
window.addEventListener('scroll', () => {
    const header = document.querySelector('nav');
    const scrollPosition = window.scrollY;

    if (scrollPosition > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// --- ACTIVE NAVIGATION STATE ---
window.addEventListener('scroll', () => {
    const HEADER_OFFSET = 80; 
    const sections = document.querySelectorAll('#services, #credit-repair, #how-we-work, #about-us-section');
    const navLinks = document.querySelectorAll('.nav-links li a');
    
    let currentActiveId = '';
    
    sections.forEach(section => {
        const sectionId = section.id;
        const rect = section.getBoundingClientRect();
        const triggerPoint = rect.top + window.scrollY - HEADER_OFFSET;
        
        if (window.scrollY >= triggerPoint && window.scrollY < (rect.bottom + window.scrollY - HEADER_OFFSET)) {
            currentActiveId = sectionId;
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        
        if (link.getAttribute('href') === `#${currentActiveId}`) {
            link.classList.add('active');
        }
    });
});

// --- VIDEO BACKGROUND CONTROL (MOBILE-FIXED) ---
function initBackgroundVideos() {
    const videoElements = document.querySelectorAll('.full-width-section video');

    videoElements.forEach(video => {
        // Force all required attributes via JS as fallback
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.controls = false;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('disablepictureinpicture', '');
        video.setAttribute('disableremoteplayback', '');

        // Remove controls attribute if somehow present
        video.removeAttribute('controls');

        // Attempt autoplay
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Video autoplay was prevented:', error);
                // Retry on first user interaction
                document.addEventListener('touchstart', function retryPlay() {
                    video.muted = true;
                    video.play().catch(() => {});
                    document.removeEventListener('touchstart', retryPlay);
                }, { once: true });

                document.addEventListener('click', function retryPlayClick() {
                    video.muted = true;
                    video.play().catch(() => {});
                    document.removeEventListener('click', retryPlayClick);
                }, { once: true });

                document.addEventListener('scroll', function retryPlayScroll() {
                    video.muted = true;
                    video.play().catch(() => {});
                    document.removeEventListener('scroll', retryPlayScroll);
                }, { once: true });
            });
        }
    });

    // Intersection Observer for play/pause on scroll
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            const section = video.closest('.full-width-section');

            if (entry.isIntersecting) {
                video.muted = true;
                video.play().catch(() => {});
                if (section) section.classList.add('video-active');
            } else {
                video.pause();
                if (section) section.classList.remove('video-active');
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.25
    });

    videoElements.forEach(video => {
        videoObserver.observe(video);
    });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackgroundVideos);
} else {
    initBackgroundVideos();
}

// --- LAZY LOADING ---
const lazyImages = document.querySelectorAll('img.lazy-load');

const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '0px',
    threshold: 0.1
});

lazyImages.forEach(img => {
    lazyLoadObserver.observe(img);
});

// --- HAMBURGER MENU TOGGLE ---
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });
}

// --- IMAGE MODAL/LIGHTBOX CREDIT REPAIR ---
const creditRepairImage = document.querySelector('.credit-repair-image img');

if (creditRepairImage) {
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <img src="${creditRepairImage.src}" alt="${creditRepairImage.alt}">
        </div>
    `;
    document.body.appendChild(modal);

    creditRepairImage.style.cursor = 'pointer';
    creditRepairImage.addEventListener('click', () => {
        modal.classList.add('active');
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}