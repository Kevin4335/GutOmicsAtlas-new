var WAITING_REAPONSE = false;
var DISPLAYING_MESSAGES = [];
var FULL_SCREEN = false;
var SHIFT_PRESSED = false;
var IN_SHURUFA = false;

var current_image_src = '';
var export_name = 'image.png';

function set_vh_height() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    // console.log(height);
    var chatarea = document.getElementById('chatarea');
    var chat_messgaes = document.getElementById('chat-messages');
    chatarea.style.setProperty('--actual-vh', `${height}px`);
    chat_messgaes.style.setProperty('--actual-vh', `${height}px`);
    document.getElementById('full-screen-image').style.setProperty('--actual-vh', `${height}px`);
    document.getElementById('chat-input-text').placeholder = 'Enter to send,  Shift+Enter to change line';
    if(width <= height){
        document.getElementById('chat-input-text').placeholder = 'Enter to send';
    }
}

window.addEventListener('DOMContentLoaded', set_vh_height);
window.addEventListener('resize', set_vh_height);



function storage_init() {
    var openai_history = localStorage.getItem('openai-history');
    if(openai_history === null) {
        localStorage.setItem('openai-history', JSON.stringify([]));
    }
    var display_history = localStorage.getItem('display-history');
    if(display_history === null) {
        localStorage.setItem('display-history', JSON.stringify([]));
    }
    DISPLAYING_MESSAGES = JSON.parse(localStorage.getItem('display-history'));
    render_messages();
    if(DISPLAYING_MESSAGES.length !== 0){
        document.getElementById('chat-messages').style.display = 'block';
        document.getElementById('chat-rcmd').style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', storage_init);


function render_messages() {
    var start_line = document.getElementById('start-line');
    var end_line = document.getElementById('end-line');
    var chat_messages = document.getElementById('chat-messages');
    chat_messages.innerHTML = '';
    chat_messages.appendChild(start_line);
    for (var i = 0; i < DISPLAYING_MESSAGES.length; i++) {
        var message = DISPLAYING_MESSAGES[i];
        var message_div = document.createElement('div');
        if (message['type'] === 'user') {
            message_div.classList.add('cu');
            var p = document.createElement('p');
            // p.textContent = message['content'];
            // p.textContent = replace_all(message['content'], ' ', '&nbsp;');
            p.innerHTML = safe_encode(message['content']);
            message_div.appendChild(p);
        }
        if(message['type'] === 'text') {
            message_div.classList.add('ct');
            var p = document.createElement('p');
            // p.textContent = message['content'];
            p.innerHTML = safe_encode(message['content']);
            message_div.appendChild(p);
        }
        if(message['type'] === 'image') {
            message_div.classList.add('ci');
            var img = document.createElement('img');
            img.src = '' + message['content'];
            message_div.appendChild(img);
            img.addEventListener('click', function(link){
                return function(event){
                    console.log('img clicked');
                    var full_screen_image = document.getElementById('full-screen-image');
                    full_screen_image.style.display = 'flex';
                    document.querySelector('#full-screen-image img').src = link;
                    FULL_SCREEN = true;
                    event.stopPropagation();
                    var export_ = document.getElementById('export');
                    export_.style.display = 'none';
                    current_image_src = link;
                };
            }('' + message['content']));
            img.addEventListener('contextmenu', function(link){
                return function(e){
                    console.log('img right clicked');
                    e.preventDefault();
                    var mouse_x = e.clientX;
                    var mouse_y = e.clientY;
                    console.log(mouse_x, mouse_y);
                    var export_ = document.getElementById('export');
                    export_.style.left = (mouse_x+10) + 'px';
                    export_.style.top = mouse_y + 'px';
                    export_.style.display = 'block';
                    current_image_src = link;
                };
            }('' + message['content']), {passive: false});
        }
        if(message['type'] === 'error') {
            message_div.classList.add('ce');
            var p = document.createElement('p');
            // p.textContent = message['content'];
            p.innerHTML = safe_encode(message['content']);
            message_div.appendChild(p);
        }
        chat_messages.appendChild(message_div);
    }
    chat_messages.appendChild(end_line);
    if(DISPLAYING_MESSAGES.length === 0){
        start_line.style.display = 'none';
        end_line.style.display = 'none';
    } else {
        start_line.style.display = 'block';
        end_line.style.display = 'block';
    }
    chat_messages.scrollTop = chat_messages.scrollHeight;
    // update_scroll_effect();
    setTimeout(function(){
        chat_messages.scrollTop = chat_messages.scrollHeight; 
        update_scroll_effect();
    }, 5);
}

window.addEventListener('DOMContentLoaded', function(){
    var img_element = document.getElementById('full-screen-image');
    img_element.addEventListener('contextmenu', function(e){
        e.preventDefault();
        console.log('right click');
        var mouse_x = e.clientX;
        var mouse_y = e.clientY;
        console.log(mouse_x, mouse_y);
        var export_ = document.getElementById('export');
        export_.style.left = (mouse_x+10) + 'px';
        export_.style.top = mouse_y + 'px';
        export_.style.display = 'block';
        e.stopPropagation();
    }, {passive: false});

    var export_png = document.getElementById('export-png');
    export_png.addEventListener('click', function(event){
        event.preventDefault();
        var img_content = current_image_src;
        const tempLink = document.createElement('a');
        tempLink.href = img_content;
        tempLink.download = export_name;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    });

    var export_pdf = document.getElementById('export-pdf');
    export_pdf.addEventListener('click', function(event){
        event.preventDefault();
        var img_content = current_image_src;
        var pdf_base64 = png_to_pdf(img_content);
        const tempLink = document.createElement('a');
        tempLink.href = pdf_base64;
        tempLink.download = export_name.replace('.png', '.pdf');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    });
});

window.addEventListener('click', function(){
    var export_ = document.getElementById('export');
    export_.style.display = 'none';
})


function png_to_pdf(base64PNG) {
    // both include url header
    const { jsPDF } = window.jspdf;
    const img = document.createElement('img');
    img.src = base64PNG;
    const orientation = img.width > img.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: [img.width, img.height]
    });
    pdf.addImage(base64PNG, 'PNG', 0, 0, img.width, img.height);
    return pdf.output('datauristring');
}

