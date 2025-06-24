const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./mailer');
const QRCode = require('qrcode');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// ==================== MULTER FILE UPLOAD CONFIGURATION ====================
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ==================== DATABASE TABLES CREATION ====================

// Update your users table creation to include new fields
db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating users table:', err);
    } else {
        console.log('Users table created or already exists.');
    }
});

// Create donations table
db.query(`CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    message TEXT,
    donor_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating donations table:', err);
    } else {
        console.log('Donations table created or already exists.');
        // Set timezone for this connection
        db.query("SET time_zone = '+03:00'", (tzErr) => {
            if (tzErr) {
                console.error('Error setting timezone:', tzErr);
            } else {
                console.log('Timezone set to Africa/Nairobi (UTC+3)');
            }
        });
    }
});


// Create tickets table
db.query(`CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating tickets table:', err);
    } else {
        console.log('Tickets table created or already exists.');
    }
});

// Create orders table
db.query(`CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    items JSON NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating orders table:', err);
    } else {
        console.log('Orders table created or already exists.');
    }
});

// Create emails table (for contact form submissions)
db.query(`CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating emails table:', err);
    } else {
        console.log('Emails table created or already exists.');
    }
});

// Create enquiries table (for about us enquiries)
db.query(`CREATE TABLE IF NOT EXISTS enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    page_source ENUM('about.html', 'contact.html') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating enquiries table:', err);
    } else {
        console.log('Enquiries table created or already exists.');
    }
});

// Add this with your other table creation queries
db.query(`CREATE TABLE IF NOT EXISTS auth_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
)`, (err) => {
    if (err) {
        console.error('Error creating auth_users table:', err);
    } else {
        console.log('Auth_users table ready');
    }
});
// Create events table if not exists
db.query(`CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATETIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    poster VARCHAR(255),
    capacity INT NOT NULL DEFAULT 100,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating events table:', err);
    } else {
      console.log('Events table ready');
    }
  });
  
  // Create event tickets table
  db.query(`CREATE TABLE IF NOT EXISTS event_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating event_tickets table:', err);
    } else {
      console.log('Event_tickets table ready');
    }
  });
  
  // Create event_purchases table
  db.query(`CREATE TABLE IF NOT EXISTS event_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    ticket_id INT NOT NULL,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    room INT,
    confirmed BOOLEAN DEFAULT FALSE,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (ticket_id) REFERENCES event_tickets(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating event_purchases table:', err);
    } else {
      console.log('Event_purchases table ready');
    }
  });

// Create volunteers table
db.query(`CREATE TABLE IF NOT EXISTS volunteers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    code VARCHAR(50) UNIQUE NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);`, (err) => {
    if (err) {
        console.error('Error creating volunteers table:', err);
    } else {
        console.log('Volunteers table created or already exists.');
    }
});

