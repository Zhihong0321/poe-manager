export function renderLayout(title, content, activePage) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - PoE 2 Manager</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar */
        .sidebar { width: 250px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 20px 0; height: 100%; flex-shrink: 0; transition: transform 0.3s ease; }
        .brand { font-size: 1.5rem; font-weight: bold; color: #facc15; text-align: center; margin-bottom: 30px; letter-spacing: 1px; }
        .nav-link { display: block; padding: 12px 25px; color: #94a3b8; text-decoration: none; transition: 0.2s; font-size: 1.1rem; }
        .nav-link:hover { color: #f1f5f9; background: #334155; }
        .nav-link.active { background: #facc15; color: #0f172a; font-weight: bold; }
        
        /* Main Content */
        .main { flex-grow: 1; overflow-y: auto; padding: 30px; width: 100%; }
        
        /* Mobile Header */
        .mobile-header { display: none; background: #1e293b; padding: 15px; border-bottom: 1px solid #334155; align-items: center; justify-content: space-between; }
        .mobile-menu-btn { background: none; border: none; color: #facc15; font-size: 1.5rem; cursor: pointer; padding: 5px; }
        
        /* Common Styles */
        h1 { color: #f1f5f9; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0; }
        h2 { color: #cbd5e1; margin-top: 30px; border-bottom: 1px solid #334155; padding-bottom: 5px; font-size: 1.2rem; }
        
        /* Tables */
        .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #1e293b; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); min-width: 600px; }
        th, td { text-align: left; padding: 15px; border-bottom: 1px solid #334155; }
        th { background: #334155; color: #e2e8f0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #283548; }
        
        /* Utility Classes */
        .price { color: #4ade80; font-weight: bold; }
        .tab { color: #94a3b8; font-size: 0.9rem; }
        .box { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .flex { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        
        /* Forms */
        input, select { background: #0f172a; border: 1px solid #475569; color: white; padding: 10px; border-radius: 6px; outline: none; max-width: 100%; box-sizing: border-box; }
        input:focus { border-color: #facc15; }
        
        /* Buttons */
        button { background: #facc15; border: none; color: #0f172a; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; white-space: nowrap; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        button.danger { background: #ef4444; color: white; }
        button.toggle { background: #3b82f6; color: white; }
        button.sync { background: #10b981; color: white; }
        
        /* Status */
        .status-active { color: #4ade80; font-weight: bold; background: rgba(74, 222, 128, 0.1); padding: 4px 8px; border-radius: 4px; }
        .status-inactive { color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; }

        /* Responsive */
        @media (max-width: 768px) {
            body { flex-direction: column; height: auto; min-height: 100vh; }
            .sidebar { 
                position: fixed; top: 0; left: 0; bottom: 0; z-index: 1000; 
                transform: translateX(-100%); width: 250px; box-shadow: 2px 0 10px rgba(0,0,0,0.5);
            }
            .sidebar.open { transform: translateX(0); }
            .mobile-header { display: flex; position: sticky; top: 0; z-index: 900; }
            .main { padding: 15px; overflow: visible; }
            .brand { display: none; } /* Show in mobile header instead */
            
            /* Overlay when sidebar open */
            .overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 950; }
            .overlay.open { display: block; }

            .box.flex { flex-direction: column; align-items: stretch; }
            .box.flex > * { width: 100%; margin-bottom: 10px; }
            input[style*="width: 200px"], input[style*="width: 150px"] { width: 100% !important; }
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
    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.overlay').classList.toggle('open');
        }

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
//# sourceMappingURL=layout.js.map