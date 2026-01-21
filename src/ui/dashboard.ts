import { renderLayout } from './layout.js';

export function renderDashboard() {
    const content = `
        <h1>Dashboard</h1>
        <div style="background: #1e293b; border: 1px solid #334155; border-bottom: none;">
            <div style="padding: 20px; border-bottom: 1px solid #334155;">
                <p style="margin: 0;">Welcome to the <span style="color: #facc15; font-weight: bold;">Path of Exile 2 Trade Manager</span>.</p>
                <p style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">
                    Monitor your sales history, track currently listed items, and watch the market for specific items across multiple accounts.
                </p>
            </div>
            
            <div style="padding: 20px; border-bottom: 1px solid #334155;">
                <h2 style="margin-top: 0; border: none; font-size: 1rem;">System Status</h2>
                <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div class="flex" style="gap: 10px;">
                        <span style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80;"></span>
                        <span style="font-size: 0.9rem;">Trade Monitor Service: <strong style="color: #4ade80;">ACTIVE</strong></span>
                    </div>
                    <div class="flex" style="gap: 10px;">
                         <span style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80;"></span>
                         <span style="font-size: 0.9rem;">Database Connectivity: <strong style="color: #4ade80;">OK</strong></span>
                    </div>
                </div>
            </div>

            <div style="padding: 20px; border-bottom: 1px solid #334155; background: rgba(0,0,0,0.1);">
                <h2 style="margin-top: 0; border: none; font-size: 1rem;">Getting Started</h2>
                <ul style="color: #94a3b8; font-size: 0.85rem; padding-left: 20px; margin-top: 10px;">
                    <li style="margin-bottom: 5px;">Go to <strong>Trade Tracking</strong> to add your account's POESESSID and start tracking sales.</li>
                    <li style="margin-bottom: 5px;">Visit <strong>Market Watch</strong> to create search profiles for items you want to flip or buy.</li>
                    <li>Check the <strong>Item Details</strong> by clicking on any item name in the lists.</li>
                </ul>
            </div>
        </div>
    `;
    return renderLayout('Dashboard', content, 'dashboard');
}
