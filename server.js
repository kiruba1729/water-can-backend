const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE;

// API to book a water can and store it in DynamoDB
app.post("/order", async (req, res) => {
    const { doorNo, quantity } = req.body;
    
    if (!doorNo || !quantity) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = uuidv4();
    const order = {
        orderId,
        doorNo,
        quantity,
        timestamp: new Date().toISOString()
    };

    try {
        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: order
        }).promise();

        res.json({ message: "Order placed successfully!", order });
    } catch (error) {
        console.error("DynamoDB Error:", error);
        res.status(500).json({ error: "Failed to place order" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
