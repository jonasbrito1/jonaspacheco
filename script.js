// ==========================================
// SMOOTH SCROLLING & NAVIGATION
// ==========================================

// Mobile Menu Toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');

function highlightNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (navLink && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            navLink.classList.add('active');
        }
    });
}

window.addEventListener('scroll', highlightNavLink);

// ==========================================
// TYPING ANIMATION
// ==========================================

const typingTexts = [];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

const typingElement = document.querySelector('.typing-text');

function typeText() {
    if (!typingElement || typingTexts.length === 0) return;

    const currentText = typingTexts[textIndex];

    if (isDeleting) {
        typingElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
    } else {
        typingElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentText.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause before deleting
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typingTexts.length;
        typingSpeed = 500; // Pause before typing next text
    }

    setTimeout(typeText, typingSpeed);
}

// Start typing animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(typeText, 1000);
});

// ==========================================
// SCROLL ANIMATIONS (AOS - Animate On Scroll)
// ==========================================

function initAOS() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, observerOptions);

    // Observe all elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(element => {
        observer.observe(element);
    });
}

// Initialize AOS on page load
document.addEventListener('DOMContentLoaded', initAOS);

// ==========================================
// COUNTER ANIMATION FOR STATS
// ==========================================

function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16); // 60 FPS

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Trigger counter animation when stats section is visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                animateCounter(stat, target);
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const aboutStats = document.querySelector('.about-stats');
if (aboutStats) {
    statsObserver.observe(aboutStats);
}

// ==========================================
// BACK TO TOP BUTTON
// ==========================================

const backToTopBtn = document.getElementById('backToTop');

