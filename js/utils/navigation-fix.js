// navigation-fix.js - Add this to all pages to handle authenticated navigation

(function() {
    // Check authentication and update navigation on every page
    async function updateNavigationAuth() {
        try {
            const response = await fetch('/api/auth/verify', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.user) {
                    updateNavigationForUser(result.user);
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }
    
    // Update navigation bar for authenticated user
    function updateNavigationForUser(user) {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Find and remove the login link
        const loginLink = navLinks.querySelector('a[href="/login.html"]');
        if (loginLink) {
            loginLink.remove();
        }
        
        // Create user dropdown menu
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.style.cssText = 'position: relative; display: inline-block;';
        
        userMenu.innerHTML = `
            <button class="nav-link user-menu-btn" style="border: none; background: none; cursor: pointer; font-weight: 600;">
                Hi, ${user.firstName} ▼
            </button>
            <div class="user-dropdown" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 200px; z-index: 1000; margin-top: 8px;">
                ${user.userType === 'seller' || user.userType === 'both' ? `
                    <a href="/seller-dashboard.html" class="dropdown-item">My Dashboard</a>
                    <a href="/my-listings.html" class="dropdown-item">My Listings</a>
                ` : ''}
                ${user.userType === 'buyer' || user.userType === 'both' ? `
                    <a href="/my-offers.html" class="dropdown-item">My Offers</a>
                    <a href="/saved-properties.html" class="dropdown-item">Saved Properties</a>
                ` : ''}
                <a href="/profile.html" class="dropdown-item">Profile Settings</a>
                <hr style="margin: 0; border: none; border-top: 1px solid #e2e8f0;">
                <a href="#" class="dropdown-item logout-btn" style="color: #dc3545;">Log Out</a>
            </div>
        `;
        
        // Add CSS for dropdown items
        const style = document.createElement('style');
        style.textContent = `
            .user-menu .dropdown-item {
                display: block;
                padding: 12px 20px;
                color: #333;
                text-decoration: none;
                transition: background-color 0.2s;
            }
            .user-menu .dropdown-item:hover {
                background-color: #f8fafc;
            }
            .user-menu-btn:hover {
                color: var(--color-primary);
            }
        `;
        document.head.appendChild(style);
        
        // Insert user menu before the "List Your Property" button
        const listPropertyBtn = navLinks.querySelector('.btn-primary');
        if (listPropertyBtn) {
            navLinks.insertBefore(userMenu, listPropertyBtn);
        } else {
            navLinks.appendChild(userMenu);
        }
        
        // Add dropdown functionality
        const menuBtn = userMenu.querySelector('.user-menu-btn');
        const dropdown = userMenu.querySelector('.user-dropdown');
        
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        
        // Handle logout
        const logoutBtn = userMenu.querySelector('.logout-btn');
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/';
            }
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavigationAuth);
    } else {
        updateNavigationAuth();
    }
})();