function scroll_event_listener(event) {
    console.log('scrolling chat');
    var chat_messages = document.getElementById('chat-messages');
    var at_top = chat_messages.scrollTop <= 1;
    var at_bottom = chat_messages.scrollTop >= chat_messages.scrollHeight - chat_messages.clientHeight - 1;
    var delta = event.deltaY;
    if((at_top && delta < 0) || (at_bottom && delta > 0)){
        event.preventDefault();
    }
    event.stopPropagation();
}

function update_scroll_effect() {
    var chat_messages = document.getElementById('chat-messages');
    var is_overflow = chat_messages.scrollHeight > chat_messages.clientHeight;
    if(!is_overflow){
        chat_messages.removeEventListener('wheel', scroll_event_listener);
        return;
    }
    chat_messages.addEventListener('wheel', scroll_event_listener, {passive: false});

    window.addEventListener('wheel', function(event){
        console.log('scrolling window');
        // event.preventDefault();
    }, {passive: false});
}

function convert_message_urls(messages) {
    // in place
    for(var i = 0; i < messages.length; i++){
        if(messages[i]['type'] !== 'image'){
            continue;
        }
        messages[i]['content'] = replace_all(messages[i]['content'], '$data-server-url$', GLB_DATA_SERVER_URL);
    }
    return messages;
}