if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==========================================
// CONTACT FORM HANDLING
// ==========================================

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Enviando...</span><i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch('/contact.php', {
                method: 'POST',
                body: new FormData(contactForm),
            });
            const data = await res.json();

            if (data.success) {
                showNotification(data.message, 'success');
                contactForm.reset();
            } else {
                showNotification(data.message || 'Erro ao enviar. Tente por email ou LinkedIn.', 'error');
            }
        } catch (err) {
            showNotification('Erro de conexão. Tente por email ou LinkedIn diretamente.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });
}

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
            </span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 100px;
            right: 2rem;
            background: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .notification-success {
            border-left: 4px solid var(--color-green-primary);
        }

        .notification-error {
            border-left: 4px solid #ff5f56;
        }

        .notification-icon {
            font-size: 1.5rem;
        }

        .notification-success .notification-icon {
            color: var(--color-green-primary);
        }

        .notification-error .notification-icon {
            color: #ff5f56;
        }

        .notification-message {
            flex: 1;
            color: var(--color-text-primary);
            font-size: 0.9375rem;
        }

        .notification-close {
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            font-size: 1.25rem;
            padding: 0;
            transition: var(--transition-fast);
        }

        .notification-close:hover {
            color: var(--color-text-primary);
        }

        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        @media (max-width: 768px) {
            .notification {
                right: 1rem;
                left: 1rem;
                max-width: none;
            }
        }
    `;

    if (!document.querySelector('style[data-notification-styles]')) {
        style.setAttribute('data-notification-styles', 'true');
        document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(notification);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ==========================================
// PARALLAX EFFECT FOR HERO BACKGROUND
// ==========================================

const heroBackground = document.querySelector('.hero-background');

if (heroBackground) {
    heroBackground.style.willChange = 'transform';
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                heroBackground.style.transform = `translateY(${window.pageYOffset * 0.5}px)`;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ==========================================
// CARD HOVER EFFECTS
// ==========================================

document.querySelectorAll('.expertise-card, .project-card').forEach(card => {
    card.addEventListener('mouseenter', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.style.setProperty('--mouse-x', `${x}px`);
        this.style.setProperty('--mouse-y', `${y}px`);
    });
});

// ==========================================
// LAZY LOADING FOR IMAGES (if any added later)
// ==========================================

function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

document.addEventListener('DOMContentLoaded', lazyLoadImages);

// ==========================================
// TERMINAL CURSOR BLINK
// ==========================================

const terminalCursor = document.querySelector('.terminal-cursor');
if (terminalCursor) {
    setInterval(() => {
        terminalCursor.style.opacity = terminalCursor.style.opacity === '0' ? '1' : '0';
    }, 500);
}

// ==========================================
// KEYBOARD NAVIGATION
// ==========================================

document.addEventListener('keydown', (e) => {
    // ESC to close mobile menu
    if (e.key === 'Escape') {
        if (navLinks && navLinks.classList.contains('active')) {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    }

    // Ctrl/Cmd + K for quick navigation (optional enhancement)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
    }
});

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================

// Debounce function for scroll events
function debounce(func, wait = 10) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll-intensive functions
window.addEventListener('scroll', debounce(highlightNavLink, 10));

// ==========================================
// PRELOADER (Optional)
// ==========================================

window.addEventListener('load', () => {
    document.body.classList.add('loaded');

    // Trigger initial animations
    setTimeout(() => {
        const heroElements = document.querySelectorAll('.hero [data-aos]');
        heroElements.forEach(el => el.classList.add('aos-animate'));
    }, 100);
});

// ==========================================
// SMOOTH SCROLL POLYFILL FOR OLDER BROWSERS
// ==========================================

if (!('scrollBehavior' in document.documentElement.style)) {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================
// CONSOLE MESSAGE
// ==========================================

console.log('%c👋 Olá, Developer!', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
console.log('%c💼 Interessado em trabalhar comigo? Entre em contato!', 'color: #00ff88; font-size: 14px;');
console.log('%c🔗 GitHub: https://github.com/jonasbrito1', 'color: #ffd600; font-size: 14px;');
console.log('%c🔗 LinkedIn: https://www.linkedin.com/in/jonasbrito1/', 'color: #ffd600; font-size: 14px;');

// ==========================================
// ANALYTICS READY
// ==========================================

// Placeholder for analytics initialization
function initAnalytics() {
    console.log('Page loaded - Analytics ready');

    // Track important interactions
    document.querySelectorAll('.btn, .project-link, .social-link').forEach(element => {
        element.addEventListener('click', function() {
            const elementText = this.textContent.trim() || this.getAttribute('aria-label') || 'unknown';
            console.log('Click tracked:', elementText);
        });
    });
}

document.addEventListener('DOMContentLoaded', initAnalytics);

console.log('🚀 Portfolio v1.0.0 - Jonas Pacheco');

// ==========================================
// INTERNATIONALIZATION (i18n)
// ==========================================

const translations = {
    pt: {
        nav: {
            home: "Início",
            about: "Sobre",
            expertise: "Especialidades",
            projects: "Projetos",
            blog: "Blog",
            contact: "Contato"
        },
        hero: {
            badge: "Desenvolvedor Full Stack",
            subtitle: "Desenvolvedor Full Stack focado em segurança, automação e sistemas escaláveis",
            description: "Desenvolvo aplicações web seguras, performáticas e preparadas para crescer.<br>Atuo do frontend ao deploy, aplicando práticas de DevSecOps para garantir estabilidade, eficiência e proteção contra vulnerabilidades.",
            cta1: "Entrar em Contato",
            cta2: "Ver Projetos",
            cta3: "Ler artigos no Blog"
        },
        about: {
            tag: "<sobre>",
            title: "Sobre",
            subtitle: "Tecnologia com clareza, segurança e manutenção real",
            description1: "Sou desenvolvedor full stack, com experiência em desenvolvimento de aplicações, automação de processos e construção de código seguro.",
            description2: "Trabalho com tecnologias modernas como <strong>React, Vue, Node.js, Python e PHP</strong>, além de práticas de DevOps com Docker, CI/CD e infraestrutura automatizada. Meu foco é construir soluções que não apenas funcionam, mas que são seguras, escaláveis e fáceis de manter.",
            highlight1Title: "Desenvolvimento Seguro",
            highlight1Text: "Proteção e boas práticas incorporadas desde a arquitetura até o deploy.",
            highlight2Title: "Automação de Processos",
            highlight2Text: "Redução de tarefas manuais com scripts, integrações e pipelines bem definidos.",
            highlight3Title: "Escalabilidade",
            highlight3Text: "Sistemas preparados para crescer sem virar um problema de manutenção.",
            stat1: "Atuação",
            stat2: "Stack",
            stat3: "Objetivo",
            stat4: "",
            value1: "Visão de produto e implementação completa",
            value2: "Segurança aplicada desde o desenvolvimento",
            value3: "Arquitetura simples de operar e evoluir"
        },
        expertise: {
            tag: "<especialidades>",
            title: "Especialidades",
            subtitle: "Capacidades centrais para construir software mais confiável",
            backend: "Desenvolvimento Web Full Stack",
            backendDesc: "Criação de aplicações modernas com React, Vue, Node.js e Python, focadas em performance e escalabilidade.",
            frontend: "Automação de Processos",
            frontendDesc: "Eliminação de tarefas manuais com scripts, integrações e pipelines automatizados.",
            erp: "Segurança Aplicada ao Desenvolvimento",
            erpDesc: "Proteção contra vulnerabilidades como XSS, CSRF e SQL Injection, além da implementação de autenticação segura com JWT e OAuth.",
            devsecops: "",
            devsecopsDesc: "",
            mobile: "",
            mobileDesc: "",
            automation: "",
            automationDesc: ""
        },
        projects: {
            tag: "<projetos>",
            title: "Projetos",
            subtitle: "Seleção de sistemas com foco em operação, estrutura e automação",
            viewAll: "Ver Todos os Projetos",
            horizon: "Site institucional educacional com conteúdo gerenciável para apresentar a escola, diferenciais, galeria e contato em uma base preparada para evolução administrativa.",
            gbc: "Sistema de gestão para academia com alunos, turmas, frequência, financeiro, cobranças e integrações de pagamento em uma operação centralizada.",
            healthix: "Plataforma de gestão hospitalar com dashboards, filas e módulos operacionais integrados para acompanhamento em tempo real.",
            bjjmasters: "SaaS multi-tenant para academias de jiu-jitsu com white-label, portal do aluno, controle de presença e gestão financeira por unidade.",
            evolution: "Site institucional da Evolution Engenharia com vitrine de serviços, provas sociais, captação de orçamento e assistente comercial.",
            hidro: "Site comercial da Hidro Evolution voltado à apresentação de produtos e soluções em bebedouros, sistemas hidráulicos e energia."
        },
        testimonials: {
            tag: "<depoimentos>",
            title: "O Que Dizem Sobre Meu Trabalho",
            subtitle: "Resultados reais de projetos entregues"
        },
        process: {
            tag: "<processo>",
            title: "Como Trabalho",
            subtitle: "Metodologia comprovada para entregar resultados",
            step1Title: "Análise & Planejamento",
            step1Desc: "Entendo profundamente seu negócio, os desafios e objetivos. Documento todos os requisitos e crio um plano de ação detalhado.",
            step2Title: "Design & Arquitetura",
            step2Desc: "Projeto a arquitetura do sistema priorizando segurança, escalabilidade e manutenibilidade. Defino a stack tecnológica ideal.",
            step3Title: "Desenvolvimento",
            step3Desc: "Codifico seguindo as melhores práticas, com testes automatizados e code reviews constantes. Você acompanha o progresso em tempo real.",
            step4Title: "Testes & Validação",
            step4Desc: "Realizo testes rigorosos de segurança, performance e usabilidade. Corrijo bugs e otimizo antes do lançamento.",
            step5Title: "Deploy & Suporte",
            step5Desc: "Faço o deploy com zero downtime, treino sua equipe e forneço documentação completa. Suporte pós-entrega está incluído."
        },
        technologies: {
            tag: "<tecnologias>",
            title: "Tecnologias",
            subtitle: "Base técnica focada em desenvolvimento moderno e entrega confiável",
            languages: "Linguagens",
            frameworks: "Frameworks",
            databases: "Banco de Dados",
            devops: "Segurança"
        },
        contact: {
            tag: "<contato>",
            title: "Contato",
            subtitle: "Vamos construir algo sólido e seguro juntos",
            intro: "Se você precisa de um sistema profissional, seguro e bem estruturado, posso te ajudar do planejamento ao deploy.",
            readyTitle: "Vamos construir algo sólido e seguro juntos.",
            name: "Nome",
            email: "Email",
            subject: "Assunto",
            message: "Mensagem",
            send: "Enviar Mensagem",
            guarantee1Title: "Consultoria Gratuita",
            guarantee1Desc: "Primeira reunião sem compromisso para entender seu projeto",
            guarantee2Title: "Entrega no Prazo",
            guarantee2Desc: "Cronogramas realistas e cumprimento de deadlines",
            guarantee3Title: "Suporte Incluído",
            guarantee3Desc: "30 dias de suporte pós-entrega sem custo adicional",
            guarantee4Title: "Código Documentado",
            guarantee4Desc: "Documentação completa e código limpo garantidos"
        },
        footer: {
            tagline: "Desenvolvendo sistemas que resolvem problemas reais",
            navigation: "Navegação",
            social: "Social",
            projects: "Projetos",
            rights: "Todos os direitos reservados.",
            developed: "Desenvolvido por",
            coffee: "e muito"
        }
    },
    en: {
        nav: {
            home: "Home",
            about: "About",
            expertise: "Expertise",
            projects: "Projects",
            blog: "Blog",
            contact: "Contact"
        },
        hero: {
            badge: "Full Stack Developer",
            subtitle: "Full Stack Developer focused on security, automation, and scalable systems",
            description: "I build secure, performant web applications designed to grow.<br>I work from frontend to deployment, applying DevSecOps practices to ensure stability, efficiency, and protection against vulnerabilities.",
            cta1: "Get in Touch",
            cta2: "View Projects",
            cta3: "Read Blog Articles"
        },
        about: {
            tag: "<about>",
            title: "About",
            subtitle: "Technology with clarity, security, and long-term maintainability",
            description1: "I am a full stack developer with experience in application development, process automation, and secure code practices.",
            description2: "I work with modern technologies such as <strong>React, Vue, Node.js, Python, and PHP</strong>, along with DevOps practices using Docker, CI/CD, and automated infrastructure. My focus is to build solutions that not only work, but are also secure, scalable, and easy to maintain.",
            highlight1Title: "Secure Development",
            highlight1Text: "Protection and best practices built in from architecture to deployment.",
            highlight2Title: "Process Automation",
            highlight2Text: "Reduction of manual work with scripts, integrations, and well-defined pipelines.",
            highlight3Title: "Scalability",
            highlight3Text: "Systems designed to grow without becoming a maintenance problem.",
            stat1: "Scope",
            stat2: "Stack",
            stat3: "Goal",
            stat4: "",
            value1: "Product mindset with end-to-end delivery",
            value2: "Security applied from the start",
            value3: "Architecture that is simple to operate and evolve"
        },
        expertise: {
            tag: "<expertise>",
            title: "Expertise",
            subtitle: "Core capabilities for building more reliable software",
            backend: "Full Stack Web Development",
            backendDesc: "Modern applications built with React, Vue, Node.js, and Python, focused on performance and scalability.",
            frontend: "Process Automation",
            frontendDesc: "Elimination of manual tasks through scripts, integrations, and automated pipelines.",
            erp: "Security Applied to Development",
            erpDesc: "Protection against vulnerabilities such as XSS, CSRF, and SQL Injection, along with secure authentication using JWT and OAuth.",
            devsecops: "",
            devsecopsDesc: "",
            mobile: "",
            mobileDesc: "",
            automation: "",
            automationDesc: ""
        },
        projects: {
            tag: "<projects>",
            title: "Projects",
            subtitle: "Selected systems with focus on operations, structure, and automation",
            viewAll: "View All Projects",
            horizon: "Educational institutional website with manageable content for presenting the school, its differentiators, gallery, and contact on a base prepared for administrative evolution.",
            gbc: "Management system for a martial arts academy with students, classes, attendance, finance, billing, and payment integrations in one centralized operation.",
            healthix: "Hospital management platform with dashboards, queues, and integrated operational modules for real-time monitoring.",
            bjjmasters: "Multi-tenant SaaS for jiu-jitsu academies with white-label branding, student portal, attendance tracking, and per-unit financial management.",
            evolution: "Institutional website for Evolution Engenharia with a service showcase, trust signals, lead capture, and a commercial assistant.",
            hidro: "Commercial website for Hidro Evolution focused on presenting products and solutions for drinking fountains, hydraulic systems, and energy."
        },
        testimonials: {
            tag: "<testimonials>",
            title: "What People Say About My Work",
            subtitle: "Real results from delivered projects"
        },
        process: {
            tag: "<process>",
            title: "How I Work",
            subtitle: "Proven methodology to deliver results",
            step1Title: "Analysis & Planning",
            step1Desc: "I deeply understand your business, challenges, and goals. I document all requirements and create a detailed action plan.",
            step2Title: "Design & Architecture",
            step2Desc: "I design system architecture prioritizing security, scalability, and maintainability. I define the ideal technology stack.",
            step3Title: "Development",
            step3Desc: "I code following best practices, with automated tests and constant code reviews. You track progress in real-time.",
            step4Title: "Testing & Validation",
            step4Desc: "I perform rigorous security, performance, and usability tests. I fix bugs and optimize before launch.",
            step5Title: "Deploy & Support",
            step5Desc: "I deploy with zero downtime, train your team, and provide complete documentation. Post-delivery support is included."
        },
        technologies: {
            tag: "<technologies>",
            title: "Technologies",
            subtitle: "Technical foundation focused on modern development and reliable delivery",
            languages: "Languages",
            frameworks: "Frameworks",
            databases: "Databases",
            devops: "Security"
        },
        contact: {
            tag: "<contact>",
            title: "Contact",
            subtitle: "Let's build something solid and secure together",
            intro: "If you need a professional, secure, and well-structured system, I can help from planning to deployment.",
            readyTitle: "Let's build something solid and secure together.",
            name: "Name",
            email: "Email",
            subject: "Subject",
            message: "Message",
            send: "Send Message",
            guarantee1Title: "Free Consultation",
            guarantee1Desc: "First meeting with no commitment to understand your project",
            guarantee2Title: "On-Time Delivery",
            guarantee2Desc: "Realistic schedules and deadline compliance",
            guarantee3Title: "Support Included",
            guarantee3Desc: "30 days of post-delivery support at no additional cost",
            guarantee4Title: "Documented Code",
            guarantee4Desc: "Complete documentation and clean code guaranteed"
        },
        footer: {
            tagline: "Developing systems that solve real problems",
            navigation: "Navigation",
            social: "Social",
            projects: "Projects",
            rights: "All rights reserved.",
            developed: "Developed by",
            coffee: "and lots of"
        }
    }
};

// Current language
let currentLang = localStorage.getItem('preferredLang') || 'pt';

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    updateTypingTexts();
});

// Language toggle button
const langToggle = document.getElementById('langToggle');
if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
}

function toggleLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    setLanguage(currentLang);
    localStorage.setItem('preferredLang', currentLang);
    updateTypingTexts();
}

function setLanguage(lang) {
    currentLang = lang;

    // Update lang toggle button
    const langFlag = document.querySelector('.lang-flag');
    const langText = document.querySelector('.lang-text');
    if (langFlag && langText) {
        langFlag.textContent = lang === 'pt' ? '🇧🇷' : '🇺🇸';
        langText.textContent = lang === 'pt' ? 'PT' : 'EN';
    }

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getNestedTranslation(translations[lang], key);
        if (translation) {
            element.textContent = translation;
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

    // Update specific sections that need innerHTML
    updateHeroSection(lang);
    updateAboutSection(lang);
    updateExpertiseSection(lang);
    updateProjectsSection(lang);
    updateTestimonialsSection(lang);
    updateProcessSection(lang);
    updateContactSection(lang);
    updateFooterSection(lang);
}

function getNestedTranslation(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function updateTypingTexts() {
    const texts = currentLang === 'pt'
        ? ['"Desenvolvedor Full-Stack"', '"Especialista em DevSecOps"', '"Arquiteto de Soluções"', '"Engenheiro de Software"']
        : ['"Full-Stack Developer"', '"DevSecOps Specialist"', '"Solutions Architect"', '"Software Engineer"'];

    // Update global typingTexts array
    window.typingTexts = texts;
    textIndex = 0;
    charIndex = 0;
    isDeleting = false;

    // Reset typing animation
    if (typingElement) {
        typingElement.textContent = '';
    }
}

function updateHeroSection(lang) {
    const t = translations[lang].hero;

    // Badge
    const badge = document.querySelector('.greeting-badge');
    if (badge) badge.textContent = t.badge;

    const subtitle = document.querySelector('.hero-subtitle');
    if (subtitle) subtitle.textContent = t.subtitle;

    // Description
    const description = document.querySelector('.hero-description');
    if (description) description.innerHTML = t.description;

    // CTAs
    const cta1 = document.querySelector('.hero-cta .btn-primary span');
    if (cta1) cta1.textContent = t.cta1;

    const cta2 = document.querySelector('.hero-cta .btn-secondary span');
    if (cta2) cta2.textContent = t.cta2;
}

function updateAboutSection(lang) {
    const t = translations[lang].about;

    // Section tag
    const aboutTag = document.querySelector('#about .section-tag');
    if (aboutTag) aboutTag.textContent = t.tag;

    // Section title
    const aboutTitle = document.querySelector('#about .section-title');
    if (aboutTitle) aboutTitle.textContent = t.title;

    // Section subtitle
    const aboutSubtitle = document.querySelector('#about .section-subtitle');
    if (aboutSubtitle) aboutSubtitle.textContent = t.subtitle;

    // Descriptions
    const descriptions = document.querySelectorAll('#about .about-description');
    if (descriptions[0]) descriptions[0].innerHTML = t.description1;
    if (descriptions[1]) descriptions[1].innerHTML = t.description2;

    // Value props
    const valueItems = document.querySelectorAll('#about .value-item span');
    if (valueItems[0]) valueItems[0].textContent = t.value1;
    if (valueItems[1]) valueItems[1].textContent = t.value2;
    if (valueItems[2]) valueItems[2].textContent = t.value3;

    // Highlight items
    const highlights = document.querySelectorAll('#about .highlight-item');
    if (highlights[0]) {
        highlights[0].querySelector('h3').textContent = t.highlight1Title;
        highlights[0].querySelector('p').textContent = t.highlight1Text;
    }
    if (highlights[1]) {
        highlights[1].querySelector('h3').textContent = t.highlight2Title;
        highlights[1].querySelector('p').textContent = t.highlight2Text;
    }
    if (highlights[2]) {
        highlights[2].querySelector('h3').textContent = t.highlight3Title;
        highlights[2].querySelector('p').textContent = t.highlight3Text;
    }

    // Stats
    const stats = document.querySelectorAll('#about .stat-label');
    if (stats[0]) stats[0].textContent = t.stat1;
    if (stats[1]) stats[1].textContent = t.stat2;
    if (stats[2]) stats[2].textContent = t.stat3;
    if (stats[3]) stats[3].textContent = t.stat4;
}

function updateExpertiseSection(lang) {
    const t = translations[lang].expertise;

    // Section elements
    const expertiseTag = document.querySelector('#expertise .section-tag');
    if (expertiseTag) expertiseTag.textContent = t.tag;

    const expertiseTitle = document.querySelector('#expertise .section-title');
    if (expertiseTitle) expertiseTitle.textContent = t.title;

    const expertiseSubtitle = document.querySelector('#expertise .section-subtitle');
    if (expertiseSubtitle) expertiseSubtitle.textContent = t.subtitle;

    // Expertise cards
    const cards = document.querySelectorAll('#expertise .expertise-card');
    const cardData = [
        { title: t.backend, desc: t.backendDesc },
        { title: t.frontend, desc: t.frontendDesc },
        { title: t.erp, desc: t.erpDesc },
        { title: t.devsecops, desc: t.devsecopsDesc },
        { title: t.mobile, desc: t.mobileDesc },
        { title: t.automation, desc: t.automationDesc }
    ];

    cards.forEach((card, index) => {
        if (cardData[index]) {
            const cardTitle = card.querySelector('.card-title');
            const cardDesc = card.querySelector('.card-description');
            if (cardTitle) cardTitle.textContent = cardData[index].title;
            if (cardDesc) cardDesc.textContent = cardData[index].desc;
        }
    });
}

function updateProjectsSection(lang) {
    const t = translations[lang].projects;

    // Section elements
    const projectsTag = document.querySelector('#projects .section-tag');
    if (projectsTag) projectsTag.textContent = t.tag;

    const projectsTitle = document.querySelector('#projects .section-title');
    if (projectsTitle) projectsTitle.textContent = t.title;

    const projectsSubtitle = document.querySelector('#projects .section-subtitle');
    if (projectsSubtitle) projectsSubtitle.textContent = t.subtitle;

    // View all button
    const viewAllBtn = document.querySelector('#projects .projects-cta .btn span');
    if (viewAllBtn) viewAllBtn.textContent = t.viewAll;

    // Project descriptions
    const projects = document.querySelectorAll('#projects .project-description');
    const projectDescriptions = [
        t.horizon,
        t.gbc,
        t.healthix,
        t.bjjmasters,
        t.evolution,
        t.hidro
    ];

    projects.forEach((project, index) => {
        if (projectDescriptions[index]) {
            project.textContent = projectDescriptions[index];
        }
    });
}

function updateContactSection(lang) {
    const t = translations[lang].contact;

    // Section elements
    const contactTag = document.querySelector('#contact .section-tag');
    if (contactTag) contactTag.textContent = t.tag;

    const contactTitle = document.querySelector('#contact .section-title');
    if (contactTitle) contactTitle.textContent = t.title;

    const contactSubtitle = document.querySelector('#contact .section-subtitle');
    if (contactSubtitle) contactSubtitle.textContent = t.subtitle;

    // Guarantees
    const guaranteeItems = document.querySelectorAll('.guarantee-item');
    if (guaranteeItems[0]) {
        guaranteeItems[0].querySelector('h4').textContent = t.guarantee1Title;
        guaranteeItems[0].querySelector('p').textContent = t.guarantee1Desc;
    }
    if (guaranteeItems[1]) {
        guaranteeItems[1].querySelector('h4').textContent = t.guarantee2Title;
        guaranteeItems[1].querySelector('p').textContent = t.guarantee2Desc;
    }
    if (guaranteeItems[2]) {
        guaranteeItems[2].querySelector('h4').textContent = t.guarantee3Title;
        guaranteeItems[2].querySelector('p').textContent = t.guarantee3Desc;
    }
    if (guaranteeItems[3]) {
        guaranteeItems[3].querySelector('h4').textContent = t.guarantee4Title;
        guaranteeItems[3].querySelector('p').textContent = t.guarantee4Desc;
    }

    // Contact text
    const contactTextTitle = document.querySelector('.contact-text h3');
    if (contactTextTitle) contactTextTitle.textContent = t.readyTitle;

    const contactTextP = document.querySelector('.contact-text p');
    if (contactTextP) contactTextP.textContent = t.intro;

    // Form labels
    const nameLabel = document.querySelector('label[for="name"]');
    if (nameLabel) nameLabel.textContent = t.name;

    const emailLabel = document.querySelector('label[for="email"]');
    if (emailLabel) emailLabel.textContent = t.email;

    const subjectLabel = document.querySelector('label[for="subject"]');
    if (subjectLabel) subjectLabel.textContent = t.subject;

    const messageLabel = document.querySelector('label[for="message"]');
    if (messageLabel) messageLabel.textContent = t.message;

    // Submit button
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) submitBtn.textContent = t.send;
}

function updateFooterSection(lang) {
    const t = translations[lang].footer;

    // Footer tagline
    const tagline = document.querySelector('.footer-tagline');
    if (tagline) tagline.textContent = t.tagline;

    // Footer column titles
    const columns = document.querySelectorAll('.footer-column h3');
    if (columns[0]) columns[0].textContent = t.navigation;
    if (columns[1]) columns[1].textContent = t.social;
    if (columns[2]) columns[2].textContent = t.projects;

    // Copyright
    const copyright = document.querySelector('.footer-bottom p:first-child');
    if (copyright) {
        const year = new Date().getFullYear();
        copyright.textContent = `© ${year} Jonas Pacheco. ${t.rights}`;
    }
}

function updateTestimonialsSection(lang) {
    const t = translations[lang].testimonials;

    // Section elements
    const testimonialsTag = document.querySelector('#testimonials .section-tag');
    if (testimonialsTag) testimonialsTag.textContent = t.tag;

    const testimonialsTitle = document.querySelector('#testimonials .section-title');
    if (testimonialsTitle) testimonialsTitle.textContent = t.title;

    const testimonialsSubtitle = document.querySelector('#testimonials .section-subtitle');
    if (testimonialsSubtitle) testimonialsSubtitle.textContent = t.subtitle;
}

function updateProcessSection(lang) {
    const t = translations[lang].process;

    // Section elements
    const processTag = document.querySelector('#process .section-tag');
    if (processTag) processTag.textContent = t.tag;

    const processTitle = document.querySelector('#process .section-title');
    if (processTitle) processTitle.textContent = t.title;

    const processSubtitle = document.querySelector('#process .section-subtitle');
    if (processSubtitle) processSubtitle.textContent = t.subtitle;

    // Process steps
    const steps = document.querySelectorAll('.process-step');
    const stepData = [
        { title: t.step1Title, desc: t.step1Desc },
        { title: t.step2Title, desc: t.step2Desc },
        { title: t.step3Title, desc: t.step3Desc },
        { title: t.step4Title, desc: t.step4Desc },
        { title: t.step5Title, desc: t.step5Desc }
    ];

    steps.forEach((step, index) => {
        if (stepData[index]) {
            const stepTitle = step.querySelector('.step-title');
            const stepDesc = step.querySelector('.step-description');
            if (stepTitle) stepTitle.textContent = stepData[index].title;
            if (stepDesc) stepDesc.textContent = stepData[index].desc;
        }
    });
}
