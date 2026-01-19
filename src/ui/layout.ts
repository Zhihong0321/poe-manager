export function renderLayout(title: string, content: string, activePage: 'dashboard' | 'tracking' | 'market') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - PoE 2 Manager</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; display: flex; height: 100vh; }
        
        /* Sidebar */
        .sidebar { width: 250px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 20px 0; }
        .brand { font-size: 1.5rem; font-weight: bold; color: #facc15; text-align: center; margin-bottom: 30px; letter-spacing: 1px; }
        .nav-link { display: block; padding: 12px 25px; color: #94a3b8; text-decoration: none; transition: 0.2s; font-size: 1.1rem; }
        .nav-link:hover { color: #f1f5f9; background: #334155; }
        .nav-link.active { background: #facc15; color: #0f172a; font-weight: bold; }
        
        /* Main Content */
        .main { flex-grow: 1; overflow-y: auto; padding: 30px; }
        
        /* Common Styles */
        h1 { color: #f1f5f9; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0; }
        h2 { color: #cbd5e1; margin-top: 30px; border-bottom: 1px solid #334155; padding-bottom: 5px; font-size: 1.2rem; }
        
        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
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
        input, select { background: #0f172a; border: 1px solid #475569; color: white; padding: 10px; border-radius: 6px; outline: none; }
        input:focus { border-color: #facc15; }
        
        /* Buttons */
        button { background: #facc15; border: none; color: #0f172a; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        button.danger { background: #ef4444; color: white; }
        button.toggle { background: #3b82f6; color: white; }
        button.sync { background: #10b981; color: white; }
        
        /* Status */
        .status-active { color: #4ade80; font-weight: bold; background: rgba(74, 222, 128, 0.1); padding: 4px 8px; border-radius: 4px; }
        .status-inactive { color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="brand">⚡ PoE 2 Manager</div>
        <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="/tracking" class="nav-link ${activePage === 'tracking' ? 'active' : ''}">Trade Tracking</a>
        <a href="/market" class="nav-link ${activePage === 'market' ? 'active' : ''}">Market Watch</a>
    </div>
    <div class="main">
        ${content}
    </div>
</body>
</html>
    `;
}
