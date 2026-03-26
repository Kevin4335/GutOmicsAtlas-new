// scrna_region.js
// This script handles the age toggle on the Region Comparison page
// allowing users to switch between Fetal and Adult data views.

var currentAge = 'adult'; // Default to adult

// Wait until the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const fetalToggle = document.getElementById('fetal-toggle');
    const adultToggle = document.getElementById('adult-toggle');

    console.log('Region page loaded, toggles found:', fetalToggle, adultToggle);

    // Check URL hash for initial age (for backward compatibility with links)
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

    // Initialize with age from URL or default
    currentAge = getAgeFromUrl();
    console.log('Initial age:', currentAge);

    // Update toggle appearance based on current age
    function updateToggleAppearance() {
        if (currentAge === 'fetal') {
            if (fetalToggle) fetalToggle.classList.add('active');
            if (adultToggle) adultToggle.classList.remove('active');
        } else {
            if (adultToggle) adultToggle.classList.add('active');
            if (fetalToggle) fetalToggle.classList.remove('active');
        }
    }

    function updateRegionImages() {
        const regionSmall = document.getElementById('region-small');
        const regionLarge = document.getElementById('region-large');

        if (regionSmall && regionSmall.hasAttribute('data-adult') && regionSmall.hasAttribute('data-fetal')) {
            regionSmall.src = regionSmall.getAttribute('data-' + currentAge);
            console.log('Updated small image to:', regionSmall.src);
        }

        if (regionLarge && regionLarge.hasAttribute('data-adult') && regionLarge.hasAttribute('data-fetal')) {
            regionLarge.src = regionLarge.getAttribute('data-' + currentAge);
            console.log('Updated large image to:', regionLarge.src);
        }
    }

    function updateRegionDegLink() {
        const degLink = document.getElementById('region-xls');
        if (degLink && degLink.hasAttribute('data-adult') && degLink.hasAttribute('data-fetal')) {
            degLink.href = degLink.getAttribute('data-' + currentAge);
            console.log('Updated download link to:', degLink.href);
        }
    }

    function updateAll() {
        console.log('Updating all to age:', currentAge);
        updateToggleAppearance();
        updateRegionImages();
        updateRegionDegLink();
    }

    // Handle fetal toggle click
    if (fetalToggle) {
        fetalToggle.addEventListener('click', function(e) {
            console.log('Fetal toggle clicked');
            e.preventDefault();
            if (currentAge !== 'fetal') {
                currentAge = 'fetal';
                window.location.hash = 'age=fetal';
                updateAll();
            }
        });
    }

    // Handle adult toggle click
    if (adultToggle) {
        adultToggle.addEventListener('click', function(e) {
            console.log('Adult toggle clicked');
            e.preventDefault();
            if (currentAge !== 'adult') {
                currentAge = 'adult';
                window.location.hash = 'age=adult';
                updateAll();
            }
        });
    }

    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', function() {
        const newAge = getAgeFromUrl();
        if (newAge !== currentAge) {
            currentAge = newAge;
            updateAll();
        }
    });

    // Initialize on page load
    updateAll();

    // Image Zoom Modal Functionality
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalClose = document.querySelector('.modal-close');
    const regionImages = document.querySelectorAll('#region-small, #region-large');

    // Add click event to all region images
    regionImages.forEach(img => {
        img.addEventListener('click', function() {
            if (modal && modalImg) {
                modal.classList.add('active');
                modalImg.src = this.src;
            }
        });
    });

    // Close modal on clicking the X button
    if (modalClose) {
        modalClose.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.classList.remove('active');
        });
    }

    // Close modal on clicking the background
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target === modalImg) {
                modal.classList.remove('active');
            }
        });
    }

    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
});
