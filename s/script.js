particlesJS("particles-js", {
    particles: {
        number: { value: 100 },
        shape: { type: "circle" },
        opacity: { value: 1 }, 
        size: { value: 2, random: true }, 
        move: {
            enable: true,
            speed: 8, 
            straight: false, 
            out_mode: "out"
        },
        line_linked: { enable: false }, 
        color: { value: ["#ffffff", "#d0e8ff", "#9fb2cf", "#afebff", "#b0c8d8"] } 
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: { enable: false }, 
            onclick: { enable: false }
        }
    }
});

// put panic url here
let PANIC_URL = 'chrome://quit';

function isTypingInField(e){
    var el = e.target;
    if(!el) return false;
    var tag = el.tagName && el.tagName.toLowerCase();
    if(tag === 'input' || tag === 'textarea') return true;
    if(el.isContentEditable) return true;
    return false;
}

// Global keydown listener for panic key (backtick / ` )
window.addEventListener('keydown', function(e){
    // Ignore when typing in input fields or when modifier keys are pressed
    if(e.ctrlKey || e.altKey || e.metaKey) return;
    if(isTypingInField(e)) return;

    // e.key === '`' for backtick; some older browsers may use e.code === 'Backquote'
    if(e.key === '`' || e.code === 'Backquote'){
        // prevent accidental behavior
        e.preventDefault();
        window.location.href = 'https://classroom.google.com/';
    }
});

window.addEventListener('DOMContentLoaded', function(){
    var searchBar = document.getElementById('searchBar');
    if(searchBar){
        searchBar.addEventListener('keydown', function(e){
            if(e.key === 'Enter' || e.keyCode === 13){
                e.preventDefault();
                if(typeof searchToGames === 'function'){
                    searchToGames();
                }
            }
        });
    }
});

/* --- Adaptive particle count based on FPS ---
   Behavior:
   - Measure FPS using a lightweight RAF counter.
   - If FPS drops significantly compared to the recent average, step the particle count down.
   - If FPS rises significantly compared to the recent average, step the particle count up.
   - Clamp particle count between minParticles and maxParticles.
   - Use particles.js instance API (window.pJSDom[0].pJS) and call particlesRefresh() after changing the value.
   Notes: adjustments are stepwise (not directly proportional to FPS) and rate-limited.
*/
(function(){
    var minParticles = 5;
    var maxParticles = 100;
    var step = 5; // how many particles to add/remove per change
    var adjustCooldown = 1500; // ms between adjustments
    var threshold = 3; // FPS change threshold to trigger adjustments

    var frames = 0;
    var lastCheck = performance.now();
    var lastFPS = 60; // initial baseline
    var rafId = null;
    var lastAdjustTime = 0;

    function rafTick(now){
        frames++;
        rafId = requestAnimationFrame(rafTick);
    }

    function tryAdjustParticles(currentFps){
        // smooth the FPS a bit using previous value
        var smoothed = (lastFPS * 0.6) + (currentFps * 0.4);
        var diff = smoothed - lastFPS;

        // decide change direction
        var now = Date.now();
        if(now - lastAdjustTime < adjustCooldown) return; // rate-limit

        // get current particle instance safely
        if(!window.pJSDom || !window.pJSDom.length) return;
        var pJS = window.pJSDom[0] && window.pJSDom[0].pJS;
        if(!pJS) return;

        var current = parseInt(pJS.particles.number.value, 10) || 0;
        var newCount = current;

        if(diff <= -threshold) {
            // fps dropped — reduce particles
            newCount = Math.max(minParticles, current - step);
        } else if(diff >= threshold) {
            // fps rose — increase particles
            newCount = Math.min(maxParticles, current + step);
        }

        if(newCount !== current){
            try{
                pJS.particles.number.value = newCount;
                // refresh will rebuild particle array according to the new number
                if(pJS.fn && pJS.fn.particlesRefresh) pJS.fn.particlesRefresh();
                lastAdjustTime = now;
                // update lastFPS baseline toward smoothed value
                lastFPS = smoothed;
                // small console debugging (can be removed later)
                if(window.DEBUG_PARTICLES) console.log('Adjusted particles', current, '->', newCount, 'fps:', Math.round(currentFps));
            }catch(e){
                // ignore errors — particles.js may not be initialized yet
            }
        } else {
            // even if we didn't change, update baseline smoothing
            lastFPS = smoothed;
        }
    }

    // interval check every 1000ms
    function startMonitoring(){
        // start RAF to count frames
        if(!rafId) rafId = requestAnimationFrame(rafTick);

        setInterval(function(){
            var now = performance.now();
            var elapsed = now - lastCheck;
            if(elapsed <= 0) return;
            var currentFps = (frames / elapsed) * 1000;
            frames = 0;
            lastCheck = now;
            tryAdjustParticles(currentFps);
        }, 1000);
    }

    // Start monitoring after DOM is ready and particles.js has been initialized
    if(document.readyState === 'complete' || document.readyState === 'interactive'){
        // delay a tick to allow particlesJS() to run if it's called later in the same tick
        setTimeout(startMonitoring, 500);
    } else {
        window.addEventListener('DOMContentLoaded', function(){ setTimeout(startMonitoring, 500); });
    }

})();

