const languageExtensions = {
    "C++": "cpp", "Java": "java", "Python": "py", "Python3": "py",
    "C": "c", "C#": "cs", "JavaScript": "js", "TypeScript": "ts",
    "PHP": "php", "Swift": "swift", "Kotlin": "kt", "Dart": "dart",
    "Go": "go", "Ruby": "rb", "Scala": "scala", "Rust": "rs",
    "Racket": "rkt", "Erlang": "erl", "Elixir": "ex"
};

// Prevent multiple executions
if (window.hasRunLeetracker) {
    console.warn("Leetracker content script is already running.");
} else {
    window.hasRunLeetracker = true;
    console.log("Leetracker content script loaded successfully!");

    // Function to observe submission results after clicking the Submit button
    function observeSubmissionResult() {
        console.log("Waiting for submission result...");

        let checkInterval = setInterval(() => {
            let submissionStatus = document.querySelector("[data-test-submission-result], div.text-green-s, span.text-success");

            if (submissionStatus && submissionStatus.innerText.includes("Accepted")) {
                console.log("Submission Accepted! Extracting details...");
                clearInterval(checkInterval);

                let problemTitleMatch = window.location.href.match(/\/problems\/([^\/]+)\//);
                function capitalizeWords(str) {
                    return str.replace(/\b\w/g, char => char.toUpperCase());
                }
                let problemTitle = problemTitleMatch ? capitalizeWords(problemTitleMatch[1].replace(/-/g, ' ')) : "Unknown Problem";

                // Extract Programming Language
                function extractLanguage() {
                    let languageElement = document.querySelector("div.flex.items-center.gap-2.text-sm.font-medium.text-text-tertiary");
                    if (languageElement) {
                        let detectedLanguage = languageElement.textContent.trim();
                        detectedLanguage = detectedLanguage.replace(/^Code/, '').trim();
                        console.log(`Detected programming language: ${detectedLanguage}`);
                        return detectedLanguage;
                    }
                    console.warn("Could not detect programming language.");
                    return "unknown";
                }

                async function fetchSubmittedCode(problemTitle) {
                    console.log(`Fetching latest accepted submission for: ${problemTitle}`);

                    try {
                        let response = await fetch("https://leetcode.com/api/submissions/", {
                            method: "GET",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" }
                        });

                        let data = await response.json();
                        if (!data.submissions_dump || data.submissions_dump.length === 0) {
                            console.error("No submissions found.");
                            return;
                        }

                        let latestSubmission = data.submissions_dump[0];

                        let detectedLanguage = extractLanguage().trim();
                        let languageKey = Object.keys(languageExtensions).find(key => key.toLowerCase() === detectedLanguage.toLowerCase());
                        const extension = languageKey ? languageExtensions[languageKey] : "txt";
                        let language = languageKey || "unknown";
                        let filename = `${problemTitle}.${extension}`;

                        console.log(`Saving file: ${filename} (Language: ${language})`);
                        console.log("Extracted Code:");
                        console.log(latestSubmission.code);

                        console.log("Sending data to background.js for GitHub upload:", {
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
                                console.error("Error sending message to background.js:", chrome.runtime.lastError);
                            } else {
                                console.log("Message sent successfully to background.js! Response:", response);
                            }
                        });

                    } catch (error) {
                        console.error("Error fetching submitted code:", error);
                    }
                }

                fetchSubmittedCode(problemTitle);
            }
        }, 2000);
    }

    // Attach event listener to the "Submit" button
    function attachSubmitListener() {
        const submitButton = document.querySelector('button[data-e2e-locator="console-submit-button"]');

        if (submitButton) {
            console.log("Submit button found! Attaching event listener...");
            submitButton.addEventListener("click", observeSubmissionResult);
        } else {
            console.warn("Submit button not found, retrying...");
            setTimeout(attachSubmitListener, 2000);
        }
    }

    // Remove existing URL monitoring and use event-based submission tracking
    attachSubmitListener();
}
