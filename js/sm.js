const GLB_LEFT_RATIO = 558 / 3000;
const GLB_RIGHT_RATIO = 2033 / 3000;
const GLB_TOP_RATIO = 298 / 15600;
const GLB_BOTTOM_RATIO = 14993 / 15600;
const GLB_BLOCK_NUM = 295;
const GLB_ZOOM_RATIO = 1.135;
const GLB_MAX_ZOOM_LEVEL = 5;
const GLB_MIN_ZOOM_LEVEL = -7;
const GLB_INIT_SIZE = 45;
const GLB_IMG_WINDOW_HEIGHT = 55;
const GLB_IMG_HEIGHT = 15600 / 3000;

var GLB_CURRENT_WIDTH = 0;
var GLB_scroll_center = GLB_IMG_WINDOW_HEIGHT / 2 / GLB_INIT_SIZE;
var GLB_zoom_level = 0;

// storage_service = localStorage;
var storage_service = sessionStorage;


function render() {
    // assume that scroll_center and zoom_level is legal
    var current_ratio = Math.pow(GLB_ZOOM_RATIO, GLB_zoom_level);
    var top_unreachable = GLB_IMG_WINDOW_HEIGHT / 2 / GLB_INIT_SIZE / current_ratio;
    var edge_top = GLB_scroll_center - top_unreachable;
    var scroll_top = edge_top * GLB_INIT_SIZE * current_ratio;
    document.getElementById('scroll-container').scrollTop = scroll_top * GLB_CURRENT_WIDTH / 100;
    document.getElementById('scroll-container').style.width = (GLB_INIT_SIZE * current_ratio) + 'vw';
}


function render_forever() {
    render();
    setTimeout(render_forever, 10);
}


window.addEventListener('DOMContentLoaded', function () {
    GLB_CURRENT_WIDTH = window.innerWidth;
    var tmp = storage_service.getItem('sm_scroll_center');
    var zoom_level = storage_service.getItem('sm_zoom_level');
    if (zoom_level === null) {
        storage_service.setItem('sm_zoom_level', 0);
    } else {
        GLB_zoom_level = parseInt(zoom_level);
    }
    if (tmp === null) {
        storage_service.setItem('sm_scroll_center', GLB_scroll_center);
    } else {
        GLB_scroll_center = parseFloat(tmp);
    }
    render();

    console.log('DOMContentLoaded' + new Date().getTime());  // after back, DOMContentLoaded will still be called
    var container = document.getElementById('image-container');
    for (var i = 0; i < GLB_BLOCK_NUM; i++) {
        var area = document.createElement('a');
        area.style.left = GLB_LEFT_RATIO * 100 + '%';
        area.style.width = (GLB_RIGHT_RATIO - GLB_LEFT_RATIO) * 100 + '%';
        area.style.top = (GLB_TOP_RATIO + i * (GLB_BOTTOM_RATIO - GLB_TOP_RATIO) / GLB_BLOCK_NUM) * 100 + '%';
        area.style.height = ((GLB_BOTTOM_RATIO - GLB_TOP_RATIO) / GLB_BLOCK_NUM) * 100 + '%';
        area.href = '/html/sm-' + (i + 1) + '.html';
        container.appendChild(area);
    }

    window.addEventListener('resize', function () {
        GLB_CURRENT_WIDTH = window.innerWidth;
        render();
    });

    document.getElementById('scroll-container').addEventListener('wheel', function (e) {
        var scroll_px = e.deltaY;
        var scroll_vw = scroll_px / GLB_CURRENT_WIDTH;
        var current_ratio = Math.pow(GLB_ZOOM_RATIO, GLB_zoom_level);
        var top_unreachable = GLB_IMG_WINDOW_HEIGHT / 2 / GLB_INIT_SIZE / current_ratio;
        var bottom_unreachable = GLB_IMG_HEIGHT - top_unreachable;
        var scrolled = scroll_vw / GLB_INIT_SIZE * 100 / current_ratio;
        GLB_scroll_center += scrolled;
        if (GLB_scroll_center < top_unreachable) {
            GLB_scroll_center = top_unreachable;
        }
        if (GLB_scroll_center > bottom_unreachable) {
            GLB_scroll_center = bottom_unreachable;
        }
        storage_service.setItem('sm_scroll_center', GLB_scroll_center);
        e.preventDefault();
        render();
    });

    document.getElementById('zoom-up').addEventListener('click', function () {
        if (GLB_zoom_level == GLB_MAX_ZOOM_LEVEL) {
            return;
        }
        GLB_zoom_level++;
        var current_ratio = Math.pow(GLB_ZOOM_RATIO, GLB_zoom_level);
        var top_unreachable = GLB_IMG_WINDOW_HEIGHT / 2 / GLB_INIT_SIZE / current_ratio;
        var bottom_unreachable = GLB_IMG_HEIGHT - top_unreachable;
        if (GLB_scroll_center < top_unreachable) {
            GLB_scroll_center = top_unreachable;
        }
        if (GLB_scroll_center > bottom_unreachable) {
            GLB_scroll_center = bottom_unreachable;
        }
        storage_service.setItem('sm_scroll_center', GLB_scroll_center);
        storage_service.setItem('sm_zoom_level', GLB_zoom_level);
        render();
    });

    document.getElementById('zoom-down').addEventListener('click', function () {
        if (GLB_zoom_level == GLB_MIN_ZOOM_LEVEL) {
            return;
        }
        GLB_zoom_level--;
        var current_ratio = Math.pow(GLB_ZOOM_RATIO, GLB_zoom_level);
        var top_unreachable = GLB_IMG_WINDOW_HEIGHT / 2 / GLB_INIT_SIZE / current_ratio;
        var bottom_unreachable = GLB_IMG_HEIGHT - top_unreachable;
        if (GLB_scroll_center < top_unreachable) {
            GLB_scroll_center = top_unreachable;
        }
        if (GLB_scroll_center > bottom_unreachable) {
            GLB_scroll_center = bottom_unreachable;
        }
        storage_service.setItem('sm_scroll_center', GLB_scroll_center);
        storage_service.setItem('sm_zoom_level', GLB_zoom_level);
        render();
    });

    render_forever();
});