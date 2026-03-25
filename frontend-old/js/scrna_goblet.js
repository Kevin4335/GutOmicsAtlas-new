// scrna_goblet.js
// This script updates the age banner at the top of the Goblet Cells page
// so that it shows the correct age (Fetal or Adult) based on the URL parameter.
//
// How it works:
// - When the page loads, it checks the URL for a parameter like ?age=fetal or ?age=adult
// - It then updates the banner text to match the selected age
// - If no age is found in the URL, it shows 'Fetal or Adult' by default

// Wait until the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Helper function to get the age from the URL
    function getAgeFromUrl() {
        const hash = window.location.hash;
        if (hash.startsWith('#age=')) {
            const age = hash.replace("#age=", "");
            if (age === 'fetal' || age === 'adult') {
                return age;
            }
        }
        return 'adult'; // Default to adult if not specified
    }

    function updateGobletLeftImage() {
        const age = getAgeFromUrl();
        var gobletLeft = document.getElementById('goblet-left');
        if (gobletLeft && gobletLeft.hasAttribute('data-adult') && gobletLeft.hasAttribute('data-fetal')) {
            gobletLeft.src = gobletLeft.getAttribute('data-' + age);
        }
    }


    function updateGobletRightImage() {
        const age = getAgeFromUrl();
        var gobletRight = document.getElementById('goblet-right');
        if (gobletRight && gobletRight.hasAttribute('data-adult') && gobletRight.hasAttribute('data-fetal')) {
            gobletRight.src = gobletRight.getAttribute('data-' + age);
        }
    }

    // Update banner as well
    function updateAgeBanner() {
        const age = getAgeFromUrl();
        var ageBanner = document.getElementById('age-banner');
        if (ageBanner) {
            ageBanner.textContent = age.charAt(0).toUpperCase() + age.slice(1);
            ageBanner.style.display = 'block';
        }
    }

    updateGobletLeftImage();
    updateGobletRightImage();
    updateAgeBanner();
});
