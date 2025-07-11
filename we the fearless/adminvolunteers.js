// Global state variables
let generatedCodes = [];
let volunteers = [];
let registrations = [];

// Configuration - Update these URLs to match your backend
const CONFIG = {
    API_BASE_URL: 'https://endpoint.thefearlessmovement.co.ke/api', // Change this to your actual API URL
    TOKEN_KEY: 'authToken',
    EVENT_FEE: 5000 // Static event fee
};

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }
    
    // Load all data
    loadData();
    
    // Set up event listeners
    setupEventListeners();
});

// Authentication helpers
function getAuthToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function handleAuthError() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    showAlert('Your session has expired. Please log in again.', 'error');
    setTimeout(redirectToLogin, 2000);
}

// Create headers with proper authentication
function createHeaders(includeContentType = true) {
    const headers = {
        'Authorization': `Bearer ${getAuthToken()}`
    };
    
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    
    return headers;
}

// Enhanced fetch with error handling
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
            ...options,
            headers: {
                ...createHeaders(),
                ...options.headers
            }
        });
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            handleAuthError();
            throw new Error('Authentication failed');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Unable to connect to server. Please check your internet connection.');
        }
        throw error;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Generate Codes button
    const generateBtn = document.getElementById('generateCodes');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateCodes);
    }
    
    // Clear Codes button
    const clearBtn = document.getElementById('clearCodes');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllCodes);
    }
    
    // Assign Volunteer form
    const assignForm = document.getElementById('assign-form');
    if (assignForm) {
        assignForm.addEventListener('submit', handleAssignVolunteer);
    }
    
    // Search functionality
    const volunteerSearch = document.getElementById('volunteer-search');
    if (volunteerSearch) {
        volunteerSearch.addEventListener('input', searchVolunteers);
    }
    
    const registrationSearch = document.getElementById('registration-search');
    if (registrationSearch) {
        registrationSearch.addEventListener('input', searchRegistrations);
    }
    
    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('member-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Calculate balance based on amount paid
function calculateBalance(amountPaid) {
    const paid = parseFloat(amountPaid) || 0;
    const balance = CONFIG.EVENT_FEE - paid;
    return Math.max(0, balance); // Ensure balance is never negative
}

// Format currency for display
function formatCurrency(amount) {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
}

// Generate random codes (3 letters + 2 numbers)
function generateRandomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    // Add 3 random letters
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    // Add 2 random numbers
    for (let i = 0; i < 2; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return code;
}

// Generate 50 unique codes
async function generateCodes() {
    if (!confirm('Generate 50 new volunteer codes? This cannot be undone.')) {
        return;
    }

    const generateBtn = document.getElementById('generateCodes');
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
    }

    try {
        // Generate unique codes
        const codesSet = new Set();
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loop
        
        while (codesSet.size < 50 && attempts < maxAttempts) {
            codesSet.add(generateRandomCode());
            attempts++;
        }
        
        if (codesSet.size < 50) {
            throw new Error('Unable to generate 50 unique codes. Please try again.');
        }
        
        const codes = Array.from(codesSet);

        // Send to backend
        const data = await apiRequest('/generate-codes', {
            method: 'POST',
            body: JSON.stringify({ codes })
        });

        generatedCodes = data.codes || codes;
        displayCodes();
        updateCodeSelect();
        showAlert('50 new codes generated successfully!', 'success');
        
    } catch (error) {
        console.error('Generate codes error:', error);
        showAlert(`Failed to generate codes: ${error.message}`, 'error');
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate 50 Codes';
        }
    }
}

// Clear all data
async function clearAllCodes() {
    if (!confirm('WARNING: This will delete ALL codes, volunteers and registrations. Are you sure?')) {
        return;
    }

    const clearBtn = document.getElementById('clearCodes');
    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.textContent = 'Clearing...';
    }

    try {
        await apiRequest('/clear-all-data', {
            method: 'DELETE'
        });

        generatedCodes = [];
        volunteers = [];
        registrations = [];
        
        displayCodes();
        updateCodeSelect();
        updateVolunteersTable();
        updateRegistrationsTable();
        
        showAlert('All data cleared successfully', 'success');
    } catch (error) {
        console.error('Clear data error:', error);
        showAlert(`Failed to clear data: ${error.message}`, 'error');
    } finally {
        if (clearBtn) {
            clearBtn.disabled = false;
            clearBtn.textContent = 'Clear All Data';
        }
    }
}

