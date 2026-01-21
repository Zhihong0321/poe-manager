export function renderLayout(title: string, content: string, activePage: 'dashboard' | 'tracking' | 'market') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - PoE 2 Manager</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; display: flex; min-height: 100vh; }
        
        /* Sidebar */
        .sidebar { width: 250px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 20px 0; flex-shrink: 0; transition: transform 0.3s ease; position: sticky; top: 0; height: 100vh; }
        .brand { font-size: 1.5rem; font-weight: bold; color: #facc15; text-align: center; margin-bottom: 30px; letter-spacing: 1px; }
        .nav-link { display: block; padding: 12px 25px; color: #94a3b8; text-decoration: none; transition: 0.2s; font-size: 1.1rem; }
        .nav-link:hover { color: #f1f5f9; background: #334155; }
        .nav-link.active { background: #facc15; color: #0f172a; font-weight: bold; }
        
        /* Main Content */
        .main { flex-grow: 1; padding: 30px; width: 100%; box-sizing: border-box; }
        
        /* Mobile Header */
        .mobile-header { display: none; background: #1e293b; padding: 15px; border-bottom: 1px solid #334155; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 1000; }
        .mobile-menu-btn { background: none; border: none; color: #facc15; font-size: 1.5rem; cursor: pointer; padding: 5px; }
        
        /* Common Styles */
        h1 { color: #f1f5f9; border-bottom: 2px solid #facc15; padding-bottom: 15px; margin: 0 0 20px 0; font-size: 1.75rem; }
        h2 { color: #facc15; margin: 30px 0 10px 0; border-bottom: 1px solid #334155; padding-bottom: 10px; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 1px; }
        h3 { color: #cbd5e1; margin: 20px 0 10px 0; font-size: 1.1rem; }
        
        /* Tables */
        .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #334155; margin-bottom: 0; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; }
        th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #334155; }
        th { background: #0f172a; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #283548; }
        
        /* Utility Classes */
        .price { color: #4ade80; font-weight: bold; }
        .tab { color: #94a3b8; font-size: 0.9rem; }
        
        /* Line-based Sections (Replacing Boxes) */
        .section { 
            border-top: 1px solid #334155; 
            padding: 20px 0; 
            margin: 0; 
            background: transparent;
        }
        .section:first-of-type { border-top: none; padding-top: 0; }
        
        /* Form Sections */
        .form-group { 
            background: #1e293b; 
            padding: 20px; 
            border: 1px solid #334155;
            margin-bottom: 0; 
        }
        
        .box { 
            background: #1e293b; 
            padding: 20px; 
            border-bottom: 1px solid #334155; 
            margin: 0; 
        }
        
        .flex { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
        
        /* Forms */
        input, select { background: #0f172a; border: 1px solid #475569; color: white; padding: 12px; border-radius: 4px; outline: none; max-width: 100%; box-sizing: border-box; font-size: 1rem; }
        input:focus { border-color: #facc15; box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2); }
        
        /* Buttons */
        button { background: #facc15; border: none; color: #0f172a; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s; white-space: nowrap; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }
        button:hover { background: #eab308; transform: translateY(-1px); }
        button.danger { background: #ef4444; color: white; }
        button.danger:hover { background: #dc2626; }
        button.toggle { background: #3b82f6; color: white; }
        button.toggle:hover { background: #2563eb; }
        button.sync { background: #10b981; color: white; }
        button.sync:hover { background: #059669; }
        
        /* Status */
        .status-active { color: #4ade80; font-weight: bold; font-size: 0.8rem; letter-spacing: 0.5px; }
        .status-inactive { color: #ef4444; font-weight: bold; font-size: 0.8rem; letter-spacing: 0.5px; }

        /* Responsive */
        @media (max-width: 768px) {
            body { flex-direction: column; }
            .sidebar { 
                position: fixed; top: 0; left: 0; bottom: 0; z-index: 2000; 
                transform: translateX(-100%); width: 280px; box-shadow: 2px 0 10px rgba(0,0,0,0.5);
                height: 100vh;
            }
            .sidebar.open { transform: translateX(0); }
            .mobile-header { display: flex; }
            .main { padding: 20px; }
            .brand { display: block; margin-top: 20px; }
            
            /* Overlay when sidebar open */
            .overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1500; backdrop-filter: blur(4px); }
            .overlay.open { display: block; }

            .flex { flex-direction: column; align-items: stretch; gap: 10px; }
            .flex > * { width: 100%; }
            
            h1 { font-size: 1.5rem; }
            h2 { font-size: 1.1rem; }

            .box, .form-group { padding: 15px; }
        }

    </style>

</head>
<body>
    <div class="mobile-header">
        <span style="font-size: 1.2rem; font-weight: bold; color: #facc15;">⚡ PoE 2 Manager</span>
        <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
    </div>
    <div class="overlay" onclick="toggleSidebar()"></div>

    <div class="sidebar" id="sidebar">
        <div class="brand">⚡ PoE 2 Manager</div>
        <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="/tracking" class="nav-link ${activePage === 'tracking' ? 'active' : ''}">Trade Tracking</a>
        <a href="/market" class="nav-link ${activePage === 'market' ? 'active' : ''}">Market Watch</a>
    </div>
    <div class="main">
        ${content}
    </div>

    <!-- Status Terminal Popup -->
    <div id="status-terminal" style="position: fixed; bottom: 20px; right: 20px; width: 350px; background: #0f172a; border: 1px solid #facc15; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 3000; display: none; overflow: hidden; flex-direction: column;">
        <div style="background: #1e293b; padding: 8px 12px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #facc15; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">📡 API Live Status</span>
            <button onclick="document.getElementById('status-terminal').style.display='none'" style="background: transparent; border: none; color: #475569; padding: 0; min-width: auto; cursor: pointer;">✕</button>
        </div>
        <div id="status-logs" style="height: 200px; overflow-y: auto; padding: 10px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; display: flex; flex-direction: column; gap: 4px;">
            <!-- Logs appear here -->
        </div>
        <div style="background: #1e293b; padding: 5px 12px; border-top: 1px solid #334155; font-size: 0.65rem; color: #475569;">
            Active Sync in progress...
        </div>
    </div>

    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.overlay').classList.toggle('open');
        }

        // SSE Client
        const statusTerminal = document.getElementById('status-terminal');
        const statusLogs = document.getElementById('status-logs');
        let hideTimeout = null;

        function addLog(message, type) {
            statusTerminal.style.display = 'flex';
            
            const logEntry = document.createElement('div');
            logEntry.style.borderLeft = '2px solid transparent';
            logEntry.style.paddingLeft = '8px';
            
            let color = '#94a3b8';
            if (type === 'wait') { color = '#facc15'; logEntry.style.borderColor = '#facc15'; }
            if (type === 'success') { color = '#4ade80'; logEntry.style.borderColor = '#4ade80'; }
            if (type === 'error') { color = '#ef4444'; logEntry.style.borderColor = '#ef4444'; }
            
            logEntry.innerHTML = \`<span style="color: #475569;">[\${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span> <span style="color: \${color}">\${message}</span>\`;
            statusLogs.appendChild(logEntry);
            
            // Auto-scroll
            statusLogs.scrollTop = statusLogs.scrollHeight;

            // Remove old logs if too many
            if (statusLogs.children.length > 50) statusLogs.removeChild(statusLogs.firstChild);

            // Auto-hide after 15 seconds of inactivity
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                // Only hide if not "waiting"
                if (type !== 'wait') statusTerminal.style.display = 'none';
            }, 15000);
        }

        const eventSource = new EventSource('/api/status-stream');
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            addLog(data.message, data.type);
        };

        eventSource.onerror = () => {
            console.error("SSE Connection lost. Retrying...");
        };

        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.local-time').forEach(el => {
                const raw = el.getAttribute('data-time');
                if (raw) {
                    const date = new Date(raw);
                    // Use a nice format: "Jan 19, 10:30 PM"
                    el.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            });
            
            document.querySelectorAll('.local-time-short').forEach(el => {
                const raw = el.getAttribute('data-time');
                if (raw) {
                    const date = new Date(raw);
                    // Short format: "10:30 PM"
                    el.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            });
        });
    </script>
</body>
</html>
    `;
}