function send_msg() {
    if(WAITING_REAPONSE) {
        return;
    }
    var content = document.getElementById('chat-input-text').value;
    if(content === '') {
        return;
    }
    document.getElementById('chat-messages').style.display = 'block';
    document.getElementById('chat-rcmd').style.display = 'none';
    document.getElementById('chat-input-text').value = '';
    var openai_history = localStorage.getItem('openai-history');
    openai_history = JSON.parse(openai_history);
    openai_history.push({'role': 'user', 'content': content});
    openai_history = JSON.stringify(openai_history);
    var request = new XMLHttpRequest();
    request.open('POST', GLB_AI_CHAT_URL, true);
    WAITING_REAPONSE = true;
    request.timeout = 300000;
    request.onload = function() {
        WAITING_REAPONSE = false;
        document.getElementById('chat-send').classList.remove('locked');
        document.getElementById('start-new-conversation-wrapper').classList.remove('locked');
        if(request.status === 429 ){
            WAITING_REAPONSE = true;
            document.getElementById('chat-send').classList.add('locked');
            alert('HTTP 429: too much requests to the server now, please copy your input, refresh the page, and try again later.');
            return;
        }
        if(request.status === 500) {
            WAITING_REAPONSE = true;
            document.getElementById('chat-send').classList.add('locked');
            var error_msg = request.responseText;
            error_msg = "500 Internal Server Error: " + error_msg;
            alert(error_msg);
            return;
        }
        if(request.status !== 200){
            WAITING_REAPONSE = true;
            document.getElementById('chat-send').classList.add('locked');
            alert("Unknown Error. " + 'Please copy your input, refresh the page and try again.');
            return;
        }
        var response = JSON.parse(request.responseText);
        var openai_history = response.history;
        try{
            localStorage.setItem('openai-history', JSON.stringify(openai_history));
        }catch(e){
            alert('Browser storage full, please clear the history and try again.');
            WAITING_REAPONSE = true;
            document.getElementById('chat-send').classList.add('locked');
            throw new Error('Browser storage full');
        }
        var new_messages = response.messages;
        convert_message_urls(new_messages);
        DISPLAYING_MESSAGES.pop(); // remove the loading message
        for (var i = 0; i < new_messages.length; i++) {
            DISPLAYING_MESSAGES.push(new_messages[i]);
        }
        try{
            localStorage.setItem('display-history', JSON.stringify(DISPLAYING_MESSAGES));
        }catch(e){
            alert('Browser storage full, please clear the history and try again.');
            WAITING_REAPONSE = true;
            document.getElementById('chat-send').classList.add('locked');
            throw new Error('Browser storage full');
        }
        render_messages();
        // alert('test');
    };
    request.onerror = function() {
        // WAITING_REAPONSE = false;
        // document.getElementById('chat-send').classList.remove('locked');
        document.getElementById('start-new-conversation-wrapper').classList.remove('locked');
        alert('Internet Connection Error. Please copy your input, refresh the page and try again.');
    };
    request.ontimeout = function() {
        // WAITING_REAPONSE = false;
        // document.getElementById('chat-send').classList.remove('locked');
        document.getElementById('start-new-conversation-wrapper').classList.remove('locked');
        alert('Request Timeout. Please copy your input, refresh the page and try again.');
    };
    request.send(openai_history);
    DISPLAYING_MESSAGES.push({'type': 'user', "content": content});
    DISPLAYING_MESSAGES.push({'type': 'text', "content": 'Loading ......'});
    document.getElementById('chat-send').classList.add('locked');
    document.getElementById('start-new-conversation-wrapper').classList.add('locked');
    render_messages();
}
window.addEventListener('DOMContentLoaded', function() {
    document.getElementById('chat-send').addEventListener('click', send_msg);
});

function clear_history() {
    if(WAITING_REAPONSE) {
        return;
    }
    localStorage.setItem('openai-history', JSON.stringify([]));
    localStorage.setItem('display-history', JSON.stringify([]));
    DISPLAYING_MESSAGES = [];
    render_messages();
    document.getElementById('chat-messages').style.display = 'none';
    document.getElementById('chat-rcmd').style.display = 'grid';
}

window.addEventListener('DOMContentLoaded', function() {
    document.getElementById('start-new-conversation-wrapper').addEventListener('click', clear_history);
});

