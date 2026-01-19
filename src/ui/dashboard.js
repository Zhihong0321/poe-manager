import { renderLayout } from './layout.js';
export function renderDashboard() {
    const content = `
        <h1>Dashboard</h1>
        <div class="box">
            <p>Welcome to the Path of Exile 2 Trade Manager.</p>
            <p style="color: #94a3b8; margin-top: 10px;">
                Select an option from the sidebar to get started.
            </p>
        </div>
        
        <div class="flex">
            <div class="box" style="flex: 1;">
                <h2>System Status</h2>
                <div style="margin-top: 15px;">
                    <div class="flex" style="margin-bottom: 10px;">
                        <span style="width: 10px; height: 10px; background: #4ade80; border-radius: 50%;"></span>
                        <span>Server Online</span>
                    </div>
                    <div class="flex">
                         <span style="width: 10px; height: 10px; background: #4ade80; border-radius: 50%;"></span>
                         <span>Database Connected</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return renderLayout('Dashboard', content, 'dashboard');
}
//# sourceMappingURL=dashboard.js.map