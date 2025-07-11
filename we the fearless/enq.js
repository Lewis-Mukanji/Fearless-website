
    // DOM Elements
    const userProfile = document.getElementById('userProfile');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const enquiriesTableBody = document.getElementById('enquiriesTableBody');

    // Modal Elements
    const viewEnquiryModal = document.getElementById('viewEnquiryModal');
    const closeViewModal = document.getElementById('closeViewModal');
    const closeViewBtn = document.getElementById('closeViewBtn');
    const replyToEnquiryBtn = document.getElementById('replyToEnquiryBtn');

    const replyEnquiryModal = document.getElementById('replyEnquiryModal');
    const closeReplyModal = document.getElementById('closeReplyModal');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');
    const sendReplyBtn = document.getElementById('sendReplyBtn');

    // Stats Elements
    const totalEnquiries = document.getElementById('totalEnquiries');
    const totalImpressions = document.getElementById('totalImpressions');
    const contactEnquiries = document.getElementById('contactEnquiries');
    const aboutEnquiries = document.getElementById('aboutEnquiries');

    // Chart instances
    const Chart = window.Chart; // Make sure you've included Chart.js in your HTML
    let enquiriesTrendChart;
    let timeDistributionChart;
    let sourceDistributionChart;
    let responseRateChart;
    
    // Filter variables
    let currentDateFilter = 'all';
    let currentYearFilter = 'all';

    // Current selected enquiry
    let currentEnquiry = null;

    // Toggle dropdown menu
    userProfile.addEventListener('click', () => {
        dropdownMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        // In a real app, you would call your logout API
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
    });

    // Modal controls
    closeViewModal.addEventListener('click', () => {
        viewEnquiryModal.classList.remove('active');
    });

    closeViewBtn.addEventListener('click', () => {
        viewEnquiryModal.classList.remove('active');
    });

    closeReplyModal.addEventListener('click', () => {
        replyEnquiryModal.classList.remove('active');
    });

    cancelReplyBtn.addEventListener('click', () => {
        replyEnquiryModal.classList.remove('active');
    });

    // View enquiry details
    const viewEnquiry = (enquiry) => {
        currentEnquiry = enquiry;
        
        document.getElementById('viewName').value = enquiry.name;
        document.getElementById('viewEmail').value = enquiry.email;
        document.getElementById('viewPhone').value = enquiry.phone;
        document.getElementById('viewSource').value = enquiry.page_source === 'contact.html' ? 'Contact Page' : 'About Page';
        document.getElementById('viewDate').value = new Date(enquiry.created_at).toLocaleString();
        document.getElementById('viewMessage').value = enquiry.message;
        
        viewEnquiryModal.classList.add('active');
    };

    // Reply to enquiry
    replyToEnquiryBtn.addEventListener('click', () => {
        viewEnquiryModal.classList.remove('active');
        
        document.getElementById('replyTo').value = currentEnquiry.email;
        document.getElementById('replySubject').value = `Re: Your Enquiry from ${currentEnquiry.page_source === 'contact.html' ? 'Contact Page' : 'About Page'}`;
        document.getElementById('replyMessage').value = `Dear ${currentEnquiry.name},\n\n`;
        
        replyEnquiryModal.classList.add('active');
    });

    // Send reply
    sendReplyBtn.addEventListener('click', async () => {
        const to = document.getElementById('replyTo').value;
        const subject = document.getElementById('replySubject').value;
        const message = document.getElementById('replyMessage').value;
        
        if (!to || !subject || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        try {
            sendReplyBtn.disabled = true;
            sendReplyBtn.textContent = 'Sending...';
            
            // In a real app, you would call your email API
            const response = await fetch('https://endpoint.thefearlessmovement.co.ke/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    to,
                    subject,
                    message,
                    name: 'Fearless Movement Admin'
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email');
            }
            
            alert('Reply sent successfully!');
            replyEnquiryModal.classList.remove('active');
        } catch (error) {
            console.error('Error sending reply:', error);
            alert(`Error: ${error.message}`);
        } finally {
            sendReplyBtn.disabled = false;
            sendReplyBtn.textContent = 'Send Reply';
        }
    });

    // Search functionality
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = enquiriesTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const name = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            const email = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const phone = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };

    // Initialize charts
    const initCharts = async () => {
        try {
            // Load chart data
            const [trendData, timeData, statsData] = await Promise.all([
                fetchEnquiryTrendData(),
                fetchTimeDistributionData(),
                fetchStatsData()
            ]);
            
            // Create charts
            createEnquiriesTrendChart(trendData);
            createTimeDistributionChart(timeData);
            createSourceDistributionChart(statsData);
            createResponseRateChart(statsData);
            
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    };

    // Fetch data functions
    const fetchEnquiryTrendData = async () => {
        const params = new URLSearchParams();
        if (currentDateFilter !== 'all') params.set('dateFilter', currentDateFilter);
        if (currentYearFilter !== 'all') params.set('year', currentYearFilter);
        
        const response = await fetch(`https://endpoint.thefearlessmovement.co.ke/api/admin/enquiries/trend?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();
        return data.data;
    };

    const fetchTimeDistributionData = async () => {
        const params = new URLSearchParams();
        if (currentDateFilter !== 'all') params.set('dateFilter', currentDateFilter);
        if (currentYearFilter !== 'all') params.set('year', currentYearFilter);
        
        const response = await fetch(`https://endpoint.thefearlessmovement.co.ke/api/admin/enquiries/time-distribution?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();
        return data.data;
    };

    const fetchStatsData = async () => {
        const params = new URLSearchParams();
        if (currentDateFilter !== 'all') params.set('dateFilter', currentDateFilter);
        if (currentYearFilter !== 'all') params.set('year', currentYearFilter);
        
        const response = await fetch(`https://endpoint.thefearlessmovement.co.ke/api/admin/enquiries?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();
        return data.stats;
    };

    // Chart creation functions
    const createEnquiriesTrendChart = (data) => {
        const ctx = document.getElementById('enquiriesTrendChart').getContext('2d');
        const labels = data.map(item => new Date(item.date).toLocaleDateString());
        
        if (enquiriesTrendChart) {
            enquiriesTrendChart.destroy();
        }
        
        enquiriesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Enquiries',
                        data: data.map(item => item.count),
                        borderColor: 'rgba(255, 174, 0, 1)',
                        backgroundColor: 'rgba(255, 174, 0, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Contact Page',
                        data: data.map(item => item.contact),
                        borderColor: 'rgba(76, 175, 80, 1)',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.3
                    },
                    {
                        label: 'About Page',
                        data: data.map(item => item.about),
                        borderColor: 'rgba(244, 67, 54, 1)',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    };

    const createTimeDistributionChart = (data) => {
        const ctx = document.getElementById('timeDistributionChart').getContext('2d');
        
        // Create labels for all 24 hours
        const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
        const counts = Array(24).fill(0);
        
        // Fill in the data we have
        data.forEach(item => {
            counts[item.hour] = item.count;
        });
        
        if (timeDistributionChart) {
            timeDistributionChart.destroy();
        }
        
        timeDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Enquiries',
                    data: counts,
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    };

    const createSourceDistributionChart = (stats) => {
        const ctx = document.getElementById('sourceDistributionChart').getContext('2d');
        
        if (sourceDistributionChart) {
            sourceDistributionChart.destroy();
        }
        
        sourceDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Contact Page', 'About Page'],
                datasets: [{
                    data: [stats.contact, stats.about],
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(244, 67, 54, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    };

    const createResponseRateChart = (stats) => {
        const ctx = document.getElementById('responseRateChart').getContext('2d');
        const responseRate = Math.min(Math.floor(Math.random() * 100), 95); // Mock data - replace with real data
        
        document.getElementById('responseRateValue').textContent = `${responseRate}%`;
        
        if (responseRateChart) {
            responseRateChart.destroy();
        }
        
        responseRateChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Responded', 'Pending'],
                datasets: [{
                    data: [responseRate, 100 - responseRate],
                    backgroundColor: [
                        'rgba(255, 174, 0, 0.7)',
                        'rgba(200, 200, 200, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 174, 0, 1)',
                        'rgba(200, 200, 200, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    };

    // Load enquiries with filters
    const loadEnquiries = async () => {
        try {
            // Show loading state
            enquiriesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading enquiries...</td></tr>';
            
            // Build query parameters
            const params = new URLSearchParams();
            params.set('page', '1');
            params.set('limit', '10');
            
            // Add search filter if exists
            if (searchInput.value) {
                params.set('search', searchInput.value);
            }
            
            // Add date filter
            if (currentDateFilter !== 'all') {
                params.set('dateFilter', currentDateFilter);
            }
            
            // Add year filter
            if (currentYearFilter !== 'all') {
                params.set('year', currentYearFilter);
            }
            
            // Fetch from API
            const response = await fetch(`https://endpoint.thefearlessmovement.co.ke/api/admin/enquiries?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch enquiries');
            }
            
            // Update stats
            totalEnquiries.textContent = data.stats.total;
            contactEnquiries.textContent = data.stats.contact;
            aboutEnquiries.textContent = data.stats.about;
            
            // Update impressions (mock data or integrate with your analytics)
            totalImpressions.textContent = Math.floor(Math.random() * 1000) + 500;
            
            // Render enquiries table
            if (data.data.length === 0) {
                enquiriesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No enquiries found</td></tr>';
                return;
            }
            
            enquiriesTableBody.innerHTML = '';
            
            data.data.forEach(enquiry => {
                const row = document.createElement('tr');
                row.className = 'fade-in';
                
                row.innerHTML = `
                    <td data-label="Name">${enquiry.name}</td>
                    <td data-label="Email">${enquiry.email}</td>
                    <td data-label="Phone">${enquiry.phone}</td>
                    <td data-label="Message">${enquiry.message.substring(0, 30)}${enquiry.message.length > 30 ? '...' : ''}</td>
                    <td data-label="Source">
                        <span class="badge ${enquiry.page_source === 'contact.html' ? 'badge-contact' : 'badge-about'}">
                            ${enquiry.page_source === 'contact.html' ? 'Contact' : 'About'}
                        </span>
                    </td>
                    <td data-label="Date">${formatDate(enquiry.created_at)}</td>
                    <td data-label="Actions">
                        <div class="action-btns">
                            <button class="btn btn-view" onclick="viewEnquiry(${JSON.stringify(enquiry).replace(/"/g, '&quot;')})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-reply" onclick="replyToEnquiry(${JSON.stringify(enquiry).replace(/"/g, '&quot;')})">
                                <i class="fas fa-reply"></i> Reply
                            </button>
                            <button class="btn btn-delete" onclick="deleteEnquiry(${enquiry.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                `;
                
                enquiriesTableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading enquiries:', error);
            enquiriesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
        }
    };

    // Delete enquiry function
    window.deleteEnquiry = async (enquiryId) => {
        if (!confirm('Are you sure you want to delete this enquiry?')) {
            return;
        }
        
        try {
            const response = await fetch(`https://endpoint.thefearlessmovement.co.ke/api/admin/enquiries/${enquiryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete enquiry');
            }
            
            alert('Enquiry deleted successfully');
            loadEnquiries(); // Refresh the list
        } catch (error) {
            console.error('Error deleting enquiry:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Global function for reply button in table
    window.replyToEnquiry = (enquiry) => {
        currentEnquiry = enquiry;
        
        document.getElementById('replyTo').value = enquiry.email;
        document.getElementById('replySubject').value = `Re: Your Enquiry from ${enquiry.page_source === 'contact.html' ? 'Contact Page' : 'About Page'}`;
        document.getElementById('replyMessage').value = `Dear ${enquiry.name},\n\n`;
        
        replyEnquiryModal.classList.add('active');
    };

    // Initialize the page
    document.addEventListener('DOMContentLoaded', () => {
        // Check authentication
        if (!localStorage.getItem('authToken')) {
            window.location.href = 'login.html';
            return;
        }
        
        // Add event listeners for filters
        document.getElementById('dateRangeFilter')?.addEventListener('change', (e) => {
            currentDateFilter = e.target.value;
            loadEnquiries();
            initCharts();
        });

        document.getElementById('yearFilter')?.addEventListener('change', (e) => {
            currentYearFilter = e.target.value;
            loadEnquiries();
            initCharts();
        });
        
        loadEnquiries();
        initCharts();
        
        // Refresh data every 30 seconds
        setInterval(() => {
            loadEnquiries();
            initCharts(); // Refresh charts data
        }, 30000);
    });