window.addEventListener('click', function() {
    if(FULL_SCREEN === false) {
        return;
    }
    document.getElementById('full-screen-image').style.display = 'none';
    FULL_SCREEN = false;
});

window.addEventListener('DOMContentLoaded', function() {
    var textbox = document.getElementById('chat-input-text');
    textbox.addEventListener('keydown', function(event) {
        if(event.key === 'Enter' && SHIFT_PRESSED === false && IN_SHURUFA === false) {
            event.preventDefault();
            console.log('Enter pressed');
            send_msg();
        }
    });
});

window.addEventListener('keydown', function(event) {
    if(event.key === 'Shift') {
        console.log('Shift pressed');
        SHIFT_PRESSED = true;
    }
});

window.addEventListener('keyup', function(event) {
    if(event.key === 'Shift') {
        console.log('Shift released');
        SHIFT_PRESSED = false;
    }
});

document.addEventListener('compositionstart', function() {
    IN_SHURUFA = true;
});

document.addEventListener('compositionend', function() {
    IN_SHURUFA = false;
});

window.addEventListener('DOMContentLoaded', function(){
    var rcmds = document.querySelectorAll('#chat-rcmd p');
    for(var i = 0; i < rcmds.length; i++){
        rcmds[i].addEventListener('click', function(this_content){
            return function(){
                document.getElementById('chat-input-text').value = this_content;
                document.getElementById('chat-send').click();
            }
        }(rcmds[i].textContent));
    }
});


function stringToHex(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let hex = '';
    for (let byte of bytes) {
        hex += byte.toString(16).padStart(2, '0');
    }
    return hex;
}

function replace_all(string, a, b){
    return string.split(a).join(b);
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function safe_encode(content) {
    content = escapeHtml(content);
    content = replace_all(content, '\n', '<br>');
    content = replace_all(content, '  ', ' &nbsp;'); // still allow to change line
    if(content[0] === ' '){
        content = '&nbsp;' + content.slice(1);
    }
    if(content[content.length-1] === ' '){
        content = content.slice(0, content.length-1) + '&nbsp;';
    }
    return content;
}

function hexToUTF8String(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(2 * i, 2 * i + 2), 16);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}



window.addEventListener('DOMContentLoaded', function() {
    var url = window.location.href;
    if (url.indexOf('#') === -1) {
        return;
    }
    var id = url.split('#')[1];
    if (id.length === 0) {
        return;
    }
    var data = '';
    try {
        data = hexToUTF8String(id);
    } catch (e) {
        window.location.hash = '';
        return;
    }
    window.location.hash = '';
    document.getElementById('chat-input-text').value = data;
    document.getElementById('chat-send').click();
});



function insert_style(){
    var chat = document.getElementById('chat');
    chat.style.flexDirection = 'column';
    var chat_messages = document.getElementById('chat-messages');
    chat_messages.style.overflowY = 'scroll';
    chat_messages.style.scrollbarWidth = 'none';
    var chat_input = document.getElementById('chat-input');
    chat_input.style.display = 'flex';
    chat_input.style.justifyContent = 'space-evenly';
    chat_input.style.alignItems = 'center';
    var chat_input_text = document.getElementById('chat-input-text');
    chat_input_text.style.resize = 'none';
    chat_input_text.style.overflowY = 'scroll';
    var full_screen_image = document.getElementById('full-screen-image');
    full_screen_image.style.display = 'none';
    full_screen_image.style.position = 'absolute';
    full_screen_image.style.justifyContent = 'center';
    full_screen_image.style.alignItems = 'center';
    full_screen_image.style.zIndex = '100';
    var chat_rcmd = document.getElementById('chat-rcmd');
    chat_rcmd.style.boxSizing = 'border-box';
    chat_rcmd.style.gridTemplateColumns = '1fr 1fr 1fr';
}

window.addEventListener('DOMContentLoaded', function(){
    insert_style();
    document.getElementsByTagName('body')[0].style.display = 'block';
});
