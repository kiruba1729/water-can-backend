const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Configure AWS (region is taken from .env)
AWS.config.update({
    region: process.env.AWS_REGION
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Table names from .env
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const VENDORS_TABLE = process.env.VENDORS_TABLE;
// (Add additional tables as needed)

// ---------------------------------------------
// Customer Registration (Example API)
// ---------------------------------------------
app.post("/register", async (req, res) => {
    const { fullName, block, doorNo, address } = req.body;

    if (!fullName || !doorNo) {
        return res.status(400).json({ message: "Full Name and Door No are required!" });
    }

    // Generate a unique userId (you might allow users to choose one too)
    const userId = uuidv4();
    const newUser = { userId, fullName, block, doorNo, address };

    try {
        await dynamoDB.put({ TableName: CUSTOMERS_TABLE, Item: newUser }).promise();
        res.json({ message: "User registered successfully!", userId });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error });
    }
});

// ---------------------------------------------
// Place Order (For Customers)
// ---------------------------------------------
app.post("/order", async (req, res) => {
    const { userId, quantity } = req.body;
    if (!userId || !quantity) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const order = {
        orderId: uuidv4(),
        userId,
        quantity,
        timestamp: new Date().toISOString(),
        status: "Pending"
    };

    try {
        await dynamoDB.put({ TableName: ORDERS_TABLE, Item: order }).promise();
        res.json({ message: "Order placed successfully!", order });
    } catch (error) {
        res.status(500).json({ error: "Error placing order", details: error });
    }
});

// ---------------------------------------------
// Get Order History (For Customers)
// ---------------------------------------------
app.get("/order-history", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }
    // Query or scan based on your table design. For simplicity, we'll use scan here.
    try {
        const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();
        const orders = result.Items.filter(order => order.userId === userId);
        res.json({ orders });
    } catch (error) {
        res.status(500).json({ error: "Error fetching orders", details: error });
    }
});

// ---------------------------------------------
// Get Vendor Dashboard Data
// ---------------------------------------------
app.get("/vendor-dashboard", async (req, res) => {
    try {
        const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();
        const orders = result.Items;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.quantity * 20), 0); // Example: ₹20 per can
        const totalCansSold = orders.reduce((acc, order) => acc + Number(order.quantity), 0);
        res.json({ totalRevenue, totalCansSold, orders });
    } catch (error) {
        res.status(500).json({ error: "Error fetching dashboard data", details: error });
    }
});

// ---------------------------------------------
// Get Monthly Report (User-based or Total)
// ---------------------------------------------
app.get("/monthly-report", async (req, res) => {
    const { month, year, userId } = req.query;

    try {
        const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();
        const orders = result.Items.filter(order => {
            const orderDate = new Date(order.timestamp);
            return (
                orderDate.getMonth() + 1 === parseInt(month) &&
                orderDate.getFullYear() === parseInt(year) &&
                (!userId || order.userId === userId)
            );
        });
        const totalRevenue = orders.reduce((acc, order) => acc + (order.quantity * 20), 0);
        const totalCansSold = orders.reduce((acc, order) => acc + Number(order.quantity), 0);
        res.json({ totalRevenue, totalCansSold, orders });
    } catch (error) {
        res.status(500).json({ error: "Error generating report", details: error });
    }
});

app.listen(process.env.PORT || 4000, () => {
    console.log(`🚀 Server running on http://localhost:${process.env.PORT || 4000}`);
});


