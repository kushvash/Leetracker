const languageExtensions = {
    "C++": "cpp", "Java": "java", "Python": "py", "Python3": "py",
    "C": "c", "C#": "cs", "JavaScript": "js", "TypeScript": "ts",
    "PHP": "php", "Swift": "swift", "Kotlin": "kt", "Dart": "dart",
    "Go": "go", "Ruby": "rb", "Scala": "scala", "Rust": "rs",
    "Racket": "rkt", "Erlang": "erl", "Elixir": "ex"
};

// Prevent multiple executions
if (window.hasRunLeetracker) {
    console.warn("⚠️ Leetracker content script is already running.");
} else {
    window.hasRunLeetracker = true;
    console.log("✅ Leetracker content script loaded successfully!");

    let lastURL = window.location.href;

    // Function to detect URL changes (for submissions)
    function checkSubmission() {
        let currentURL = window.location.href;

        if (lastURL !== currentURL && currentURL.includes("/submissions/")) {
            console.log("📍 Submission detected! Checking status...");

            let submissionStatus = document.querySelector("[data-test-submission-result], div.text-green-s, span.text-success");

            if (!submissionStatus || !submissionStatus.innerText.includes("Accepted")) {
                console.log("❌ Submission not accepted. Exiting...");
                return;
            }

            console.log("✅ Submission Accepted! Extracting details...");

            let problemTitleMatch = currentURL.match(/\/problems\/([^\/]+)\//);
            function capitalizeWords(str) {
                return str.replace(/\b\w/g, char => char.toUpperCase());
            }
            let problemTitle = problemTitleMatch ? capitalizeWords(problemTitleMatch[1].replace(/-/g, ' ')) : "Unknown Problem";

            // Extract Programming Language
            function extractLanguage() {
                let languageElement = document.querySelector("div.flex.items-center.gap-2.text-sm.font-medium.text-text-tertiary");
                if (languageElement) {
                    let detectedLanguage = languageElement.textContent.trim();
                    detectedLanguage = detectedLanguage.replace(/^Code/, '').trim(); // Remove "Code" prefix if present
                    console.log(`🌍 Detected programming language: ${detectedLanguage}`);
                    return detectedLanguage;
                }
                console.warn("⚠️ Could not detect programming language.");
                return "unknown";
            }

            async function fetchSubmittedCode(problemTitle) {
                console.log(`📡 Fetching latest accepted submission for: ${problemTitle}`);

                try {
                    let response = await fetch("https://leetcode.com/api/submissions/", {
                        method: "GET",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" }
                    });

                    let data = await response.json();
                    if (!data.submissions_dump || data.submissions_dump.length === 0) {
                        console.error("❌ No submissions found.");
                        return;
                    }

                    // Get the latest submission
                    let latestSubmission = data.submissions_dump[0];

                    // Extract and map language
                    let detectedLanguage = extractLanguage().trim();
                    let languageKey = Object.keys(languageExtensions).find(key => key.toLowerCase() === detectedLanguage.toLowerCase());
                    const extension = languageKey ? languageExtensions[languageKey] : "txt"; // Ensure correct extension is assigned
                    let language = languageKey || "unknown"; // Ensure language is properly defined
                    let filename = `${problemTitle}.${extension}`;

                    console.log(`📁 Saving file: ${filename} (Language: ${language})`);
                    console.log("📜 Extracted Code:");
                    console.log(latestSubmission.code);

                    console.log("📤 Sending data to background.js for GitHub upload:", {
                        action: "uploadToGitHub",
                        problemTitle,
                        language,
                        filename,
                        code: latestSubmission.code
                    });
                    
                    chrome.runtime.sendMessage({
                        action: "uploadToGitHub",
                        problemTitle,
                        language,
                        filename,
                        code: latestSubmission.code
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("❌ Error sending message to background.js:", chrome.runtime.lastError);
                        } else {
                            console.log("✅ Message sent successfully to background.js! Response:", response);
                        }
                    });

                } catch (error) {
                    console.error("⚠️ Error fetching submitted code:", error);
                }
            }

            // Fetch the latest submission from API
            fetchSubmittedCode(problemTitle);
            lastURL = currentURL;
        }
    }

    // Monitor for URL changes
    setInterval(checkSubmission, 2000);
}