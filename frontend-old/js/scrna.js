

var GLB_SELECTED = "";

// This code waits until the web page is fully loaded before running
document.addEventListener('DOMContentLoaded', function() {
    console.log("fetal:", document.getElementById('fetal-btn'));
    console.log("adult:", document.getElementById('adult-btn'));
    console.log("banner:", document.getElementById('age-banner'));

    // Get references to important elements on the page:
    // - ageSelection: The area with the "Fetal" and "Adult" buttons
    // - ageBanner: The colored bar that will display the selected age
    // - cellSelection: The area with the cell type radio buttons
    // - cardSelection: (optional) Card-style cell type buttons (not always present)
    // - subTitle: (optional) Subtitle above cell type selection
    const ageSelection = document.getElementById('age-selection');
    const fetalBtn = document.getElementById("fetal-btn");
    const adultBtn = document.getElementById("adult-btn");
    const ageBanner = document.getElementById("age-banner")
    const cellSelection = document.getElementById('cell-selection');
    const cardSelection = document.querySelector('.card-selection');
    const subTitle = document.querySelector('.sub-title');

    if (fetalBtn) {
        fetalBtn.addEventListener("change", () => {
        if (fetalBtn.checked) {
            ageBanner.style.display = "block";
            ageBanner.textContent = "Fetal";
        }
        });
    }

    if (adultBtn) {
        adultBtn.addEventListener("change", () => {
        if (adultBtn.checked) {
            ageBanner.style.display = "block";
            ageBanner.textContent = "Adult";
        }
        });
    }

    // When the page loads, hide the cell type selection and the age banner
    if (cellSelection) cellSelection.classList.add('hidden'); // Hide cell type radio buttons initially
    if (ageBanner) ageBanner.style.display = 'none';          // Hide the age banner initially

    document.getElementById('fetal-btn').addEventListener('click', function() {
        showCellSelection('Fetal');
    });
    document.getElementById('adult-btn').addEventListener('click', function() {
        showCellSelection('Adult');
    });

    // This function is called when the user clicks either "Fetal" or "Adult"
    // It hides the age selection, shows the banner, and displays the cell type options
    function showCellSelection(age) {
        // Hide the "Fetal/Adult" selection buttons
        if (ageSelection) ageSelection.style.display = 'none';
        // Show the banner and set its text to the selected age
        if (ageBanner) {
            ageBanner.textContent = age;
            ageBanner.style.display = 'block';
        }
        // Show the cell type selection area below the banner
        if (cellSelection) {
            cellSelection.classList.remove('hidden');
            cellSelection.style.display = 'flex';
            cellSelection.style.marginTop = '1vw';
            cellSelection.style.justifyContent = 'center';
            cellSelection.style.position = 'static'; // Make sure it doesn't overlap other content
        }
        // Hide card-style cell type selection if it exists
        if (cardSelection) cardSelection.style.display = 'none';
        // If there is a subtitle, update it to show the selected age
        if (subTitle) subTitle.textContent = `Select Cell Type (${age})`;

        // Save the selected age in a global variable for use elsewhere if needed
        window.selectedAge = age;

        // --- Default to Epithelial cell selection and content ---
        // Set the Epithelial radio button as checked
        var epRadio = document.getElementById('ep-select');
        if (epRadio) {
            // Simulate a user click on the Epithelial radio button
            epRadio.click();
        }
    }


    // Helper function: returns the selected age as a string ('fetal', 'adult', or '')
    function getSelectedAge() {
        if (document.getElementById('fetal-btn').checked) return 'fetal';
        if (document.getElementById('adult-btn').checked) return 'adult';
        return '';
    }

    // This function updates the links for Region Comparison and Goblet Cells
    // so that they include the selected age in the URL (e.g., ?age=fetal)
    function updateLinks() {
        var age = getSelectedAge();
        var regionBtn = document.getElementById('region-button');
        var gobletBtn = document.getElementById('goblet-button');
        var regionUrl = '/html/scrna_region.html';
        var gobletUrl = '/html/scrna_goblet.html';
        if (age) {
            regionUrl += '#age=' + age;
            gobletUrl += '#age=' + age;
        }
        regionBtn.href = regionUrl;
        gobletBtn.href = gobletUrl;
    }

    // Whenever the user changes the age selection, update the links
    document.getElementById('fetal-btn').addEventListener('change', updateLinks);
    document.getElementById('adult-btn').addEventListener('change', updateLinks);

    // Set the links correctly when the page first loads
    updateLinks();

    // This function updates the images for Epithelial and Enteroendocrine cells
    // so that the correct images are shown for "Fetal" or "Adult" selection.
    // It works by swapping the image source (src) based on which radio button is selected.
    function updateStaticImages() {
        // Determine which age is selected ("fetal" or "adult")
        var age = '';
        if (document.getElementById('fetal-btn').checked) age = 'fetal';
        if (document.getElementById('adult-btn').checked) age = 'adult';

        // Get the Epithelial cell images (left and right)
        var epLeft = document.getElementById('ep-left');
        var epRight = document.getElementById('ep-right');
        // If both images exist, update their src attribute to the correct image for the selected age
        if (epLeft && epRight) {
            // The data-adult and data-fetal attributes on the <img> tag store the correct image paths
            epLeft.src = epLeft.getAttribute('data-' + (age || 'adult'));
            epRight.src = epRight.getAttribute('data-' + (age || 'adult'));
        }

        // Get the Enteroendocrine cell images (left and right)
        var eecsLeft = document.getElementById('eecs-left');
        var eecsRight = document.getElementById('eecs-right');
        // If both images exist, update their src attribute to the correct image for the selected age
        if (eecsLeft && eecsRight) {
            eecsLeft.src = eecsLeft.getAttribute('data-' + (age || 'adult'));
            eecsRight.src = eecsRight.getAttribute('data-' + (age || 'adult'));
        }
    }

    // Whenever the user changes the "Fetal" or "Adult" selection,
    // call updateStaticImages to show the correct images
    document.getElementById('fetal-btn').addEventListener('change', updateStaticImages);
    document.getElementById('adult-btn').addEventListener('change', updateStaticImages);
    // Also call it once when the page loads to set the initial images
    updateStaticImages();
});


