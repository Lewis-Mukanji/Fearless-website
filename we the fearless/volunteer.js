document.addEventListener('DOMContentLoaded', function() {
    const generateCodesBtn = document.getElementById('generateCodes');
    const codeDisplay = document.getElementById('codeDisplay');
    const volunteerCodeSelect = document.getElementById('volunteerCode');
    const searchBtn = document.getElementById('searchBtn');
    const searchCodeInput = document.getElementById('searchCode');
    const memberTableBody = document.getElementById('memberTableBody');
    
    // Generate 50 unique codes
    generateCodesBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/generate-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Display codes
                codeDisplay.innerHTML = '';
                data.codes.forEach(code => {
                    const codeElement = document.createElement('span');
                    codeElement.className = 'code-item';
                    codeElement.textContent = code;
                    codeDisplay.appendChild(codeElement);
                });
                
                // Populate dropdown
                volunteerCodeSelect.innerHTML = '<option value="">Select a code</option>';
                data.codes.forEach(code => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = code;
                    volunteerCodeSelect.appendChild(option);
                });
                
                alert('50 unique codes generated successfully!');
            } else {
                alert('Error generating codes: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate codes');
        }
    });
    
    // Register volunteer
    document.getElementById('volunteerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const volunteerName = document.getElementById('volunteerName').value;
        const code = volunteerCodeSelect.value;
        
        try {
            const response = await fetch('/api/register-volunteer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: volunteerName,
                    code: code
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Volunteer registered successfully!');
                document.getElementById('volunteerForm').reset();
            } else {
                alert('Error registering volunteer: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to register volunteer');
        }
    });
    
    // Search members by code
    searchBtn.addEventListener('click', async function() {
        const code = searchCodeInput.value.trim();
        
        if (!code) {
            alert('Please enter a volunteer code');
            return;
        }
        
        try {
            const response = await fetch(`/api/members?code=${encodeURIComponent(code)}`);
            const data = await response.json();
            
            if (data.success) {
                // Display members
                memberTableBody.innerHTML = '';
                
                if (data.members.length === 0) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 5;
                    cell.textContent = 'No members found for this volunteer code';
                    row.appendChild(cell);
                    memberTableBody.appendChild(row);
                } else {
                    data.members.forEach(member => {
                        const row = document.createElement('tr');
                        
                        const nameCell = document.createElement('td');
                        nameCell.textContent = member.name;
                        row.appendChild(nameCell);
                        
                        const eventCell = document.createElement('td');
                        eventCell.textContent = member.event;
                        row.appendChild(eventCell);
                        
                        const amountCell = document.createElement('td');
                        amountCell.textContent = member.amount_paid;
                        row.appendChild(amountCell);
                        
                        const balanceCell = document.createElement('td');
                        balanceCell.textContent = member.balance || '0';
                        row.appendChild(balanceCell);
                        
                        const dateCell = document.createElement('td');
                        dateCell.textContent = new Date(member.created_at).toLocaleDateString();
                        row.appendChild(dateCell);
                        
                        memberTableBody.appendChild(row);
                    });
                }
            } else {
                alert('Error fetching members: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to fetch members');
        }
    });
});