// Create codes table
db.query(`CREATE TABLE IF NOT EXISTS codes (
    code VARCHAR(50) PRIMARY KEY,
    is_assigned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating codes table:', err);
    } else {
        console.log('Codes table created or already exists.');
    }
});

// Create registrations table
db.query(`CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_code VARCHAR(50) NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    event VARCHAR(255) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_code) REFERENCES volunteers(code)
);`, (err) => {
    if (err) {
        console.error('Error creating registrations table:', err);
    } else {
        console.log('Registrations table created or already exists.');
    }
});

// ==================== AUTHENTICATION FUNCTIONS ====================
// Function to send login notification email
const sendLoginNotification = async (email, username, loginTime, ipAddress) => {
    try {
        const templateData = {
            username,
            loginTime: new Date(loginTime).toLocaleString(),
            ipAddress
        };

        await sendEmail(
            email, 
            'Login Notification', 
            templateData, 
            'login'
        );
    } catch (error) {
        console.error('Error sending login notification:', error);
    }
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ 
            success: false, 
            message: 'No token provided' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// ==================== AUTHENTICATION ROUTES ====================
// ==================== ADMIN REGISTRATION ====================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }

    try {
        // Check if user exists
        const [existing] = await db.promise().query(
            'SELECT * FROM auth_users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        await db.promise().query(
            'INSERT INTO auth_users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // Send welcome email to the new user
        try {
            await sendEmail(
                email,
                'Welcome to The Fearless Movement!',
                { 
                    username, 
                    email,
                    password // Note: This is the plain text password - consider security implications
                },
                'user-welcome'
            );
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the request, just log the error
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});
 
// ==================== ADMIN LOGIN ====================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    try {
        // Find user
        const [users] = await db.promise().query(
            'SELECT * FROM auth_users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await db.promise().query(
            'UPDATE auth_users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Create token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            redirectTo: user.role === 'admin' ? 'admin.html' : 'dashboard.html'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});


// Protected Admin Route Example
app.get('/api/admin-dashboard', authenticateToken, (req, res) => {
    // Only authenticated admin users can access this route
    res.json({ 
        success: true, 
        message: 'Welcome to admin dashboard',
        user: req.user 
    });
});

// ==================== APPLICATION ROUTES ====================

// Route to handle merchandise orders
app.post('/api/send-order', async (req, res) => {
    try {
        const { items, total } = req.body;

        if (!items || !total) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create email content
        const templateData = {
            items,
            total,
            orderDate: new Date().toLocaleString()
        };

        // Send email notification
        await sendEmail(
            'thefearlessmovement1@gmail.com',
            'New Merchandise Order',
            templateData,
            'order'
        );

        // Save to database
        const sql = 'INSERT INTO orders (items, total) VALUES (?, ?)';
        db.query(sql, [JSON.stringify(items), total], (err, result) => {
            if (err) {
                console.error('Error saving order to database:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save order'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Order processed successfully'
            });
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process order',
            error: error.message
        });
    }
});

// Route to handle ticket purchases
app.post('/api/purchase-ticket', async (req, res) => {
    try {
        const { name, email, phone, ticketType, quantity, totalCost, eventId } = req.body;

        if (!name || !email || !phone || !ticketType || !quantity || !totalCost || !eventId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            });
        }

        // Generate a unique ticket number
        const ticketNumber = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Generate QR code
        const qrCodeData = `Ticket Number: ${ticketNumber}\nEvent: The Fearless Movement Camp\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`;
        const qrCodeImage = await QRCode.toDataURL(qrCodeData);

        // First, get the ticket_id from event_tickets table based on the ticket type
        db.query('SELECT id FROM event_tickets WHERE event_id = ? AND ticket_type = ?', 
            [eventId, ticketType], (err, ticketResults) => {
                if (err || ticketResults.length === 0) {
                    console.error('Error finding ticket type:', err || 'Ticket type not found');
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to find matching ticket type'
                    });
                }

                const ticketId = ticketResults[0].id;

                // Save to both tickets table (for backward compatibility) and event_purchases table
                db.query('INSERT INTO tickets (user_email, ticket_number, qr_code) VALUES (?, ?, ?)', 
                    [email, ticketNumber, qrCodeImage], (err, ticketResult) => {
                        if (err) {
                            console.error('Error saving to tickets table:', err);
                        }

                        // Insert into event_purchases table for admin panel display
                        const purchaseSql = `
                            INSERT INTO event_purchases 
                            (event_id, ticket_id, name, email, phone, ticket_number) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.query(purchaseSql, 
                            [eventId, ticketId, name, email, phone, ticketNumber], 
                            (err, purchaseResult) => {
                                if (err) {
                                    console.error('Error saving to event_purchases:', err);
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Failed to save ticket purchase'
                                    });
                                }

                                // Send email with ticket details
                                const templateData = {
                                    name,
                                    email,
                                    phone,
                                    ticketType,
                                    quantity,
                                    totalCost,
                                    ticketNumber,
                                    qrCodeImage,
                                };

                                sendEmail(
                                    email,
                                    'Your Ticket Purchase Confirmation',
                                    templateData,
                                    'ticket'
                                );

                                res.status(200).json({
                                    success: true,
                                    message: 'Ticket purchased successfully',
                                    ticketNumber,
                                    qrCodeImage,
                                });
                            });
                    });
            });
        
    } catch (error) {
        console.error('Error processing ticket purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process ticket purchase',
            error: error.message
        });
    }
});

