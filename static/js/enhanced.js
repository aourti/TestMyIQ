// Enhanced Interactions for TestMyIQ.ai
document.addEventListener('DOMContentLoaded', function() {
    
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with animate-on-scroll class
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
    
    // Achievement System
    class AchievementSystem {
        constructor() {
            this.achievements = {
                firstTest: { icon: '🎯', title: 'First Step', description: 'Complete your first test' },
                perfectScore: { icon: '💯', title: 'Perfectionist', description: 'Get a perfect score' },
                weekStreak: { icon: '🔥', title: 'Week Warrior', description: '7-day streak' },
                speedDemon: { icon: '⚡', title: 'Speed Demon', description: 'Complete a test in under 10 minutes' },
                nightOwl: { icon: '🦉', title: 'Night Owl', description: 'Take a test after midnight' },
                earlyBird: { icon: '🌅', title: 'Early Bird', description: 'Take a test before 6 AM' }
            };
        }
        
        unlock(achievementKey) {
            const achievement = this.achievements[achievementKey];
            if (!achievement) return;
            
            const notification = document.createElement('div');
            notification.className = 'achievement-unlock';
            notification.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <h4>Achievement Unlocked!</h4>
                <h5>${achievement.title}</h5>
                <p>${achievement.description}</p>
            `;
            
            document.body.appendChild(notification);
            
            // Play sound effect
            this.playSound('achievement');
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
        
        playSound(type) {
            // Create and play achievement sound
            const audio = new Audio(`data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE`);
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore if audio fails
        }
    }
    
    window.achievementSystem = new AchievementSystem();
    
    // Gamification: XP and Level System
    class LevelSystem {
        constructor() {
            this.xp = parseInt(localStorage.getItem('userXP') || '0');
            this.level = this.calculateLevel();
        }
        
        calculateLevel() {
            return Math.floor(Math.sqrt(this.xp / 100)) + 1;
        }
        
        addXP(amount) {
            const oldLevel = this.level;
            this.xp += amount;
            this.level = this.calculateLevel();
            
            localStorage.setItem('userXP', this.xp);
            
            this.showXPGain(amount);
            
            if (this.level > oldLevel) {
                this.levelUp();
            }
        }
        
        showXPGain(amount) {
            const xpPopup = document.createElement('div');
            xpPopup.className = 'xp-popup';
            xpPopup.textContent = `+${amount} XP`;
            xpPopup.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 50px;
                background: var(--primary-gradient);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: bold;
                animation: xpFloat 2s ease-out forwards;
                z-index: 2000;
            `;
            
            document.body.appendChild(xpPopup);
            
            setTimeout(() => xpPopup.remove(), 2000);
        }
        
        levelUp() {
            // Show level up notification
            window.appUtils.showToast(`Level Up! You're now level ${this.level}!`, 'success');
            
            // Trigger confetti
            this.createConfetti();
            
            // Check for level-based achievements
            if (this.level === 5) window.achievementSystem.unlock('rookie');
            if (this.level === 10) window.achievementSystem.unlock('veteran');
        }
        
        createConfetti() {
            const colors = ['#667eea', '#764ba2', '#ff6b6b', '#4ecdc4', '#45b7d1'];
            
            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    left: ${Math.random() * 100}%;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    animation-delay: ${Math.random() * 0.5}s;
                    animation-duration: ${3 + Math.random() * 2}s;
                `;
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 5000);
            }
        }
    }
    
    window.levelSystem = new LevelSystem();
    
    // Easter Eggs
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            activateEasterEgg();
        }
    });
    
    function activateEasterEgg() {
        document.body.classList.add('easter-egg');
        window.appUtils.showToast('🎮 Konami Code Activated! +100 XP', 'success');
        window.levelSystem.addXP(100);
        
        setTimeout(() => {
            document.body.classList.remove('easter-egg');
        }, 1000);
    }
    
    // Theme Switcher
    class ThemeSwitcher {
        constructor() {
            this.themes = {
                default: { primary: '#667eea', secondary: '#764ba2' },
                ocean: { primary: '#3498db', secondary: '#2980b9' },
                forest: { primary: '#27ae60', secondary: '#229954' },
                sunset: { primary: '#e74c3c', secondary: '#c0392b' },
                midnight: { primary: '#34495e', secondary: '#2c3e50' }
            };
            
            this.currentTheme = localStorage.getItem('theme') || 'default';
            this.applyTheme(this.currentTheme);
        }
        
        applyTheme(themeName) {
            const theme = this.themes[themeName];
            if (!theme) return;
            
            document.documentElement.style.setProperty('--primary-color', theme.primary);
            document.documentElement.style.setProperty('--secondary-color', theme.secondary);
            document.documentElement.style.setProperty('--primary-gradient', 
                `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`);
            
            localStorage.setItem('theme', themeName);
            this.currentTheme = themeName;
        }
        
        cycle() {
            const themeNames = Object.keys(this.themes);
            const currentIndex = themeNames.indexOf(this.currentTheme);
            const nextIndex = (currentIndex + 1) % themeNames.length;
            this.applyTheme(themeNames[nextIndex]);
        }
    }
    
    window.themeSwitcher = new ThemeSwitcher();
    
    // Motivational System
    class MotivationalSystem {
        constructor() {
            this.messages = {
                start: [
                    "Ready to challenge yourself? Let's go! 💪",
                    "Your brain is amazing - let's see what it can do! 🧠",
                    "Every expert was once a beginner. You've got this! 🌟"
                ],
                correct: [
                    "Excellent! Keep it up! ✨",
                    "You're on fire! 🔥",
                    "Brilliant answer! 🎯"
                ],
                incorrect: [
                    "No worries, learning is all about trying! 💡",
                    "That's how we grow - keep going! 🌱",
                    "Every mistake is a step towards mastery! 📈"
                ],
                complete: [
                    "Amazing job! You should be proud! 🎉",
                    "You crushed it! Well done! 💪",
                    "Fantastic performance! 🌟"
                ]
            };
        }
        
        getMessage(type) {
            const messages = this.messages[type];
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        showEncouragement(type) {
            const message = this.getMessage(type);
            window.appUtils.showToast(message, 'info');
        }
    }
    
    window.motivationalSystem = new MotivationalSystem();
    
    // Enhanced keyboard navigation
    let focusableElements = [];
    let currentFocusIndex = 0;
    
    function initKeyboardNav() {
        focusableElements = Array.from(document.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                // Default tab behavior
                return;
            }
            
            if (e.altKey && e.key === 'ArrowDown') {
                // Quick navigation to main content
                e.preventDefault();
                document.querySelector('main').scrollIntoView({ behavior: 'smooth' });
            }
            
            // Quick actions with keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 't':
                        e.preventDefault();
                        window.location.href = '/test/start';
                        break;
                    case 'p':
                        e.preventDefault();
                        window.location.href = '/profile';
                        break;
                    case 'h':
                        e.preventDefault();
                        window.location.href = '/';
                        break;
                }
            }
        });
    }
    
    initKeyboardNav();
    
    // Particle effect for special occasions
    class ParticleSystem {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.isActive = false;
            
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999;
            `;
        }
        
        init() {
            document.body.appendChild(this.canvas);
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }
        
        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        
        createParticle(x, y) {
            return {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1,
                life: 1,
                size: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 240}, 70%, 60%)`
            };
        }
        
        start() {
            if (this.isActive) return;
            this.isActive = true;
            this.animate();
        }
        
        stop() {
            this.isActive = false;
            this.particles = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        animate() {
            if (!this.isActive) return;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Add new particles
            if (Math.random() < 0.1) {
                this.particles.push(this.createParticle(
                    Math.random() * this.canvas.width,
                    this.canvas.height
                ));
            }
            
            // Update and draw particles
            this.particles = this.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.02; // gravity
                particle.life -= 0.01;
                
                if (particle.life <= 0) return false;
                
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                
                return particle.life > 0 && particle.y < this.canvas.height;
            });
            
            requestAnimationFrame(() => this.animate());
        }
    }
    
    window.particleSystem = new ParticleSystem();
    window.particleSystem.init();
    
    // Sound effects manager
    class SoundManager {
        constructor() {
            this.sounds = {
                click: this.createSound([200, 0.1, 0.05]),
                success: this.createSound([400, 0.2, 0.1, 600, 0.2, 0.1]),
                error: this.createSound([200, 0.2, 0.1, 150, 0.2, 0.1]),
                levelUp: this.createSound([300, 0.1, 0.05, 400, 0.1, 0.05, 500, 0.2, 0.1])
            };
            
            this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        }
        
        createSound(pattern) {
            // Create simple synthesized sounds
            return () => {
                if (!this.enabled) return;
                
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const gainNode = audioContext.createGain();
                gainNode.connect(audioContext.destination);
                
                let time = audioContext.currentTime;
                for (let i = 0; i < pattern.length; i += 3) {
                    const oscillator = audioContext.createOscillator();
                    oscillator.connect(gainNode);
                    oscillator.frequency.value = pattern[i];
                    gainNode.gain.setValueAtTime(pattern[i + 1], time);
                    oscillator.start(time);
                    oscillator.stop(time + pattern[i + 2]);
                    time += pattern[i + 2];
                }
            };
        }
        
        play(soundName) {
            if (this.sounds[soundName]) {
                this.sounds[soundName]();
            }
        }
        
        toggle() {
            this.enabled = !this.enabled;
            localStorage.setItem('soundEnabled', this.enabled);
            return this.enabled;
        }
    }
    
    window.soundManager = new SoundManager();
    
    // Add click sounds to all buttons
    document.addEventListener('click', (e) => {
        if (e.target.matches('button, .btn, a')) {
            window.soundManager.play('click');
        }
    });
    
    // Progress tracking visualization
    class ProgressTracker {
        constructor() {
            this.milestones = [
                { tests: 1, title: 'First Steps' },
                { tests: 5, title: 'Getting Started' },
                { tests: 10, title: 'Dedicated' },
                { tests: 25, title: 'Committed' },
                { tests: 50, title: 'Expert' },
                { tests: 100, title: 'Master' }
            ];
        }
        
        updateProgress(testsCompleted) {
            const nextMilestone = this.milestones.find(m => m.tests > testsCompleted);
            if (!nextMilestone) return;
            
            const prevMilestone = this.milestones[this.milestones.indexOf(nextMilestone) - 1];
            const start = prevMilestone ? prevMilestone.tests : 0;
            const progress = ((testsCompleted - start) / (nextMilestone.tests - start)) * 100;
            
            return {
                current: testsCompleted,
                next: nextMilestone.tests,
                nextTitle: nextMilestone.title,
                progress: progress
            };
        }
        
        checkMilestone(testsCompleted) {
            const milestone = this.milestones.find(m => m.tests === testsCompleted);
            if (milestone) {
                window.achievementSystem.unlock(`milestone_${milestone.tests}`);
                window.particleSystem.start();
                setTimeout(() => window.particleSystem.stop(), 3000);
            }
        }
    }
    
    window.progressTracker = new ProgressTracker();
    
    // Smart tips system
    class TipsSystem {
        constructor() {
            this.tips = [
                "Did you know? Taking breaks between tests can improve your performance!",
                "Pro tip: Practice different categories to improve your overall score.",
                "Fun fact: Your brain works best when you're well-rested and hydrated.",
                "Tip: Review your incorrect answers to learn and improve.",
                "Did you know? Morning tests often yield better results for most people.",
                "Strategy: Start with categories you're comfortable with to build confidence."
            ];
            
            this.shownTips = JSON.parse(localStorage.getItem('shownTips') || '[]');
        }
        
        getRandomTip() {
            const unshownTips = this.tips.filter((_, index) => !this.shownTips.includes(index));
            
            if (unshownTips.length === 0) {
                this.shownTips = [];
                localStorage.setItem('shownTips', '[]');
                return this.tips[0];
            }
            
            const tipIndex = this.tips.indexOf(unshownTips[Math.floor(Math.random() * unshownTips.length)]);
            this.shownTips.push(tipIndex);
            localStorage.setItem('shownTips', JSON.stringify(this.shownTips));
            
            return this.tips[tipIndex];
        }
        
        showTip() {
            const tip = this.getRandomTip();
            const tipElement = document.createElement('div');
            tipElement.className = 'smart-tip';
            tipElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-gradient);
                color: white;
                padding: 15px 25px;
                border-radius: 30px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                max-width: 400px;
                text-align: center;
                animation: slideInUp 0.5s ease;
                z-index: 1000;
            `;
            
            tipElement.innerHTML = `
                <i class="bi bi-lightbulb"></i> ${tip}
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                ">✕</button>
            `;
            
            document.body.appendChild(tipElement);
            
            setTimeout(() => {
                if (tipElement.parentElement) {
                    tipElement.style.animation = 'slideInUp 0.5s ease reverse';
                    setTimeout(() => tipElement.remove(), 500);
                }
            }, 8000);
        }
    }
    
    window.tipsSystem = new TipsSystem();
    
    // Show a tip occasionally
    if (Math.random() < 0.3) {
        setTimeout(() => window.tipsSystem.showTip(), 2000);
    }
    
    // Export all systems for global access
    window.iqTestPro = {
        achievementSystem: window.achievementSystem,
        levelSystem: window.levelSystem,
        themeSwitcher: window.themeSwitcher,
        motivationalSystem: window.motivationalSystem,
        particleSystem: window.particleSystem,
        soundManager: window.soundManager,
        progressTracker: window.progressTracker,
        tipsSystem: window.tipsSystem
    };
    
    // Initialize user experience enhancements
    console.log('TestMyIQ.ai Enhanced Experience Loaded! 🧠✨');
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes xpFloat {
            0% {
                transform: translateY(0);
                opacity: 1;
            }
            100% {
                transform: translateY(-100px);
                opacity: 0;
            }
        }
        
        @keyframes slideInUp {
            from {
                transform: translate(-50%, 100%);
                opacity: 0;
            }
            to {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
});