import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post("/github/oauth", async (req, res) => {
    const { code } = req.body;

    const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code
        })
    });

    const data = await response.json();
    res.json(data);
});

app.options("*", cors());

app.listen(3000, '0.0.0.0', () => console.log("🚀 Server running on port 3000"));