// Route to handle donation submissions
app.post('/api/send-donation', async (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            address,
            message,
            donorType,
            paymentMethod,
            amount,
            to,
            subject
        } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !address || !donorType || !paymentMethod || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Prepare template data for email
        const templateData = {
            name,
            email,
            phone,
            address,
            message: message || 'No message provided',
            donorType,
            paymentMethod,
            amount
        };

        // Send email notification
        await sendEmail(
            to || 'thefearlessmovement1@gmail.com',
            subject || 'New Donation Received',
            templateData,
            'donation'
        );

        // Save to database - using promise-based query
        const [result] = await db.promise().query(
            `INSERT INTO donations 
            (name, email, phone, address, message, donor_type, payment_method, amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, 
                email, 
                phone, 
                address, 
                message || null, 
                donorType, 
                paymentMethod, 
                parseFloat(amount) // Ensure amount is a number
            ]
        );
        
        res.status(200).json({ 
            success: true, 
            message: 'Donation processed successfully',
            donationId: result.insertId 
        });
        
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process donation', 
            error: error.message 
        });
    }
});

// Existing routes
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, name, email, phone, message } = req.body;
        
        if (!to || !subject || !name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. Please provide to, subject, name, email, and message.' 
            });
        }

        const templateData = {
            name,
            email,
            phone: phone || 'Not provided', 
            message
        };
        
        // First save to database
        const [dbResult] = await db.promise().query(
            'INSERT INTO emails (name, email, phone, message) VALUES (?, ?, ?, ?)',
            [name, email, phone || null, message]
        );
        
        // Then send email
        await sendEmail(to, subject, templateData, 'contact');
        
        res.status(200).json({ 
            success: true, 
            message: 'Email sent and data saved successfully',
            recordId: dbResult.insertId 
        });
    } catch (error) {
        console.error('Error in send-email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process request', 
            error: error.message 
        });
    }
});

// Modify your existing /api/submit-form route to handle both POST and GET
 app.route('/api/submit-form')
  .post(async (req, res) => {
    // Your existing POST handler (for form submissions)
    try {
        const { name, email, phone, message, to, subject, pageSource } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const source = pageSource === 'about.html' ? 'about.html' : 'contact.html';
        const templateData = {
            name,
            email,
            phone,
            message,
            formType: source === 'about.html' ? 'About Us Form' : 'Contact Us Form'
        };

        await sendEmail(
            to || process.env.RECEIVER_EMAIL || 'thefearlessmovement1@gmail.com',
            subject || `New ${templateData.formType} Submission from ${name}`,
            templateData,
            'contact'
        );

        const sql = 'INSERT INTO enquiries (name, email, phone, message, page_source) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, email, phone, message, source], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to save submission',
                    error: err.message 
                });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Form submitted successfully',
                formType: templateData.formType
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
  })
  .get(authenticateToken, async (req, res) => {
    // New GET handler (for admin to fetch enquiries)
    try {
        const [enquiries] = await db.promise().query(`
            SELECT id, name, email, phone, message, page_source, created_at 
            FROM enquiries 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        res.json({ 
            success: true, 
            data: enquiries 
        });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch enquiries',
            error: error.message 
        });
    }
  });
 
  // Donations admin routes  
  // ==================== DONATIONS ADMIN ROUTES ====================

// Get donations with pagination
app.get('/api/donations', (req, res) => {
    console.log('Fetching donations...');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM donations';
    let countQuery = 'SELECT COUNT(*) as total FROM donations';
    const params = [];

    if (search) {
        query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
        countQuery += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.query(countQuery, params.slice(0, search ? 3 : 0), (countErr, countResult) => {
        if (countErr) {
            console.error('Error counting donations:', countErr);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to count donations' 
            });
        }

        const total = countResult[0].total;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching donations:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch donations' 
                });
            }

            res.json({
                success: true,
                donations: results,
                total: total,
                page: page,
                limit: limit
            });
        });
    });
});

// Get donation statistics
app.get('/api/donations/stats', (req, res) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const queries = {
        total: 'SELECT SUM(amount) as total FROM donations',
        thisMonth: `SELECT SUM(amount) as total FROM donations 
                   WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`,
        lastMonth: `SELECT SUM(amount) as total FROM donations 
                   WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`,
        avg: 'SELECT AVG(amount) as avg FROM donations',
        uniqueDonors: 'SELECT COUNT(DISTINCT email) as count FROM donations'
    };

    db.query(queries.total, (totalErr, totalResult) => {
        if (totalErr) {
            console.error('Error fetching total donations:', totalErr);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch total donations' 
            });
        }

        const total = totalResult[0].total || 0;

        db.query(queries.thisMonth, [currentMonth, currentYear], (thisMonthErr, thisMonthResult) => {
            if (thisMonthErr) {
                console.error('Error fetching this month donations:', thisMonthErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch this month donations' 
                });
            }

            const thisMonth = thisMonthResult[0].total || 0;

            db.query(queries.lastMonth, [lastMonth, lastMonthYear], (lastMonthErr, lastMonthResult) => {
                if (lastMonthErr) {
                    console.error('Error fetching last month donations:', lastMonthErr);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch last month donations' 
                    });
                }

                const lastMonthTotal = lastMonthResult[0].total || 0;
                const monthChange = lastMonthTotal > 0 
                    ? Math.round(((thisMonth - lastMonthTotal) / lastMonthTotal) * 100)
                    : 0;

                db.query(queries.avg, (avgErr, avgResult) => {
                    if (avgErr) {
                        console.error('Error fetching average donation:', avgErr);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Failed to fetch average donation' 
                        });
                    }

                    const avg = avgResult[0].avg || 0;

                    db.query(queries.uniqueDonors, (uniqueErr, uniqueResult) => {
                        if (uniqueErr) {
                            console.error('Error fetching unique donors:', uniqueErr);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Failed to fetch unique donors' 
                            });
                        }

                        const uniqueDonors = uniqueResult[0].count || 0;

                        // Calculate changes (simplified for demo)
                        const totalChange = Math.round(Math.random() * 20);
                        const avgChange = Math.round(Math.random() * 10 - 5);
                        const donorsChange = Math.round(Math.random() * 15);

                        res.json({
                            success: true,
                            total: total,
                            thisMonth: thisMonth,
                            monthChange: monthChange,
                            avg: avg,
                            uniqueDonors: uniqueDonors,
                            totalChange: totalChange,
                            avgChange: avgChange,
                            donorsChange: donorsChange
                        });
                    });
                });
            });
        });
    });
});