// Assign code to volunteer
async function handleAssignVolunteer(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Assigning...';
    }
    
    const name = document.getElementById('volunteer-name')?.value?.trim();
    const email = document.getElementById('volunteer-email')?.value?.trim();
    const phone = document.getElementById('volunteer-phone')?.value?.trim();
    const code = document.getElementById('selected-code')?.value;
    
    if (!name || !email || !code) {
        showAlert('Please fill all required fields', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Assign Volunteer';
        }
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Assign Volunteer';
        }
        return;
    }

    try {
        const data = await apiRequest('/assign-volunteer', {
            method: 'POST',
            body: JSON.stringify({ name, email, phone, code })
        });
        
        volunteers.push(data.volunteer);
        
        e.target.reset();
        displayCodes();
        updateCodeSelect();
        updateVolunteersTable();
        
        showAlert('Volunteer assigned successfully!', 'success');
    } catch (error) {
        console.error('Assign volunteer error:', error);
        showAlert(`Failed to assign volunteer: ${error.message}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Assign Volunteer';
        }
    }
}

// Load all data from backend
async function loadData() {
    try {
        showAlert('Loading data...', 'info');
        
        await Promise.all([
            loadCodes(),
            loadVolunteers(),
            loadRegistrations()
        ]);
        
        // Remove loading message
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert-info');
            alerts.forEach(alert => alert.remove());
        }, 1000);
        
    } catch (error) {
        console.error('Load data error:', error);
        showAlert('Failed to load data. Please refresh the page.', 'error');
    }
}

// Load codes from backend
async function loadCodes() {
    try {
        const data = await apiRequest('/codes');
        generatedCodes = data.codes?.map(c => typeof c === 'string' ? c : c.code) || [];
        displayCodes();
        updateCodeSelect();
    } catch (error) {
        console.error('Load codes error:', error);
        throw error;
    }
}

// Load volunteers from backend
async function loadVolunteers() {
    try {
        const data = await apiRequest('/volunteers');
        volunteers = data.volunteers || [];
        updateVolunteersTable();
    } catch (error) {
        console.error('Load volunteers error:', error);
        throw error;
    }
}

// Load registrations from backend
async function loadRegistrations() {
    try {
        const data = await apiRequest('/registrations');
        registrations = data.registrations || [];
        
        // Process registrations to ensure balance is calculated correctly
        registrations = registrations.map(registration => ({
            ...registration,
            balance: calculateBalance(registration.amount_paid)
        }));
        
        updateRegistrationsTable();
    } catch (error) {
        console.error('Load registrations error:', error);
        throw error;
    }
}

// Display codes in grid
function displayCodes() {
    const grid = document.getElementById('codes-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    if (generatedCodes.length === 0) {
        grid.innerHTML = '<div class="no-codes">No codes generated yet. Click "Generate 50 Codes" to start.</div>';
        return;
    }
    
    generatedCodes.forEach(code => {
        const codeCard = document.createElement('div');
        codeCard.className = 'code-card';
        codeCard.textContent = code;
        
        const volunteer = volunteers.find(v => v.code === code);
        if (volunteer) {
            codeCard.classList.add('assigned');
            codeCard.title = `Assigned to: ${volunteer.name}`;
        }
        
        grid.appendChild(codeCard);
    });
}

// Update code select dropdown
function updateCodeSelect() {
    const select = document.getElementById('selected-code');
    if (!select) return;

    select.innerHTML = '<option value="">Choose a code...</option>';
    
    const unassignedCodes = generatedCodes.filter(code => 
        !volunteers.some(v => v.code === code)
    );
    
    if (unassignedCodes.length === 0) {
        select.innerHTML = '<option value="">No available codes</option>';
        select.disabled = true;
    } else {
        select.disabled = false;
        unassignedCodes.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            select.appendChild(option);
        });
    }
}

// Update volunteers table
function updateVolunteersTable() {
    const tbody = document.getElementById('volunteers-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (volunteers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No volunteers found</td></tr>';
        return;
    }

    volunteers.forEach(volunteer => {
        const memberCount = registrations.filter(r => r.volunteerCode === volunteer.code).length;
        const totalRevenue = registrations
            .filter(r => r.volunteerCode === volunteer.code)
            .reduce((sum, r) => sum + parseFloat(r.amount_paid || 0), 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${volunteer.code}</strong></td>
            <td>${volunteer.name}</td>
            <td>${volunteer.email}</td>
            <td>${volunteer.phone || 'N/A'}</td>
            <td>${memberCount}</td>
            <td>${formatCurrency(totalRevenue)}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>
                <button class="btn" style="padding: 5px 10px; font-size: 0.8rem;" 
                    onclick="viewMembers('${volunteer.code}')">
                    View Members
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update registrations table
function updateRegistrationsTable() {
    console.log('Registration data:', registrations);
    const tbody = document.getElementById('registrations-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No registrations found</td></tr>';
        return;
    }

    registrations.forEach(registration => {
        const volunteerName = registration.volunteer_name || 'Unknown';
        const amountPaid = parseFloat(registration.amount_paid || 0);
        const balance = calculateBalance(amountPaid);
        const paymentStatus = balance === 0 ? 'Paid' : 'Pending';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${registration.volunteer_code}</strong></td>
            <td>${registration.member_name}</td>
            <td>${registration.phone || 'N/A'}</td>
            <td>${registration.event}</td>
            <td>${formatCurrency(amountPaid)}</td>
            <td class="${balance === 0 ? 'text-success' : 'text-warning'}">${formatCurrency(balance)}</td>
            <td>${new Date(registration.registration_date).toLocaleDateString()}</td>
            <td>
                ${volunteerName}
                <br>
                <small class="payment-status ${balance === 0 ? 'status-paid' : 'status-pending'}">
                    ${paymentStatus}
                </small>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// View members under a volunteer
async function viewMembers(code) {
    try {
        const data = await apiRequest(`/volunteers/${code}/members`);
        const modalContent = document.getElementById('member-details');
        if (!modalContent) return;

        let html = `
            <h3>Volunteer: ${data.volunteer.name} (Code: ${code})</h3>
            <div class="event-fee-info">
                <p><strong>Event Fee:</strong> ${formatCurrency(CONFIG.EVENT_FEE)}</p>
            </div>
        `;
        
        if (data.members.length === 0) {
            html += '<p>No members registered yet.</p>';
        } else {
            const totalRevenue = data.members.reduce((sum, m) => sum + parseFloat(m.amount_paid || 0), 0);
            const totalOutstanding = data.members.reduce((sum, m) => sum + calculateBalance(m.amount_paid), 0);
            
            html += `
                <div class="summary-cards">
                    <div class="summary-card">
                        <h4>Total Members</h4>
                        <p class="summary-number">${data.members.length}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total Revenue</h4>
                        <p class="summary-number">${formatCurrency(totalRevenue)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Outstanding Balance</h4>
                        <p class="summary-number">${formatCurrency(totalOutstanding)}</p>
                    </div>
                </div>
                
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Event</th>
                                <th>Phone Number</th>
                                <th>Amount Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Registration Date</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.members.forEach(member => {
                const amountPaid = parseFloat(member.amount_paid || 0);
                const balance = calculateBalance(amountPaid);
                const status = balance === 0 ? 'Paid' : 'Pending';
                
                html += `
                    <tr>
                        <td>${member.member_name}</td>
                        <td>${member.event}</td>
                        <td>${member.phone || 'N/A'}</td>   
                        <td>${formatCurrency(amountPaid)}</td>
                        <td class="${balance === 0 ? 'text-success' : 'text-warning'}">
                            ${formatCurrency(balance)}
                        </td>
                        <td>
                            <span class="status-badge ${balance === 0 ? 'status-paid' : 'status-pending'}">
                                ${status}
                            </span>
                        </td>
                        <td>${new Date(member.registration_date).toLocaleDateString()}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        modalContent.innerHTML = html;
        document.getElementById('member-modal').style.display = 'block';
    } catch (error) {
        console.error('View members error:', error);
        showAlert(`Failed to view members: ${error.message}`, 'error');
    }
}

// Search functionality
function searchVolunteers() {
    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll('#volunteers-tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

function searchRegistrations() {
    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll('#registrations-tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

// Close modal
function closeModal() {
    const modal = document.getElementById('member-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show alert message
function showAlert(message, type) {
    // Remove existing alerts of the same type
    const existingAlerts = document.querySelectorAll(`.alert-${type}`);
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.prepend(alertDiv);
    
    // Auto-remove after 5 seconds for success and info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}