    const languageExtensions = {
    "C++": "cpp", "Java": "java", "Python": "py", "Python3": "py",
    "C": "c", "C#": "cs", "JavaScript": "js", "TypeScript": "ts",
    "PHP": "php", "Swift": "swift", "Kotlin": "kt", "Dart": "dart",
    "Go": "go", "Ruby": "rb", "Scala": "scala", "Rust": "rs",
    "Racket": "rkt", "Erlang": "erl", "Elixir": "ex"
};

function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in background.js:", request);

    if (request.action === "uploadToGitHub") {
        (async () => {
            try {
                console.log("Processing GitHub Upload Request...");

                let { code, problemTitle, language } = request;
                
                // Ensure language is mapped correctly
                let languageKey = Object.keys(languageExtensions).find(key => key.toLowerCase() === language.toLowerCase());
                const extension = languageKey ? languageExtensions[languageKey] : "txt";
                const folderName = capitalizeWords(problemTitle);
                let filename = `${folderName}.${extension}`;

                console.log(`Detected Language: ${language}, Mapped Extension: ${extension}`);

                let data = await new Promise((resolve) => {
                    chrome.storage.sync.get(["token", "repo"], resolve);
                });

                if (!data.token || !data.repo) {
                    console.error("GitHub token or repo missing.");
                    sendResponse({ success: false, error: "Missing GitHub token or repository." });
                    return;
                }

                const repo = data.repo;
                const token = data.token;
                const filePath = `${folderName}/${filename}`;
                const githubApiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

                console.log(`Preparing to upload: ${filePath}`);
                console.log("GitHub Repository:", repo);

                // Check if file exists
                let fileResponse = await fetch(githubApiUrl, {
                    headers: { "Authorization": `token ${token}` }
                });

                let sha = null;
                if (fileResponse.ok) {
                    let fileData = await fileResponse.json();
                    sha = fileData.sha;
                }

                // Upload or update file in GitHub
                console.log("Uploading to GitHub...");
                let response = await fetch(githubApiUrl, {
                    method: "PUT",
                    headers: {
                        "Authorization": `token ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: `LeetCode Submission - ${folderName}`,
                        content: btoa(code),
                        sha: sha // Include SHA if updating
                    })
                });

                let responseData = await response.json();
                console.log("GitHub Response:", responseData);

                if (response.ok) {
                    console.log("Successfully uploaded to GitHub!");
                    if (chrome.notifications && chrome.notifications.create) {
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "icon.png",
                            title: "LeetCode Submission Saved",
                            message: `${folderName} has been pushed to GitHub!`
                        });
                    } else {
                        console.warn("Notifications API is unavailable in this context.");
                    }
                    sendResponse({ success: true, data: responseData });
                } else {
                    console.error("GitHub Upload Failed:", responseData);
                    sendResponse({ success: false, error: responseData.message });
                }
            } catch (error) {
                console.error("GitHub Upload Error:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true; //Ensures the response will be sent asynchronously
    }

    if (request.action === "githubAuth") {
        const redirectUri = chrome.identity.getRedirectURL();
        const authUrl = `https://github.com/login/oauth/authorize?client_id=Ov23liXayv8qezM2t2z0&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;

        console.log("Starting GitHub OAuth Flow...");
        console.log("OAuth URL:", authUrl);

        chrome.identity.launchWebAuthFlow(
            { url: authUrl, interactive: true },
            async function (redirectedTo) {
                if (chrome.runtime.lastError) {
                    console.error("Authentication Error:", chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }

                if (!redirectedTo) {
                    console.error("No redirect URL received.");
                    sendResponse({ success: false, error: "No redirect URL received" });
                    return;
                }

                console.log("Redirect URL:", redirectedTo);
                const url = new URL(redirectedTo);
                const code = url.searchParams.get("code");

                if (!code) {
                    console.error("No GitHub auth code received.");
                    sendResponse({ success: false, error: "No authorization code received" });
                    return;
                }

                console.log("GitHub Auth Code:", code);

                try {
                    console.log("Sending code to backend for token exchange...");
                    let response = await fetch("https://65f2-2603-8000-ba00-2399-c553-9d1-26d4-5b61.ngrok-free.app/github/oauth", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code })
                    });

                    let data = await response.json();
                    console.log("GitHub Token Exchange Response:", data);

                    if (data.access_token) {
                        chrome.storage.sync.set({ token: data.access_token }, () => {
                            console.log("GitHub token saved successfully!");
                            sendResponse({ success: true });
                        });
                    } else {
                        console.error("Failed to get GitHub token:", data);
                        sendResponse({ success: false, error: "Token exchange failed" });
                    }
                } catch (error) {
                    console.error("Error in token exchange:", error);
                    sendResponse({ success: false, error: error.message });
                }
            }
        );

        return true;
    }
});
