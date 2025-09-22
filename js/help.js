window.addEventListener('DOMContentLoaded', function() {
    var width = window.innerWidth;
    var ratio = width * 0.55 / 695;
    var youtube = document.getElementById('youtube');
    youtube.style.transform = `scale(${ratio})`;
});

window.addEventListener('resize', function() {
    var width = window.innerWidth;
    var ratio = width * 0.55 / 695;
    var youtube = document.getElementById('youtube');
    youtube.style.transform = `scale(${ratio})`;
});