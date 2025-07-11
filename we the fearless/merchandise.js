
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    // Add click event listener to the hamburger menu
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});

// Snackbar function
function showSnackbar(message, type = 'success') {
const snackbar = document.getElementById('snackbar');
snackbar.textContent = message;
snackbar.className = `snackbar ${type} show`;

// Hide after 3 seconds
setTimeout(() => {
    snackbar.className = 'snackbar';
}, 3000);
}

let cart = [];
let cartTotal = 0;

function updateCartCount() {
const count = cart.reduce((sum, item) => sum + item.quantity, 0);
document.querySelector('.cart-count').textContent = count;
}

function updateCartDisplay() {
const cartItems = document.querySelector('.cart-items');
cartItems.innerHTML = '';
cartTotal = 0;

cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    cartTotal += itemTotal;
    
    cartItems.innerHTML += `
        <div class="cart-item">
            <div>
                <p>${item.name}</p>
                <p>KSh ${item.price} x ${item.quantity}</p>
            </div>
            <button onclick="removeFromCart('${item.id}')">&times;</button>
        </div>
    `;
});

document.getElementById('cart-total-amount').textContent = cartTotal;
}

function toggleCart() {
const cartModal = document.querySelector('.cart-modal');
cartModal.style.display = cartModal.style.display === 'block' ? 'none' : 'block';
}

function updateQuantity(productId, change) {
const qtyElement = document.getElementById(`qty-${productId}`);
let quantity = parseInt(qtyElement.textContent) + change;
if (quantity < 1) quantity = 1;
if (quantity > 10) quantity = 10;
qtyElement.textContent = quantity;
}

function addToCart(name, price, id) {
const quantity = parseInt(document.getElementById(`qty-${id}`).textContent);
const size = document.querySelector(`#qty-${id}`).parentElement.nextElementSibling.value;

// Show confirmation snackbar
const snackbar = document.getElementById('snackbar');
snackbar.textContent = `Are you sure you want to add ${quantity} ${name} (Size: ${size}) to the cart?`;
snackbar.className = 'snackbar show';

// Add "Confirm" and "Cancel" buttons to the snackbar
const confirmButton = document.createElement('button');
confirmButton.textContent = 'Confirm';
confirmButton.style.marginLeft = '10px';
confirmButton.style.backgroundColor = '#4CAF50';
confirmButton.style.color = '#fff';
confirmButton.style.border = 'none';
confirmButton.style.padding = '5px 10px';
confirmButton.style.borderRadius = '5px';
confirmButton.style.cursor = 'pointer';

const cancelButton = document.createElement('button');
cancelButton.textContent = 'Cancel';
cancelButton.style.marginLeft = '10px';
cancelButton.style.backgroundColor = '#f44336';
cancelButton.style.color = '#fff';
cancelButton.style.border = 'none';
cancelButton.style.padding = '5px 10px';
cancelButton.style.borderRadius = '5px';
cancelButton.style.cursor = 'pointer';

snackbar.appendChild(confirmButton);
snackbar.appendChild(cancelButton);

// Handle Confirm button click
confirmButton.addEventListener('click', () => {
const existingItem = cart.find(item => item.id === id);

if (existingItem) {
    existingItem.quantity += quantity;
} else {
    cart.push({ id, name, price, quantity, size });
}

updateCartCount();
updateCartDisplay();
showSnackbar(`Added ${quantity} ${name} to cart`, 'success');

// Hide snackbar
snackbar.className = 'snackbar';
snackbar.innerHTML = ''; // Clear snackbar content
});

// Handle Cancel button click
cancelButton.addEventListener('click', () => {
// Hide snackbar
snackbar.className = 'snackbar';
snackbar.innerHTML = ''; // Clear snackbar content
});

// Automatically hide snackbar after 10 seconds
setTimeout(() => {
snackbar.className = 'snackbar';
snackbar.innerHTML = ''; // Clear snackbar content
}, 10000);
}

function removeFromCart(productId) {
const removedItem = cart.find(item => item.id === productId);
if (removedItem) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    updateCartDisplay();
    showSnackbar(`Removed ${removedItem.name} from cart`, 'success');
}
}

async function checkout() {
if (cart.length === 0) {
    showSnackbar('Your cart is empty!', 'error');
    return;
}

// Show loading state
const purchaseBtn = document.querySelector('.purchase-btn');
purchaseBtn.disabled = true;
purchaseBtn.innerHTML = 'Processing... <span class="loading-spinner"></span>';

try {
    const response = await fetch('https://endpoint.thefearlessmovement.co.ke/api/send-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: cart,
            total: cartTotal
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
        showSnackbar('Order placed successfully! We will contact you soon with payment details.', 'success');
        cart = [];
        updateCartCount();
        updateCartDisplay();
        toggleCart();
    } else {
        throw new Error(data.message || 'Order processing failed');
    }
} catch (error) {
    console.error('Error:', error);
    showSnackbar(error.message || 'There was an error processing your order. Please try again.', 'error');
} finally {
    // Reset button state
    purchaseBtn.disabled = false;
    purchaseBtn.textContent = 'Purchase';
}
}

// Mobile menu handler
document.addEventListener("DOMContentLoaded", () => {
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");

hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});
});
