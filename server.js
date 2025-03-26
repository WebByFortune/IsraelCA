require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Function to get M-Pesa Access Token
async function getAccessToken() {
    const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

    try {
        const response = await axios.get("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error);
        return null;
    }
}

// Route to handle STK Push Payment Request
app.post("/mpesa/pay", async (req, res) => {
    const { phone, amount, tillNumber } = req.body;
    const token = await getAccessToken();

    if (!token) {
        return res.status(500).json({ message: "Failed to get access token" });
    }

    const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
    const password = Buffer.from(`${tillNumber}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");

    const requestBody = {
        BusinessShortCode: tillNumber,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: tillNumber,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "Donation",
        TransactionDesc: "Donation Payment"
    };

    try {
        const response = await axios.post("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", requestBody, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
        res.json(response.data);
    } catch (error) {
        console.error("M-Pesa STK Push error:", error);
        res.status(500).json({ message: "Payment request failed" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
