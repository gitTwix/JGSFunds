// --- SMOOTH SCROLLING ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        // FIX: Check if the link is the root anchor (#)
        if (targetId === '#') {
            window.scrollTo({
                top: 0, // Scroll to the very top
                behavior: 'smooth'
            });
            return; // Exit the function
        }

        // Original logic for other sections
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            // Offset by 80px to account for the fixed header height
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
    threshold: 0.1 // Trigger when 10% of the element is visible
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // Stop observing once visible
        }
    });
}, observerOptions);

revealElements.forEach(el => {
    el.classList.add('is-hidden'); // Add a starting class
    observer.observe(el);
});

// STICKY/SHRINKING HEADER
window.addEventListener('scroll', () => {
    const header = document.querySelector('nav');
    const scrollPosition = window.scrollY;
    const headerHeight = 100; // Must match the 'height: 100px;' in your CSS

    if (scrollPosition > 50) { // Trigger shrink after scrolling 50px
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// --- ACTIVE NAVIGATION STATE (REVISED) ---
window.addEventListener('scroll', () => {
    // 1. Define the fixed header offset (must match your CSS)
    const HEADER_OFFSET = 80; 
    
    // 2. Select all major sections that should trigger the active state
    // Ensure all sections are listed here by their IDs.
    const sections = document.querySelectorAll('#services, #credit-repair, #how-we-work, #about-us-section');
    const navLinks = document.querySelectorAll('.nav-links li a');
    
    let currentActiveId = '';
    
    sections.forEach(section => {
        const sectionId = section.id;
        
        // Get the section's position relative to the viewport
        const rect = section.getBoundingClientRect();
        
        // Calculate the trigger point: When the top of the section hits the viewport, 
        // adjusted by the fixed header offset.
        const triggerPoint = rect.top + window.scrollY - HEADER_OFFSET;
        
        // Check if the section is currently visible and dominant in the viewport.
        // We check if the top of the section is visible AND if the bottom hasn't passed the viewport bottom.
        if (window.scrollY >= triggerPoint && window.scrollY < (rect.bottom + window.scrollY - HEADER_OFFSET)) {
            currentActiveId = sectionId;
        }
    });

    // 3. Update active class
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        // Check if the link's href matches the current active section ID
        if (link.getAttribute('href') === `#${currentActiveId}`) {
            link.classList.add('active');
        }
    });
});

// --- VIDEO BACKGROUND CONTROL ---
const videoElements = document.querySelectorAll('.full-width-section video');

const videoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        const video = entry.target;
        const section = entry.target.closest('.full-width-section');

        if (entry.isIntersecting) {
            // Video is visible: Play it and ensure full opacity
            video.play();
            section.classList.add('video-active');
        } else {
            // Video is out of view: Pause it and dim it
            video.pause();
            section.classList.remove('video-active');
        }
    });
}, {
    rootMargin: '0px',
    threshold: 0.5 // Trigger when 50% of the video is visible
});

videoElements.forEach(video => {
    videoObserver.observe(video);
});

// --- LAZY LOADING ---
const lazyImages = document.querySelectorAll('img.lazy-load');

const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            // Load the image by setting the src from the data-src attribute
            img.src = img.dataset.src;
            img.classList.add('loaded'); // Optional: Add class for fade-in effect
            observer.unobserve(img); // Stop observing once loaded
        }
    });
}, {
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% of the image is visible
});

lazyImages.forEach(img => {
    lazyLoadObserver.observe(img);
});