var GLB_GENES_FORMATTED_TO_ORIGIN = {};
var GLB_EMAIL_OK = false;

for (var i = 0; i < GLB_GENES.length; i++) {
    GLB_GENES_FORMATTED_TO_ORIGIN[GLB_GENES[i].toUpperCase()] = GLB_GENES[i];
}


window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('ep-select').addEventListener('click', function () {
        if (GLB_SELECTED == "EP") {
            return;
        }
        GLB_SELECTED = "EP";
        document.getElementById('whole-img-container').classList.add('init');
        document.getElementById('whole-img-container').classList.remove('eecs');
        document.getElementById('whole-img-container').classList.add('ep');
        document.getElementById('input-area').classList.add('ep');
        document.getElementById('input-area').classList.remove('eecs');
        document.getElementById('main-container').style.minHeight = '50vw';
        // clear the generated images
        document.getElementById('whole-img-container').classList.remove('generated');
        document.getElementById('error-msg').innerHTML = "";
        document.getElementById('gene-input').value = "";
    });

    document.getElementById('eecs-select').addEventListener('click', function () {
        if (GLB_SELECTED == "EECS") {
            return;
        }
        GLB_SELECTED = "EECS";
        document.getElementById('whole-img-container').classList.add('init');
        document.getElementById('whole-img-container').classList.remove('ep');
        document.getElementById('whole-img-container').classList.add('eecs');
        document.getElementById('input-area').classList.add('eecs');
        document.getElementById('input-area').classList.remove('ep');
        document.getElementById('main-container').style.minHeight = '50vw';
        // clear the generated images
        document.getElementById('whole-img-container').classList.remove('generated');
        document.getElementById('error-msg').innerHTML = "";
        document.getElementById('gene-input').value = "";
    });

    document.getElementById('submit-button').addEventListener('click', function() {
        var input = document.getElementById('gene-input').value;
        if (input == "") {
            document.getElementById('error-msg').innerHTML = "Gene cannot be empty!";
            return;
        }
        var input_formatted = input.toUpperCase();
        if (!(input_formatted in GLB_GENES_FORMATTED_TO_ORIGIN)) {
            document.getElementById('error-msg').innerHTML = "Gene not found: " + input;
            return;
        }
        if (GLB_SELECTED == "EP" && !GLB_EMAIL_OK) {
            document.getElementById('error-msg').innerHTML = "Email is not valid";
            return;
        }

        input = GLB_GENES_FORMATTED_TO_ORIGIN[input_formatted];
        document.getElementById('error-msg').innerHTML = "";

        // --- NEW: get sample type (fetal or adult) ---
        var sampleType = '';
        if (document.getElementById('fetal-btn').checked) sampleType = 'fetal';
        if (document.getElementById('adult-btn').checked) sampleType = 'adult';

        var data = {
            function: "scrna",
            type: GLB_SELECTED.toLowerCase(),  // "ep" or "eecs"
            sample_type: sampleType,           // "fetal" or "adult"
            gene: input,
            pdf_path: "combined_plot.pdf",     // or generate dynamically if needed
            email: document.getElementById('email-input').value
        };

        data = JSON.stringify(data);
        data = stringToHex(data);
        var url = `${GLB_API_SERVER_URL}/${data}`;
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.timeout = 180000;

        request.onload = function() {
            if (request.status === 202) {
                document.getElementById('main-img-container').className = '';
                document.getElementById('main-img-container').classList.add('email');
                return;
            }
            var response = request.responseText;
            response = JSON.parse(response);
            if (request.status === 200) {
                var png = response['img'];
                png = 'data:image/png;base64,' + png;
                document.getElementById('final-img').src = png;
                document.getElementById('main-img-container').className = '';
                document.getElementById('main-img-container').classList.add('shown');
                return;
            }
            var error_message = response['error'];
            document.getElementById('error').innerHTML = "Error: " + error_message;
            document.getElementById('main-img-container').className = '';
            document.getElementById('main-img-container').classList.add('error');
        };

        request.onerror = function() {
            document.getElementById('error').innerHTML = "Network error";
            document.getElementById('main-img-container').className = '';
            document.getElementById('main-img-container').classList.add('error');
        };
        request.ontimeout = function() {
            document.getElementById('error').innerHTML = "Request timeout";
            document.getElementById('main-img-container').className = '';
            document.getElementById('main-img-container').classList.add('error');
        };

        request.send();
        document.getElementById('whole-img-container').classList.remove('init');
        document.getElementById('whole-img-container').classList.add('generated');
        document.getElementById('main-img-container').className = '';
        document.getElementById('main-img-container').classList.add('loading');
    });
});

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('email-input').addEventListener('input', function(){
        var email = document.getElementById('email-input').value;
        if (email === ''){
            GLB_EMAIL_OK = false;
            return;
        }
        if (/^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]+$/.test(email)){
            GLB_EMAIL_OK = true;
        } else {
            GLB_EMAIL_OK = false;
        }
    });
});

window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.card-selection').forEach(elem => {
                elem.classList.add('hidden');
            });

            document.querySelectorAll('.lib-2-to-1').forEach(elem => {
                elem.classList.remove('hidden');
            });

            document.querySelectorAll('.sub-title').forEach(elem => {
                elem.classList.add('hidden');
            });

            document.querySelectorAll('.sub-description').forEach(elem => {
                elem.classList.add('hidden');
            });
        });
    });
});

window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.chat-button').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.chat-container') 
                .querySelectorAll('.chat-box') 
                .forEach(box => {
                    if (box.classList.contains('hidden')) {
                        box.classList.remove('hidden');
                    } else {
                        box.classList.add('hidden');
                    }
                });
        });
    });
});