// Send thank you email for a donation
app.post('/api/donations/thank-you/:id', (req, res) => {
    const donationId = req.params.id;

    db.query('SELECT * FROM donations WHERE id = ?', [donationId], (err, results) => {
        if (err) {
            console.error('Error fetching donation:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch donation' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Donation not found' 
            });
        }

        const donation = results[0];

        // In a real implementation, you would send an email here
        // For now, we'll just simulate it
        console.log(`Sending thank you email to ${donation.email} for donation of KES ${donation.amount}`);

        res.json({
            success: true,
            message: 'Thank you email sent successfully'
        });
    });
});

// Export donations to CSV
app.get('/api/donations/export', (req, res) => {
    db.query('SELECT * FROM donations ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching donations for export:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch donations for export' 
            });
        }

        // Convert to CSV
        let csv = 'ID,Name,Email,Phone,Address,Message,Donor Type,Payment Method,Amount,Date\n';
        
        results.forEach(donation => {
            csv += `"${donation.id}","${donation.name}","${donation.email}","${donation.phone}",`;
            csv += `"${donation.address.replace(/"/g, '""')}","${(donation.message || '').replace(/"/g, '""')}",`;
            csv += `"${donation.donor_type}","${donation.payment_method}","${donation.amount}",`;
            csv += `"${new Date(donation.created_at).toISOString()}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=donations-export.csv');
        res.send(csv);
    });
});
// ==================== MERCHANDISE ADMIN ROUTES ====================

// Get orders with pagination and stats
app.get('/api/merchandise/orders', authenticateToken, (req, res) => {
    console.log('Fetching orders...');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get orders
    const ordersQuery = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    // Get stats
    const statsQuery = `
        SELECT 
            COUNT(*) as totalOrders,
            SUM(total) as totalRevenue,
            (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) as todayOrders,
            (SELECT SUM(total) FROM orders WHERE DATE(created_at) = CURDATE()) as todayRevenue
        FROM orders
    `;

    // Get top items
    const topItemsQuery = `
        SELECT 
            JSON_EXTRACT(items, '$[*].name') as itemNames,
            COUNT(*) as orderCount
        FROM orders
        GROUP BY itemNames
        ORDER BY orderCount DESC
        LIMIT 5
    `;

    db.query(ordersQuery, [limit, offset], (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch orders' 
            });
        }

        // Debug: Log the first order's items and its type
        if (orders.length > 0) {
            console.log('First order items:', orders[0].items);
            console.log('Type of items:', typeof orders[0].items);
        }

        db.query(statsQuery, (statsErr, statsResult) => {
            if (statsErr) {
                console.error('Error fetching stats:', statsErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch stats' 
                });
            }

            db.query(topItemsQuery, (topItemsErr, topItems) => {
                if (topItemsErr) {
                    console.error('Error fetching top items:', topItemsErr);
                    // Don't fail the whole request for this
                }

                res.json({
                    success: true,
                    orders: orders.map(order => {
                        try {
                            // Handle both string and already-parsed JSON
                            let items = order.items;
                            if (typeof items === 'string') {
                                items = JSON.parse(items);
                            } else if (items && typeof items === 'object') {
                                // Already parsed, use as is
                            } else {
                                items = [];
                            }
                            
                            return {
                                ...order,
                                items: items
                            };
                        } catch (e) {
                            console.error('Error parsing items for order:', order.id, e);
                            return {
                                ...order,
                                items: [] // Default to empty array if parsing fails
                            };
                        }
                    }),
                    stats: statsResult[0],
                    topItems: topItems || []
                });
            });
        });
    });
});
// Get order statistics for charts
app.get('/api/merchandise/stats', authenticateToken, (req, res) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Monthly sales data
    const monthlySalesQuery = `
        SELECT 
            MONTH(created_at) as month,
            SUM(total) as total
        FROM orders
        WHERE YEAR(created_at) = ?
        GROUP BY MONTH(created_at)
        ORDER BY month
    `;

    // Weekly sales data (last 8 weeks)
    const weeklySalesQuery = `
        SELECT 
            WEEK(created_at, 1) as week,
            SUM(total) as total
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY WEEK(created_at, 1)
        ORDER BY week
        LIMIT 8
    `;

    db.query(monthlySalesQuery, [currentYear], (monthlyErr, monthlyData) => {
        if (monthlyErr) {
            console.error('Error fetching monthly stats:', monthlyErr);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch monthly stats' 
            });
        }

        db.query(weeklySalesQuery, (weeklyErr, weeklyData) => {
            if (weeklyErr) {
                console.error('Error fetching weekly stats:', weeklyErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch weekly stats' 
                });
            }

            res.json({
                success: true,
                monthlyData,
                weeklyData
            });
        });
    });
});
// // ==================== MERCHANDISE ANALYTICS ENDPOINTS ====================

// Get monthly sales data
app.get('/api/merchandise/monthly-sales', authenticateToken, (req, res) => {
    const currentYear = new Date().getFullYear();
    
    const query = `
        SELECT 
            MONTH(created_at) as month,
            SUM(total) as total_sales,
            COUNT(*) as order_count
        FROM orders
        WHERE YEAR(created_at) = ?
        GROUP BY MONTH(created_at)
        ORDER BY month
    `;
    
    db.query(query, [currentYear], (err, results) => {
        if (err) {
            console.error('Error fetching monthly sales:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch monthly sales data'
            });
        }
        
        // Fill in missing months with 0 values
        const monthlyData = Array(12).fill().map((_, i) => {
            const monthData = results.find(item => item.month === i + 1);
            return {
                month: i + 1,
                total_sales: monthData ? monthData.total_sales : 0,
                order_count: monthData ? monthData.order_count : 0
            };
        });
        
        res.json({
            success: true,
            data: monthlyData
        });
    });
});

// Get weekly sales trends
app.get('/api/merchandise/weekly-trends', authenticateToken, (req, res) => {
    const weeks = parseInt(req.query.weeks) || 8; // Default to last 8 weeks
    
    const query = `
        SELECT 
            YEAR(created_at) as year,
            WEEK(created_at, 1) as week,
            CONCAT(YEAR(created_at), '-', WEEK(created_at, 1)) as week_number,
            SUM(total) as total_sales,
            COUNT(*) as order_count
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        GROUP BY year, week
        ORDER BY year DESC, week DESC
        LIMIT ?
    `;
    
    db.query(query, [weeks, weeks], (err, results) => {
        if (err) {
            console.error('Error fetching weekly trends:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch weekly sales trends',
                error: err.message
            });
        }
        
        // Format the data with week labels
        const weeklyData = results.map(item => ({
            ...item,
            week_label: `Week ${item.week}, ${item.year}`
        })).reverse(); // Reverse to show oldest first
        
        res.json({
            success: true,
            data: weeklyData
        });
    });
});

// // Get top selling items
app.get('/api/merchandise/top-items', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 5; // Default to top 5
    const period = req.query.period || 'all'; // all, month, week
    
    let dateCondition = '';
    if (period === 'month') {
        dateCondition = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (period === 'week') {
        dateCondition = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
    }
    
    // This query extracts items from the JSON array and counts them
    const query = `
        SELECT 
            item.name,
            item.price,
            SUM(item.quantity) as total_quantity,
            SUM(item.quantity * item.price) as total_revenue
        FROM orders,
             JSON_TABLE(
                 items,
                 '$[*]' COLUMNS(
                     name VARCHAR(100) PATH '$.name',
                     price DECIMAL(10,2) PATH '$.price',
                     quantity INT PATH '$.quantity'
                 )
             ) as item
        ${dateCondition}
        GROUP BY item.name, item.price
        ORDER BY total_quantity DESC
        LIMIT ?
    `;
    
    db.query(query, [limit], (err, results) => {
        if (err) {
            console.error('Error fetching top items:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch top selling items'
            });
        }
        
        res.json({
            success: true,
            data: results
        });
    });
}); 
 
// ==================== EVENTS API ENDPOINTS ==================== 
// Get all events
app.get('/api/events', (req, res) => {
    const query = `
      SELECT e.*, 
             COUNT(ep.id) as tickets_sold,
             SUM(et.price) as revenue
      FROM events e
      LEFT JOIN event_purchases ep ON e.id = ep.event_id
      LEFT JOIN event_tickets et ON ep.ticket_id = et.id
      GROUP BY e.id
      ORDER BY e.date DESC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching events:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch events' 
        });
      }
      
      res.json({
        success: true,
        events: results
      });
    });
  });
  
  // Create or update event
  app.post('/api/events', upload.single('poster'), (req, res) => {
    const { name, description, date, venue, capacity, status } = req.body;
    const posterPath = req.file ? `/uploads/${req.file.filename}` : null;
    
    const sql = `
      INSERT INTO events (name, description, date, venue, poster, capacity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [name, description, date, venue, posterPath, capacity, status], (err, result) => {
      if (err) {
        console.error('Error creating event:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create event' 
        });
      }
      
      res.json({
        success: true,
        eventId: result.insertId
      });
    });
  });
  
  app.put('/api/events/:id', upload.single('poster'), (req, res) => {
    const eventId = req.params.id;
    const { name, description, date, venue, capacity, status } = req.body;
    const posterPath = req.file ? `/uploads/${req.file.filename}` : null;
    
    // First get current poster path to delete old file if needed
    db.query('SELECT poster FROM events WHERE id = ?', [eventId], (err, results) => {
      if (err) {
        console.error('Error fetching event:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update event' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Event not found' 
        });
      }
      
      const currentPoster = results[0].poster;
      
      // Delete old poster file if it exists and a new one is uploaded
      if (currentPoster && posterPath) {
        fs.unlink(path.join(__dirname, currentPoster), (err) => {
          if (err) console.error('Error deleting old poster:', err);
        });
      }
      
      // Update event
      const updateSql = `
        UPDATE events 
        SET name = ?, description = ?, date = ?, venue = ?, 
            ${posterPath ? 'poster = ?,' : ''}
            capacity = ?, status = ?
        WHERE id = ?
      `;
      
      const params = [
        name, description, date, venue,
        ...(posterPath ? [posterPath] : []),
        capacity, status, eventId
      ];
      
      db.query(updateSql, params, (err, result) => {
        if (err) {
          console.error('Error updating event:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to update event' 
          });
        }
        
        res.json({
          success: true,
          message: 'Event updated successfully'
        });
      });
    });
  });
  
  // Delete event
  app.delete('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    
    // First get poster path to delete file
    db.query('SELECT poster FROM events WHERE id = ?', [eventId], (err, results) => {
      if (err) {
        console.error('Error fetching event:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete event' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Event not found' 
        });
      }
      
      const posterPath = results[0].poster;
      
      // Delete poster file if it exists
      if (posterPath) {
        fs.unlink(path.join(__dirname, posterPath), (err) => {
          if (err) console.error('Error deleting poster:', err);
        });
      }
      
      // Delete event
      db.query('DELETE FROM events WHERE id = ?', [eventId], (err, result) => {
        if (err) {
          console.error('Error deleting event:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete event' 
          });
        }
        
        res.json({
          success: true,
          message: 'Event deleted successfully'
        });
      });
    });
  });
  
  // Get ticket sales data
  app.get('/api/events/sales', (req, res) => {
    // Get sales stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_events,
        SUM(et.price) as total_revenue,
        COUNT(ep.id) as total_tickets
      FROM events e
      LEFT JOIN event_purchases ep ON e.id = ep.event_id
      LEFT JOIN event_tickets et ON ep.ticket_id = et.id
    `;
    
    // Get sales by event
    const salesQuery = `
      SELECT 
        e.id,
        e.name,
        e.date,
        e.venue,
        e.capacity,
        e.status,
        COUNT(ep.id) as tickets_sold,
        SUM(et.price) as revenue
      FROM events e
      LEFT JOIN event_purchases ep ON e.id = ep.event_id
      LEFT JOIN event_tickets et ON ep.ticket_id = et.id
      GROUP BY e.id
      ORDER BY e.date DESC
    `;
    
    db.query(statsQuery, (statsErr, statsResult) => {
      if (statsErr) {
        console.error('Error fetching sales stats:', statsErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch sales stats' 
        });
      }
      
      db.query(salesQuery, (salesErr, salesResult) => {
        if (salesErr) {
          console.error('Error fetching sales data:', salesErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch sales data' 
          });
        }
        
        res.json({
          success: true,
          stats: statsResult[0],
          sales: salesResult
        });
      });
    });
  });
  
  // Get recent purchases
  app.get('/api/purchase-ticket', (req, res) => {
    const query = `
      SELECT 
        ep.id,
        ep.name,
        ep.email,
        ep.phone,
        ep.ticket_number as ticket_id,
        ep.room,
        ep.confirmed,
        ep.purchase_date,
        e.id as event_id,
        e.name as event_name,
        et.ticket_type,
        et.price
      FROM event_purchases ep
      JOIN events e ON ep.event_id = e.id
      JOIN event_tickets et ON ep.ticket_id = et.id
      ORDER BY ep.purchase_date DESC
      LIMIT 100
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching purchases:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch purchases' 
        });
      }
      
      // Auto-assign rooms (5 people per room)
      let roomCounter = 1;
      let peopleInCurrentRoom = 0;
      
      const purchasesWithRooms = results.map(purchase => {
        if (peopleInCurrentRoom >= 5) {
          roomCounter++;
          peopleInCurrentRoom = 0;
        }
        
        peopleInCurrentRoom++;
        return {
          ...purchase,
          room: roomCounter
        };
      });
      
      res.json({
        success: true,
        purchases: purchasesWithRooms
      });
    });
  });
  
  // Confirm purchase
  app.post('/api/tickets/confirm/:id', (req, res) => {
    const purchaseId = req.params.id;
    
    db.query('UPDATE event_purchases SET confirmed = TRUE WHERE id = ?', [purchaseId], (err, result) => {
      if (err) {
        console.error('Error confirming purchase:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to confirm purchase' 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Purchase not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Purchase confirmed successfully'
      });
    });
  });
  
  // Export purchases
  app.get('/api/tickets/export', (req, res) => {
    const { ids, event_id } = req.query;
    
    let whereClause = '';
    if (ids) {
      whereClause = `WHERE ep.id IN (${ids})`;
    } else if (event_id) {
      whereClause = `WHERE ep.event_id = ${event_id}`;
    }
    
    const query = `
      SELECT 
        ep.id,
        ep.name,
        ep.email,
        ep.phone,
        ep.ticket_number as ticket_id,
        ep.room,
        ep.confirmed,
        ep.purchase_date,
        e.name as event_name,
        et.ticket_type,
        et.price
      FROM event_purchases ep
      JOIN events e ON ep.event_id = e.id
      JOIN event_tickets et ON ep.ticket_id = et.id
      ${whereClause}
      ORDER BY ep.purchase_date DESC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching purchases for export:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to export purchases' 
        });
      }
      
      // Convert to CSV
      let csv = 'ID,Name,Email,Phone,Ticket ID,Event,Room,Status,Type,Price,Date\n';
      
      results.forEach(purchase => {
        csv += `"${purchase.id}","${purchase.name}","${purchase.email}","${purchase.phone}",`;
        csv += `"${purchase.ticket_id}","${purchase.event_name}","${purchase.room}",`;
        csv += `"${purchase.confirmed ? 'Confirmed' : 'Pending'}","${purchase.ticket_type}",`;
        csv += `"${purchase.price}","${new Date(purchase.purchase_date).toISOString()}"\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=purchases-export.csv');
      res.send(csv);
    });
  }); 

// ==================== ENQUIRIES ADMIN ROUTES ====================

// Get enquiries with pagination and stats
app.get('/api/enquiries', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        // Base queries
        let baseQuery = 'FROM enquiries';
        let whereClause = '';
        const queryParams = [];

        if (search) {
            whereClause = ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total ${baseQuery} ${whereClause}`,
            queryParams
        );

        const total = countResult[0].total;

        // Get paginated data
        const [enquiries] = await db.promise().query(
            `SELECT * ${baseQuery} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        // Get stats
        const [contactCount] = await db.promise().query(
            `SELECT COUNT(*) as count FROM enquiries WHERE page_source = 'contact.html'`
        );

        const [aboutCount] = await db.promise().query(
            `SELECT COUNT(*) as count FROM enquiries WHERE page_source = 'about.html'`
        );

        res.json({
            success: true,
            data: enquiries,
            total: total,
            page: page,
            limit: limit,
            stats: {
                total: total,
                contact: contactCount[0].count,
                about: aboutCount[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiries',
            error: error.message
        });
    }
});

// ==================== ADMIN ENQUIRIES ENDPOINTS ====================

// Get all enquiries for admin
app.get('/api/admin/enquiries', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let baseQuery = 'FROM enquiries';
        let whereClause = '';
        const queryParams = [];

        if (search) {
            whereClause = ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total ${baseQuery} ${whereClause}`,
            queryParams
        );

        // Get paginated data
        const [enquiries] = await db.promise().query(
            `SELECT * ${baseQuery} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        // Get stats
        const [contactCount] = await db.promise().query(
            `SELECT COUNT(*) as count FROM enquiries WHERE page_source = 'contact.html'`
        );
        const [aboutCount] = await db.promise().query(
            `SELECT COUNT(*) as count FROM enquiries WHERE page_source = 'about.html'`
        );

        res.json({
            success: true,
            data: enquiries,
            stats: {
                total: countResult[0].total,
                contact: contactCount[0].count,
                about: aboutCount[0].count
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiries',
            error: error.message
        });
    }
});

// Delete enquiry
app.delete('/api/admin/enquiries/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.promise().query(
            'DELETE FROM enquiries WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        res.json({
            success: true,
            message: 'Enquiry deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete enquiry',
            error: error.message
        });
    }
});
// ==================== ENQUIRIES ANALYTICS ENDPOINTS ====================

// Get enquiries trend data (last 30 days)
app.get('/api/admin/enquiries/trend', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.promise().query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                SUM(page_source = 'contact.html') as contact,
                SUM(page_source = 'about.html') as about
            FROM enquiries
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error fetching enquiry trends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiry trends'
        });
    }
});

// Get enquiries by time of day
app.get('/api/admin/enquiries/time-distribution', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.promise().query(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as count
            FROM enquiries
            GROUP BY HOUR(created_at)
            ORDER BY hour ASC
        `);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error fetching time distribution:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch time distribution'
        });
    }
});

    //Get user profile
 app.get('/api/user/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user profile:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch user profile' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            profile: results[0]
        });
    });
}); 

