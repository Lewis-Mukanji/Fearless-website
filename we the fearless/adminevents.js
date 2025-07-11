document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const eventsGrid = document.getElementById('events-grid');
  const addEventBtn = document.getElementById('add-event-btn');
  const eventModal = document.getElementById('event-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const eventForm = document.getElementById('event-form');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-btn');
  const cancelEventBtn = document.getElementById('cancel-event');
  const cancelConfirmBtn = document.getElementById('cancel-confirm');
  const confirmActionBtn = document.getElementById('confirm-action');
  const eventFilter = document.getElementById('event-filter');
  const purchaseSearch = document.getElementById('purchase-search');
  const purchasesBody = document.getElementById('purchases-body');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const exportPurchasesBtn = document.getElementById('export-purchases');
  const selectAllCheckbox = document.getElementById('select-all');
  const eventsSalesBody = document.getElementById('events-sales-body');
  const totalEventsEl = document.getElementById('total-events');
  const totalRevenueEl = document.getElementById('total-revenue');
  const totalTicketsEl = document.getElementById('total-tickets');
  const eventPosterInput = document.getElementById('event-poster');
  const posterPreview = document.getElementById('poster-preview');
  
  // State variables
  let currentPage = 1;
  let totalPages = 1;
  let events = [];
  let purchases = [];
  let currentEventId = null;
  let confirmAction = null;
  let posterFile = null;

  // Helper function to get auth token
  function getAuthToken() {
    return localStorage.getItem('authToken') || '';
  }

  // Helper function to set common headers
  function getHeaders(contentType = 'application/json') {
    const headers = {
      'Authorization': `Bearer ${getAuthToken()}`
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }
  
  // Initialize the admin panel
  initAdminPanel();
  
  // Event Listeners
  addEventBtn.addEventListener('click', openAddEventModal);
  eventForm.addEventListener('submit', handleEventFormSubmit);
  cancelEventBtn.addEventListener('click', () => eventModal.style.display = 'none');
  cancelConfirmBtn.addEventListener('click', () => confirmModal.style.display = 'none');
  confirmActionBtn.addEventListener('click', handleConfirmAction);
  eventFilter.addEventListener('change', filterPurchases);
  purchaseSearch.addEventListener('input', filterPurchases);
  prevPageBtn.addEventListener('click', goToPrevPage);
  nextPageBtn.addEventListener('click', goToNextPage);
  exportPurchasesBtn.addEventListener('click', exportPurchases);
  selectAllCheckbox.addEventListener('change', toggleSelectAll);
  
  // Add event listener for poster file input
  eventPosterInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      posterFile = file;
      displayPosterPreview(file);
    }
  });
  
  // Function to display poster preview
  function displayPosterPreview(file) {
    if (!file) {
      posterPreview.innerHTML = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      posterPreview.innerHTML = `<img src="${e.target.result}" alt="Event Poster Preview">`;
    };
    reader.readAsDataURL(file);
  }
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === eventModal) eventModal.style.display = 'none';
    if (e.target === confirmModal) confirmModal.style.display = 'none';
  });
  
  // Close modals with close buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Initialize admin panel
  function initAdminPanel() {
    loadEvents();
    loadTicketSales();
    loadRecentPurchases();
    initTicketSalesChart();
  }
  
  // Load events from API
  function loadEvents() {
    fetch('https://endpoint.thefearlessmovement.co.ke/api/events', {
      headers: getHeaders(),
      method: 'GET'
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        events = data.events;
        renderEvents();
        populateEventFilter();
      } else {
        showSnackbar('Failed to load events: ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error loading events:', error);
      showSnackbar('Failed to load events. Please try again.', 'error');
    });
  }
  
  // Render events in the grid
  function renderEvents() {
    eventsGrid.innerHTML = '';
    
    if (events.length === 0) {
      eventsGrid.innerHTML = '<p class="no-events">No events found. Add your first event!</p>';
      return;
    }
    
    events.forEach(event => {
      const eventCard = document.createElement('div');
      eventCard.className = 'event-card';
      
      // Ensure poster path is complete
      let posterUrl = event.poster ? event.poster : 'img/default-event.jpg';
      
      // Check if the poster URL is relative and doesn't start with the API base URL
      if (posterUrl && !posterUrl.startsWith('http') && !posterUrl.startsWith('/')) {
        posterUrl = `https://endpoint.thefearlessmovement.co.ke/${posterUrl}`;
      }
      
      let statusClass = '';
      switch(event.status) {
        case 'upcoming': statusClass = 'status-upcoming'; break;
        case 'ongoing': statusClass = 'status-ongoing'; break;
        case 'completed': statusClass = 'status-completed'; break;
        case 'cancelled': statusClass = 'status-cancelled'; break;
      }
      
      eventCard.innerHTML = `
        <img src="${posterUrl}" alt="${event.name}" class="event-poster" onerror="this.onerror=null; this.src='img/default-event.jpg';">
        <div class="event-details">
          <h3 class="event-name">${event.name}</h3>
          <div class="event-meta">
            <span class="event-meta-item"><i class="fas fa-calendar-alt"></i> ${formatDate(event.date)}</span>
            <span class="event-meta-item"><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
          </div>
          <span class="event-status ${statusClass}">${event.status}</span>
          <div class="event-meta">
            <span class="event-meta-item"><i class="fas fa-ticket-alt"></i> ${event.tickets_sold}/${event.capacity}</span>
            <span class="event-meta-item"><i class="fas fa-money-bill-wave"></i> KES ${event.revenue}</span>
          </div>
          <div class="event-actions">
            <button class="action-btn edit-btn" data-id="${event.id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="action-btn delete-btn" data-id="${event.id}"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      `;
      
      eventsGrid.appendChild(eventCard);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const id = this.getAttribute('data-id');
        openEditEventModal(id);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const id = this.getAttribute('data-id');
        confirmDeleteEvent(id);
      });
    });
  }
  
  // Open modal to add new event
  function openAddEventModal() {
    document.getElementById('modal-title').textContent = 'Add New Event';
    document.getElementById('event-id').value = '';
    document.getElementById('event-form').reset();
    document.getElementById('poster-preview').innerHTML = '';
    posterFile = null;
    eventModal.style.display = 'block';
  }
  
  // Open modal to edit event
  function openEditEventModal(eventId) {
    const event = events.find(e => e.id == eventId);
    if (!event) return;
    
    document.getElementById('modal-title').textContent = 'Edit Event';
    document.getElementById('event-id').value = event.id;
    document.getElementById('event-name').value = event.name;
    document.getElementById('event-date').value = event.date.split('T')[0];
    document.getElementById('event-venue').value = event.venue;
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-capacity').value = event.capacity;
    document.getElementById('event-status').value = event.status;
    
    // Reset poster file and preview
    posterFile = null;
    
    // Handle poster preview for existing event
    if (event.poster) {
      let posterUrl = event.poster;
      
      // Ensure the poster URL is complete
      if (!posterUrl.startsWith('http') && !posterUrl.startsWith('/')) {
        posterUrl = `https://endpoint.thefearlessmovement.co.ke/${posterUrl}`;
      }
      
      posterPreview.innerHTML = `<img src="${posterUrl}" alt="Event Poster" onerror="this.onerror=null; this.src='img/default-event.jpg';">`;
    } else {
      posterPreview.innerHTML = '<p>No poster uploaded</p>';
    }
    
    eventModal.style.display = 'block';
  }
  
  // Handle event form submission
  function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('event-id').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('event-name').value);
    formData.append('date', document.getElementById('event-date').value);
    formData.append('venue', document.getElementById('event-venue').value);
    formData.append('description', document.getElementById('event-description').value);
    formData.append('capacity', document.getElementById('event-capacity').value);
    formData.append('status', document.getElementById('event-status').value);
    
    // Get the poster file
    const posterFile = document.getElementById('event-poster').files[0];
    if (posterFile) {
      formData.append('poster', posterFile);
    }
    
    // Log the formData contents for debugging
    console.log('Sending form data:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }
    
    const url = eventId ? `https://endpoint.thefearlessmovement.co.ke/api/events/${eventId}` : 'https://endpoint.thefearlessmovement.co.ke/api/events';
    const method = eventId ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
        // Note: Don't set Content-Type header when sending FormData
      },
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showSnackbar(`Event ${eventId ? 'updated' : 'added'} successfully!`, 'success');
        loadEvents(); // Reload events to display the updated data
        eventModal.style.display = 'none';
      } else {
        showSnackbar(`Failed to ${eventId ? 'update' : 'add'} event: ${data.message}`, 'error');
      }
    })
    .catch(error => {
      console.error('Error saving event:', error);
      showSnackbar('Failed to save event. Please try again.', 'error');
    });
  }
  
  // Confirm event deletion
  function confirmDeleteEvent(eventId) {
    currentEventId = eventId;
    confirmAction = 'deleteEvent';
    document.getElementById('confirm-message').textContent = 'Are you sure you want to delete this event?';
    confirmModal.style.display = 'block';
  }
  
  // Handle confirm action
  function handleConfirmAction() {
    if (confirmAction === 'deleteEvent') {
      deleteEvent(currentEventId);
    }
    confirmModal.style.display = 'none';
  }
  
  // Delete event
  function deleteEvent(eventId) {
    fetch(`https://endpoint.thefearlessmovement.co.ke/api/events/${eventId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showSnackbar('Event deleted successfully!', 'success');
        loadEvents();
      } else {
        showSnackbar('Failed to delete event: ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error deleting event:', error);
      showSnackbar('Failed to delete event. Please try again.', 'error');
    });
  }
  
  // Load ticket sales data
  function loadTicketSales() {
    fetch('https://endpoint.thefearlessmovement.co.ke/api/events/sales', {
      headers: getHeaders()
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        renderTicketSales(data.sales);
        updateSalesStats(data.stats);
      } else {
        showSnackbar('Failed to load ticket sales: ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error loading ticket sales:', error);
      showSnackbar('Failed to load ticket sales. Please try again.', 'error');
    });
  }
  
  // Render ticket sales in table
  function renderTicketSales(sales) {
    eventsSalesBody.innerHTML = '';
    
    if (sales.length === 0) {
      eventsSalesBody.innerHTML = '<tr><td colspan="6" class="no-data">No ticket sales data available</td></tr>';
      return;
    }
    
    sales.forEach(sale => {
      const progressPercent = Math.min(100, (sale.tickets_sold / sale.capacity) * 100);
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${sale.name}</td>
        <td>${formatDate(sale.date)}</td>
        <td>${sale.venue}</td>
        <td><span class="event-status ${getStatusClass(sale.status)}">${sale.status}</span></td>
        <td>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
            <span>${sale.tickets_sold}/${sale.capacity}</span>
          </div>
        </td>
        <td>KES ${sale.revenue}</td>
      `;
      
      eventsSalesBody.appendChild(row);
    });
  }
  
  // Update sales statistics
  function updateSalesStats(stats) {
    totalEventsEl.textContent = stats.total_events;
    totalRevenueEl.textContent = `KES ${stats.total_revenue}`;
    totalTicketsEl.textContent = stats.total_tickets;
  }
  
  // Initialize ticket sales chart
  function initTicketSalesChart() {
    const ctx = document.getElementById('ticket-sales-chart').getContext('2d');
    const chartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Ticket Sales',
        data: [120, 190, 300, 250, 200, 300, 400, 350, 500, 600, 550, 700],
        backgroundColor: 'rgba(230, 126, 34, 0.2)',
        borderColor: 'rgba(230, 126, 34, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    };
    
    new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
  
  // Load recent purchases
  function loadRecentPurchases() {
    fetch('https://endpoint.thefearlessmovement.co.ke/api/purchase-ticket', {
      headers: getHeaders(),
      method: 'GET'
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        purchases = data.purchases;
        totalPages = Math.ceil(purchases.length / 10);
        renderPurchases();
        updatePagination();
      } else {
        showSnackbar('Failed to load purchases: ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error loading purchases:', error);
      showSnackbar('Failed to load purchases. Please try again.', 'error');
    });
  }
  
  // Render purchases in table
  function renderPurchases() {
    purchasesBody.innerHTML = '';
    
    if (purchases.length === 0) {
      purchasesBody.innerHTML = '<tr><td colspan="9" class="no-data">No purchases found</td></tr>';
      return;
    }
    
    let filteredPurchases = [...purchases];
    const eventFilterValue = eventFilter.value;
    const searchValue = purchaseSearch.value.toLowerCase();
    
    if (eventFilterValue !== 'all') {
      filteredPurchases = filteredPurchases.filter(p => p.event_id == eventFilterValue);
    }
    
    if (searchValue) {
      filteredPurchases = filteredPurchases.filter(p => 
        p.name.toLowerCase().includes(searchValue) || 
        p.email.toLowerCase().includes(searchValue) ||
        p.ticket_id.toLowerCase().includes(searchValue)
      );
    }
    
    const startIdx = (currentPage - 1) * 10;
    const paginatedPurchases = filteredPurchases.slice(startIdx, startIdx + 10);
    totalPages = Math.ceil(filteredPurchases.length / 10);
    
    if (paginatedPurchases.length === 0) {
      purchasesBody.innerHTML = '<tr><td colspan="9" class="no-data">No matching purchases found</td></tr>';
      return;
    }
    
    paginatedPurchases.forEach(purchase => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="purchase-checkbox" data-id="${purchase.id}"></td>
        <td>${purchase.name}</td>
        <td>${purchase.event_name}</td>
        <td>${purchase.ticket_id}</td>
        <td>${purchase.email}</td>
        <td>${formatDateTime(purchase.purchase_date)}</td>
        <td><span class="room-badge">Room ${purchase.room}</span></td>
        <td><span class="status-badge ${purchase.confirmed ? 'status-confirmed' : 'status-pending'}">
          ${purchase.confirmed ? 'Confirmed' : 'Pending'}
        </span></td>
        <td>
          <button class="action-btn confirm-btn" data-id="${purchase.id}" title="Confirm">
            <i class="fas fa-check"></i>
          </button>
          <button class="action-btn view-btn" data-id="${purchase.id}" title="View">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      purchasesBody.appendChild(row);
    });
    
    // Add event listeners for confirm and view buttons
    document.querySelectorAll('.confirm-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        confirmPurchase(id);
      });
    });
    
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        viewPurchase(id);
      });
    });
  }
  
  // Filter purchases
  function filterPurchases() {
    currentPage = 1;
    renderPurchases();
    updatePagination();
  }
  
  // Update pagination controls
  function updatePagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  }
  
  // Go to previous page
  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      renderPurchases();
      updatePagination();
    }
  }
  
  // Go to next page
  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      renderPurchases();
      updatePagination();
    }
  }
  
  // Toggle select all checkboxes
  function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.purchase-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = selectAllCheckbox.checked;
    });
  }
  
  // Get selected purchase IDs
  function getSelectedPurchaseIds() {
    const checkboxes = document.querySelectorAll('.purchase-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.dataset.id);
  }
  
  // Confirm purchase
  function confirmPurchase(purchaseId) {
    fetch(`https://endpoint.thefearlessmovement.co.ke/api/tickets/confirm/${purchaseId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ confirmed: true })
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showSnackbar('Purchase confirmed successfully!', 'success');
        loadRecentPurchases();
      } else {
        showSnackbar('Failed to confirm purchase: ' + data.message, 'error');
      }
    })
    .catch(error => {
      console.error('Error confirming purchase:', error);
      showSnackbar('Failed to confirm purchase. Please try again.', 'error');
    });
  }
  
  // View purchase details
  function viewPurchase(purchaseId) {
    const purchase = purchases.find(p => p.id == purchaseId);
    if (purchase) {
      alert(`Purchase Details:\n\nName: ${purchase.name}\nEvent: ${purchase.event_name}\nTicket ID: ${purchase.ticket_id}\nEmail: ${purchase.email}\nDate: ${formatDateTime(purchase.purchase_date)}\nRoom: ${purchase.room}\nStatus: ${purchase.confirmed ? 'Confirmed' : 'Pending'}`);
    }
  }
  
  // Export purchases
  function exportPurchases() {
    const selectedIds = getSelectedPurchaseIds();
    const eventId = eventFilter.value;
    
    let exportUrl = 'https://endpoint.thefearlessmovement.co.ke/api/tickets/export?';
    if (selectedIds.length > 0) {
      exportUrl += `ids=${selectedIds.join(',')}`;
    } else if (eventId !== 'all') {
      exportUrl += `event_id=${eventId}`;
    }
    
    fetch(exportUrl, {
      headers: getHeaders()
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchases-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showSnackbar('Export downloaded successfully!', 'success');
    })
    .catch(error => {
      console.error('Error exporting purchases:', error);
      showSnackbar('Failed to export purchases. Please try again.', 'error');
    });
  }
  
  // Populate event filter dropdown
  function populateEventFilter() {
    eventFilter.innerHTML = '<option value="all">All Events</option>';
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = event.name;
      eventFilter.appendChild(option);
    });
  }
  
  // Get status class for styling
  function getStatusClass(status) {
    switch(status.toLowerCase()) {
      case 'upcoming': return 'status-upcoming';
      case 'ongoing': return 'status-ongoing';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }
  
  // Format date for display
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
  
  // Format date and time for display
  function formatDateTime(dateTimeString) {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString(undefined, options);
  }
  
  // Show snackbar notification
  function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = message;
    snackbar.className = `snackbar ${type} show`;
    setTimeout(() => {
      snackbar.className = 'snackbar';
    }, 3000);
  }
  
  // Logout functionality
  document.getElementById('logout-btn').addEventListener('click', function() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
  });
});