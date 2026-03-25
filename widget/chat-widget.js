/**
 * AI Asszisztens — Embeddable Chat Widget
 * Drop this script on any website to add an AI chatbot.
 * 
 * Usage:
 * <script src="https://aiasszisztens.hu/widget/chat-widget.js" 
 *   data-bot-id="rodo" 
 *   data-color="#0071e3"
 *   data-greeting="Üdvözlöm! Miben segíthetek?"
 *   data-title="AI Asszisztens"
 * ></script>
 */
(function() {
    'use strict';

    // Config from script tag attributes
    const scriptTag = document.currentScript;
    const CONFIG = {
        botId: scriptTag?.getAttribute('data-bot-id') || 'demo',
        apiUrl: scriptTag?.getAttribute('data-api') || 'https://aiasszisztens.hu/api/chat',
        color: scriptTag?.getAttribute('data-color') || '#0071e3',
        title: scriptTag?.getAttribute('data-title') || 'AI Asszisztens',
        greeting: scriptTag?.getAttribute('data-greeting') || 'Üdvözlöm! Miben segíthetek?',
        position: scriptTag?.getAttribute('data-position') || 'right',
        avatar: scriptTag?.getAttribute('data-avatar') || '',
        lang: scriptTag?.getAttribute('data-lang') || 'hu',
    };

    // Generate unique session ID
    const SESSION_ID = 'aia_' + Math.random().toString(36).substr(2, 12);
    let isOpen = false;
    let messages = [];

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        #aia-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        
        /* Bubble button */
        #aia-bubble {
            position: fixed; bottom: 24px; ${CONFIG.position}: 24px;
            width: 60px; height: 60px; border-radius: 50%;
            background: ${CONFIG.color}; color: white;
            border: none; cursor: pointer; z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.08);
            transition: all 0.3s cubic-bezier(.4,0,.2,1);
        }
        #aia-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.2); }
        #aia-bubble.open { transform: scale(0.9) rotate(90deg); }
        #aia-bubble svg { width: 28px; height: 28px; fill: white; transition: all 0.3s; }
        
        /* Notification dot */
        #aia-bubble .aia-dot {
            position: absolute; top: -2px; right: -2px;
            width: 18px; height: 18px; border-radius: 50%;
            background: #e30000; border: 2px solid white;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: white;
            animation: aia-pulse 2s infinite;
        }
        @keyframes aia-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }

        /* Chat window */
        #aia-chat {
            position: fixed; bottom: 100px; ${CONFIG.position}: 24px;
            width: 380px; max-width: calc(100vw - 48px);
            height: 520px; max-height: calc(100vh - 140px);
            background: #fff; border-radius: 16px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08);
            z-index: 99999; display: flex; flex-direction: column;
            overflow: hidden;
            opacity: 0; visibility: hidden; transform: translateY(16px) scale(0.96);
            transition: all 0.3s cubic-bezier(.4,0,.2,1);
        }
        #aia-chat.open {
            opacity: 1; visibility: visible; transform: translateY(0) scale(1);
        }

        /* Header */
        .aia-header {
            background: ${CONFIG.color}; color: white;
            padding: 16px 20px; display: flex; align-items: center; gap: 12px;
            flex-shrink: 0;
        }
        .aia-header-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
        }
        .aia-header-info { flex: 1; }
        .aia-header-title { font-size: 15px; font-weight: 600; }
        .aia-header-status { font-size: 11px; opacity: 0.8; display: flex; align-items: center; gap: 4px; }
        .aia-header-status::before {
            content: ''; width: 6px; height: 6px; border-radius: 50%;
            background: #4ade80; display: inline-block;
        }
        .aia-header-close {
            background: none; border: none; color: white; cursor: pointer;
            font-size: 20px; padding: 4px; opacity: 0.7; transition: opacity 0.2s;
        }
        .aia-header-close:hover { opacity: 1; }

        /* Messages area */
        .aia-messages {
            flex: 1; overflow-y: auto; padding: 16px;
            display: flex; flex-direction: column; gap: 12px;
            background: #f9fafb;
        }
        .aia-messages::-webkit-scrollbar { width: 4px; }
        .aia-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

        /* Message bubbles */
        .aia-msg {
            max-width: 85%; padding: 10px 14px;
            border-radius: 16px; font-size: 14px; line-height: 1.5;
            animation: aia-fadeIn 0.3s ease;
        }
        @keyframes aia-fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .aia-msg.bot {
            background: white; color: #1d1d1f;
            border-bottom-left-radius: 4px;
            align-self: flex-start;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .aia-msg.user {
            background: ${CONFIG.color}; color: white;
            border-bottom-right-radius: 4px;
            align-self: flex-end;
        }
        .aia-msg.bot .aia-msg-time,
        .aia-msg.user .aia-msg-time {
            font-size: 10px; opacity: 0.5; margin-top: 4px;
        }

        /* Typing indicator */
        .aia-typing {
            display: flex; gap: 4px; padding: 12px 14px;
            background: white; border-radius: 16px; border-bottom-left-radius: 4px;
            align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .aia-typing span {
            width: 7px; height: 7px; border-radius: 50%; background: #ccc;
            animation: aia-typing 1.4s infinite;
        }
        .aia-typing span:nth-child(2) { animation-delay: 0.2s; }
        .aia-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aia-typing {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-6px); opacity: 1; }
        }

        /* Input area */
        .aia-input-area {
            padding: 12px 16px; background: white;
            border-top: 1px solid #f0f0f0;
            display: flex; gap: 8px; flex-shrink: 0;
        }
        .aia-input {
            flex: 1; border: 1px solid #e5e7eb; border-radius: 24px;
            padding: 10px 16px; font-size: 14px; font-family: inherit;
            outline: none; transition: border-color 0.2s;
            color: #1d1d1f;
        }
        .aia-input::placeholder { color: #9ca3af; }
        .aia-input:focus { border-color: ${CONFIG.color}; }
        .aia-send {
            width: 40px; height: 40px; border-radius: 50%;
            background: ${CONFIG.color}; color: white; border: none;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s; flex-shrink: 0;
        }
        .aia-send:hover { transform: scale(1.05); }
        .aia-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .aia-send svg { width: 18px; height: 18px; fill: white; }

        /* Powered by */
        .aia-powered {
            text-align: center; padding: 6px; background: white;
            font-size: 10px; color: #9ca3af;
        }
        .aia-powered a { color: #6b7280; text-decoration: none; }
        .aia-powered a:hover { color: ${CONFIG.color}; }

        /* Quick replies */
        .aia-quick-replies {
            display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;
        }
        .aia-quick-btn {
            padding: 6px 12px; border-radius: 16px;
            background: white; color: ${CONFIG.color};
            border: 1px solid ${CONFIG.color}; font-size: 12px;
            cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .aia-quick-btn:hover {
            background: ${CONFIG.color}; color: white;
        }

        /* Mobile */
        @media (max-width: 480px) {
            #aia-chat {
                bottom: 0; right: 0; left: 0;
                width: 100%; max-width: 100%;
                height: 100vh; max-height: 100vh;
                border-radius: 0;
            }
            #aia-bubble { bottom: 16px; right: 16px; }
        }
    `;
    document.head.appendChild(style);

    // Create widget HTML
    const widget = document.createElement('div');
    widget.id = 'aia-widget';
    widget.innerHTML = `
        <!-- Bubble -->
        <button id="aia-bubble" onclick="window.__aiaToggle()">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <span class="aia-dot" id="aia-dot">1</span>
        </button>

        <!-- Chat Window -->
        <div id="aia-chat">
            <div class="aia-header">
                <div class="aia-header-avatar">🤖</div>
                <div class="aia-header-info">
                    <div class="aia-header-title">${CONFIG.title}</div>
                    <div class="aia-header-status">Online</div>
                </div>
                <button class="aia-header-close" onclick="window.__aiaToggle()">✕</button>
            </div>
            <div class="aia-messages" id="aia-messages"></div>
            <div class="aia-input-area">
                <input class="aia-input" id="aia-input" placeholder="Írjon üzenetet..." autocomplete="off">
                <button class="aia-send" id="aia-send" onclick="window.__aiaSend()">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
            <div class="aia-powered">
                Működteti: <a href="https://aiasszisztens.hu" target="_blank">AI Asszisztens</a>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Message helpers
    function addMessage(text, type = 'bot', quickReplies = null) {
        const container = document.getElementById('aia-messages');
        const time = new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `aia-msg ${type}`;
        msgDiv.innerHTML = `${text}<div class="aia-msg-time">${time}</div>`;
        container.appendChild(msgDiv);

        if (quickReplies && quickReplies.length > 0) {
            const qrDiv = document.createElement('div');
            qrDiv.className = 'aia-quick-replies';
            quickReplies.forEach(qr => {
                const btn = document.createElement('button');
                btn.className = 'aia-quick-btn';
                btn.textContent = qr;
                btn.onclick = () => {
                    qrDiv.remove();
                    sendMessage(qr);
                };
                qrDiv.appendChild(btn);
            });
            container.appendChild(qrDiv);
        }

        container.scrollTop = container.scrollHeight;
        messages.push({ role: type === 'user' ? 'user' : 'assistant', content: text });
    }

    function showTyping() {
        const container = document.getElementById('aia-messages');
        const typing = document.createElement('div');
        typing.className = 'aia-typing';
        typing.id = 'aia-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('aia-typing');
        if (el) el.remove();
    }

    // API call
    async function sendMessage(text) {
        addMessage(text, 'user');
        
        const input = document.getElementById('aia-input');
        const sendBtn = document.getElementById('aia-send');
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;

        showTyping();

        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_id: CONFIG.botId,
                    session_id: SESSION_ID,
                    message: text,
                    history: messages.slice(-10)
                })
            });

            hideTyping();

            if (response.ok) {
                const data = await response.json();
                addMessage(data.reply, 'bot', data.quick_replies || null);
                
                if (data.handoff) {
                    addMessage('🔔 Értesítettem egy kollégát, aki hamarosan felveszi Önnel a kapcsolatot.', 'bot');
                }
            } else {
                addMessage('Sajnos technikai hiba történt. Kérem, próbálja újra!', 'bot');
            }
        } catch (e) {
            hideTyping();
            // Offline/demo mode - simple responses
            const demoReply = getDemoReply(text);
            addMessage(demoReply.text, 'bot', demoReply.quickReplies);
        }

        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }

    // Demo mode responses (when API is not available)
    function getDemoReply(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('szia') || lower.includes('hello') || lower.includes('helló')) {
            return { text: CONFIG.greeting, quickReplies: ['Árak', 'Nyitvatartás', 'Kapcsolat'] };
        }
        if (lower.includes('ár') || lower.includes('mennyibe')) {
            return { text: 'Az árakkal kapcsolatban kérem, vegye fel velünk a kapcsolatot a pontos ajánlatért! Milyen szolgáltatás érdekli?', quickReplies: ['Ajánlatkérés', 'Kapcsolat'] };
        }
        if (lower.includes('nyitva') || lower.includes('mikor')) {
            return { text: 'Hétfőtől péntekig 8:00-17:00 között állunk rendelkezésére. Hétvégén zárva tartunk.', quickReplies: ['Árak', 'Kapcsolat'] };
        }
        if (lower.includes('kapcsolat') || lower.includes('telefon') || lower.includes('email')) {
            return { text: 'Elérhetőségeinket a weboldalunkon találja. Szeretné, ha visszahívnánk? Ehhez kérem adja meg a telefonszámát!', quickReplies: [] };
        }
        if (lower.includes('köszön') || lower.includes('köszi') || lower.includes('viszlát')) {
            return { text: 'Köszönöm a megkeresést! Ha bármi kérdése van, keressen bátran. Szép napot kívánok! 😊', quickReplies: [] };
        }
        
        return { 
            text: 'Köszönöm az érdeklődést! Hogy segíthessek a legjobban, kérem, mondja el pontosabban, miben segíthetek?', 
            quickReplies: ['Árak', 'Szolgáltatások', 'Kapcsolat'] 
        };
    }

    // Toggle chat
    window.__aiaToggle = function() {
        isOpen = !isOpen;
        document.getElementById('aia-chat').classList.toggle('open', isOpen);
        document.getElementById('aia-bubble').classList.toggle('open', isOpen);
        
        // Hide notification dot
        if (isOpen) {
            document.getElementById('aia-dot').style.display = 'none';
        }
        
        // Show greeting on first open
        if (isOpen && messages.length === 0) {
            setTimeout(() => {
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    addMessage(CONFIG.greeting, 'bot', ['Árak', 'Szolgáltatások', 'Kapcsolat']);
                }, 800);
            }, 300);
        }

        if (isOpen) {
            setTimeout(() => document.getElementById('aia-input').focus(), 300);
        }
    };

    // Send on button click
    window.__aiaSend = function() {
        const input = document.getElementById('aia-input');
        const text = input.value.trim();
        if (text) sendMessage(text);
    };

    // Send on Enter
    document.getElementById('aia-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            window.__aiaSend();
        }
    });

    // Auto-open after delay (optional)
    // setTimeout(() => {
    //     if (!isOpen) document.getElementById('aia-dot').style.display = 'flex';
    // }, 5000);

})();
