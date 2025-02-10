const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");  // Unique IDs for users/orders

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// AWS DynamoDB Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define Table Names
const CUSTOMERS_TABLE = "Customers";
const ORDERS_TABLE = "Orders";

// ---------------------------------------------
// ✅ CUSTOMER REGISTRATION
// ---------------------------------------------
app.post("/register", async (req, res) => {
    const { fullName, block, doorNo, address } = req.body;

    if (!fullName || !doorNo) {
        return res.status(400).json({ message: "Full Name and Door No are required!" });
    }

    const userId = uuidv4(); // Generate unique user ID

    const newUser = {
        userId,
        fullName,
        block,
        doorNo,
        address
    };

    await dynamoDB.put({ TableName: CUSTOMERS_TABLE, Item: newUser }).promise();
    res.json({ message: "User registered successfully!", userId });
});

// ---------------------------------------------
// ✅ PLACE AN ORDER
// ---------------------------------------------
app.post("/order", async (req, res) => {
    const { userId, quantity, vendorId } = req.body;

    if (!userId || !quantity) {
        return res.status(400).json({ message: "User ID and quantity are required!" });
    }

    const orderId = uuidv4();
    const totalPrice = quantity * 20; // ₹20 per can

    const newOrder = {
        orderId,
        userId,
        vendorId,
        quantity,
        totalPrice,
        timestamp: new Date().toISOString(),
        status: "Pending"
    };

    await dynamoDB.put({ TableName: ORDERS_TABLE, Item: newOrder }).promise();
    res.json({ message: "Order placed successfully!", orderId });
});

// ---------------------------------------------
// ✅ GET ORDER HISTORY (FOR CUSTOMERS)
// ---------------------------------------------
app.get("/order-history", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();
    const orders = result.Items.filter(order => order.userId === userId);

    res.json({ orders });
});

// ---------------------------------------------
// ✅ VENDOR DASHBOARD (TOTAL REVENUE & SALES)
// ---------------------------------------------
app.get("/vendor-dashboard", async (req, res) => {
    const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();

    const totalRevenue = result.Items.reduce((acc, order) => acc + order.totalPrice, 0);
    const totalCansSold = result.Items.reduce((acc, order) => acc + Number(order.quantity), 0);

    res.json({ totalRevenue, totalCansSold, orders: result.Items });
});

// ---------------------------------------------
// ✅ MONTHLY REPORTS (USER-BASED & TOTAL)
// ---------------------------------------------
app.get("/monthly-report", async (req, res) => {
    const { month, year, userId } = req.query;

    const result = await dynamoDB.scan({ TableName: ORDERS_TABLE }).promise();

    const filteredOrders = result.Items.filter(order => {
        const orderDate = new Date(order.timestamp);
        return (
            orderDate.getMonth() + 1 === parseInt(month) &&
            orderDate.getFullYear() === parseInt(year) &&
            (!userId || order.userId === userId)
        );
    });

    const totalRevenue = filteredOrders.reduce((acc, order) => acc + order.totalPrice, 0);
    const totalCansSold = filteredOrders.reduce((acc, order) => acc + order.quantity, 0);

    res.json({ totalRevenue, totalCansSold, orders: filteredOrders });
});

// ---------------------------------------------
// ✅ START SERVER
// ---------------------------------------------
app.listen(4000, () => {
    console.log("🚀 Server running on http://localhost:4000");
});