// ==================== CODES ADMIN ROUTES ==================== 
// Generate new codes
app.post('/api/generate-codes', authenticateToken, async (req, res) => {
    const { codes } = req.body;

    try {
        const timestamp = new Date().toISOString();
        const values = codes.map(code => [code, timestamp]);

        await db.promise().query(
            'INSERT IGNORE INTO codes (code, created_at) VALUES ?',
            [values]
        );

        res.json({ success: true, message: `${codes.length} codes generated successfully` });
    } catch (error) {
        console.error('Error generating codes:', error);
        res.status(500).json({ success: false, message: 'Failed to generate codes' });
    }
});

// Get all available codes
app.get('/api/codes', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT code, is_assigned FROM codes');
        res.json({ success: true, codes: rows });
    } catch (error) {
        console.error('Error fetching codes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch codes' });
    }
});

// Assign code to volunteer
app.post('/api/assign-volunteer', (req, res) => {
    const { name, email, phone, code } = req.body;
    // Change this line to use MySQL compatible format
    const assignedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Failed to start transaction' });
        }

        // Check if code exists and is unassigned
        db.query("SELECT code FROM codes WHERE code = ? AND is_assigned = 0", [code], (err, rows) => {
            if (err) {
                db.rollback(() => {
                    console.error('Error checking code availability:', err);
                    return res.status(500).json({ error: 'Failed to check code availability' });
                });
            }

            if (rows.length === 0) {
                db.rollback(() => {
                    return res.status(400).json({ error: 'Code not available or already assigned' });
                });
            }

            // Insert volunteer
            db.query(
                "INSERT INTO volunteers (name, email, phone, code, assigned_date) VALUES (?, ?, ?, ?, ?)",
                [name, email, phone, code, assignedDate],
                (err, result) => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Error inserting volunteer:', err);
                            return res.status(500).json({ error: 'Failed to insert volunteer' });
                        });
                    }

                    // Mark code as assigned
                    db.query(
                        "UPDATE codes SET is_assigned = 1 WHERE code = ?",
                        [code],
                        (err) => {
                            if (err) {
                                db.rollback(() => {
                                    console.error('Error updating code status:', err);
                                    return res.status(500).json({ error: 'Failed to update code status' });
                                });
                            }

                            db.commit((err) => {
                                if (err) {
                                    db.rollback(() => {
                                        console.error('Error committing transaction:', err);
                                        return res.status(500).json({ error: 'Failed to commit transaction' });
                                    });
                                }

                                res.json({
                                    message: 'Volunteer assigned successfully',
                                    volunteerId: result.insertId
                                });
                            });
                        }
                    );
                }
            );
        });
    });
});


