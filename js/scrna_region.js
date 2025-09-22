// scrna_region.js
// This script updates the age banner at the top of the Region Comparison page
// so that it shows the correct age (Fetal or Adult) based on the URL parameter.
//
// How it works:
// - When the page loads, it checks the URL for a parameter like ?age=fetal or ?age=adult
// - It then updates the banner text to match the selected age
// - If no age is found in the URL, it shows 'Fetal or Adult' by default

// Wait until the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
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

    // Update banner as well
    function updateAgeBanner() {
        const age = getAgeFromUrl();
        var ageBanner = document.getElementById('age-banner');
        if (ageBanner) {
            ageBanner.textContent = age.charAt(0).toUpperCase() + age.slice(1);
            ageBanner.style.display = 'block';
        }
    }

    updateAgeBanner();
});
