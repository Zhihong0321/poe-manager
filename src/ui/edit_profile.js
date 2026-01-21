import { renderLayout } from './layout.js';
export function renderEditProfile(profile) {
    // Ensure we have at least 3 slots for the inputs, even if empty
    const cookies = profile.sessIds || [];
    const c1 = cookies[0] || '';
    const c2 = cookies[1] || '';
    const c3 = cookies[2] || '';
    const content = `
        <h1>Edit Tracking Profile</h1>
        
        <div class="box" style="max-width: 600px; margin: 0 auto;">
            <form method="POST" action="/profiles/update">
                <input type="hidden" name="id" value="${profile.id}">
                
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Account Name</label>
                    <input type="text" name="accountName" value="${profile.accountName}" required style="width: 100%; box-sizing: border-box;">
                    <small style="color: #64748b;">The official Path of Exile account name (e.g. User#1234)</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">League</label>
                    <input type="text" name="league" value="${profile.league}" required style="width: 100%; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 20px; background: #1e293b; padding: 15px; border-radius: 4px; border: 1px solid #334155;">
                    <label style="display:block; margin-bottom:10px; font-weight:bold; color: #cbd5e1;">Session Cookies (POESESSID)</label>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Cookie #1 (Primary)</label>
                        <input type="text" name="sessId_1" value="${c1}" placeholder="Paste POESESSID here..." required style="width: 100%; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Cookie #2 (Optional - For Rotation)</label>
                        <input type="text" name="sessId_2" value="${c2}" placeholder="Paste POESESSID here..." style="width: 100%; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Cookie #3 (Optional - For Rotation)</label>
                        <input type="text" name="sessId_3" value="${c3}" placeholder="Paste POESESSID here..." style="width: 100%; box-sizing: border-box;">
                    </div>
                    
                    <p style="font-size: 0.8rem; color: #64748b; margin-top: 10px;">
                        Adding multiple cookies enables the system to rotate between accounts every 5 seconds, avoiding rate limits.
                    </p>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="background: #3b82f6; flex: 1;">Save Changes</button>
                    <a href="/tracking" class="button" style="background: #64748b; text-decoration: none; text-align: center; padding: 10px 20px; border-radius: 4px; color: white;">Cancel</a>
                </div>
            </form>
        </div>
    `;
    return renderLayout('Edit Profile', content, 'tracking');
}
//# sourceMappingURL=edit_profile.js.map