const { default: axios } = require("axios");
const http = require("http")
const express = require("express")
const PieSocket = require("piesocket-nodejs")
const WebSocket = require("ws")
const url = require("url")

const piesocket = new PieSocket({
    clusterId: 'free.blr2',
    apiKey: '1sMznSzoEWUzCzp2Gbe6CukTcbaUHKkrAEGiItWb',
    secret: 'TNnfMPR9W87jc7nnfE6aPclSNruwLxJj'
});

const port = 3000
const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log('Client connected');
    const clientId = url.parse(req.url, true).query.clientId
    if (clientId) {
        clients.set(clientId, ws)
        ws.clientId = clientId;
    }
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'setId') {
            const clientId = parsedMessage.clientId;
            clients.set(clientId, ws);
            ws.clientId = clientId;
        } else if (parsedMessage.type == "getConnection") {
            const keys = clients.keys()
            const connections = []
            for (let key of keys) {
                connections.push(key)
            }
            ws.send(JSON.stringify({
                message: "Connections retrieved successfully",
                data: connections, success: true
            }))
        }
        else {
            // Handle other types of messages
            console.log(`Received message from client ${ws.clientId}: ${message}`);
        }
    });

    ws.on('close', () => {
        if (ws.clientId) {
            console.log(`Client ${ws.clientId} disconnected`);
            clients.delete(ws.clientId);
        }
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
    res.json({ message: "hello world", data: "", status: true });
});

app.get("/broadcast", async (req, res) => {
    const payload = {
        "key": "1sMznSzoEWUzCzp2Gbe6CukTcbaUHKkrAEGiItWb",
        "secret": "TNnfMPR9W87jc7nnfE6aPclSNruwLxJj",
        "channelId": 1,
        "message": { "message": "Operation completed!!!", "data": "Hello" }
    }
    try {
        await axios.post("https://free.blr2.piesocket.com/api/publish", payload, {
            headers: { "Content-Type": "application/json" }
        })
        res.json({ message: "Broadcast successful", data: "Hello", status: true });

    } catch (error) {
        if (error.response) {
            console.log(error.response?.data || 'no response data received for data broadcast');
        }
        else if (error.request) {
            console.log(error.request?.data || 'no response received for data broadcast');
        }
        else {
            console.log('failed to send request for data broadcast');
        }
        res.json({ message: "Broadcast failed", data: null, status: false });
    }
})

app.get("/publish", async (req, res) => {
    try {
        piesocket.publish(1, { "event": "new-message", "data": "Hello" })
        res.json({ message: "Broadcast successful", data: "success", status: true });
    } catch (error) {
        console.log(error)
        res.json({ message: "Broadcast failed", data: null, status: false });
    }
})

app.post("/send-data", async (req, res) => {
    const { recipientId, data, notification } = req.body
    if (!recipientId) {
        return res.status(400).json({
            message: "Recipient Id not included",
            success: false
        })
    }
    const recipient = clients.get(recipientId)
    if (!recipient) {
        return res.json({
            message: "Recipient not online",
            success: false
        })
    }
    recipient.send(JSON.stringify({
        data: {...data, date: new Date().toISOString()},
        notification: notification
    }))
    res.json({
        success: true,
        message: "Message sent successfully"
    })
})

server.listen(port, () => {
    console.log(`Server started at port ${port}`)
})