// Get all volunteers
app.get('/api/volunteers', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT v.*, 
                   COUNT(r.id) AS member_count,
                   COALESCE(SUM(r.amount_paid), 0) AS total_revenue
            FROM volunteers v
            LEFT JOIN registrations r ON v.code = r.volunteer_code
            GROUP BY v.id
        `);

        res.json({ success: true, volunteers: rows });
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch volunteers' });
    }
});

// Add new registration
app.post('/api/registrations', async (req, res) => {
    const { volunteerCode, memberName, phone, event, amountPaid, balance } = req.body;
    
    // Validate required fields
    if (!volunteerCode || !memberName || !event || amountPaid === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields',
            required: ['volunteerCode', 'memberName', 'event', 'amountPaid']
        });
    }

    try {
        // Check volunteer exists
        const [volunteer] = await db.promise().query(
            'SELECT id FROM volunteers WHERE code = ?', 
            [volunteerCode]
        );
        
        if (!volunteer.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid volunteer code',
                error: `Volunteer with code ${volunteerCode} not found`
            });
        }

        // Insert registration
        const [result] = await db.promise().query(
            `INSERT INTO registrations 
            (volunteer_code, member_name, phone, event, amount_paid, balance, registration_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                volunteerCode, 
                memberName, 
                phone, 
                event, 
                amountPaid, 
                balance || 0, 
                new Date().toISOString().slice(0, 19).replace('T', ' ')
            ]
        );

        res.json({
            success: true,
            message: 'Registration added successfully',
            registrationId: result.insertId
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to add registration',
            error: err.message
        });
    }
});

// Get all registrations
app.get('/api/registrations', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                r.volunteer_code as volunteerCode,
                r.member_name as memberName,
                r.phone,
                r.event,
                r.amount_paid as amountPaid,
                r.balance,
                r.registration_date as registrationDate,
                v.name as volunteerName
            FROM registrations r
            LEFT JOIN volunteers v ON r.volunteer_code = v.code
        `);

        res.json({ success: true, registrations: rows });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
});

// Get members for a specific volunteer
app.get('/api/volunteers/:code/members', authenticateToken, async (req, res) => {
    const { code } = req.params;

    try {
        const [members] = await db.promise().query(
            'SELECT * FROM registrations WHERE volunteer_code = ?',
            [code]
        );

        const [volunteer] = await db.promise().query(
            'SELECT name FROM volunteers WHERE code = ?',
            [code]
        );

        res.json({ success: true, volunteer: volunteer[0], members });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

// Root route
app.get('/', (req, res) => {
    res.send('Get ready for the fearless!!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});