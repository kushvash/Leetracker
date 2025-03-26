document.addEventListener("DOMContentLoaded", function() {
    // Check if user is logged in & repo is saved
    chrome.storage.sync.get(["token", "repo"], function(data) {
        if (data.token) {
            // Hide login button, show repo input & logout
            document.getElementById("github-login").style.display = "none";
            document.getElementById("repo-settings").style.display = "block";
            document.getElementById("logout").style.display = "block";

            // Show saved repo name (if any)
            if (data.repo) {
                document.getElementById("repo").value = data.repo;
                document.getElementById("saved-repo-name").innerText = data.repo;
            }
        } else {
            // Show login button, hide other UI elements
            document.getElementById("github-login").style.display = "block";
            document.getElementById("repo-settings").style.display = "none";
            document.getElementById("logout").style.display = "none";
        }
    });
});

// GitHub Login Handler
document.getElementById("github-login").addEventListener("click", function() {
    chrome.runtime.sendMessage({ action: "githubAuth" }, function(response) {
        if (!response) {
            alert("No response received from background script.");
            return;
        }
        if (response.success) {
            alert("GitHub authentication successful!");
            location.reload(); // Reload UI to reflect login state
        } else {
            alert("Authentication failed: " + response.error);
        }
    });
});

// Save Repo Handler
document.getElementById("save-repo").addEventListener("click", function() {
    let repoName = document.getElementById("repo").value.trim();
    if (repoName === "") {
        alert("Repository name cannot be empty!");
        return;
    }
    chrome.storage.sync.set({ repo: repoName }, function() {
        document.getElementById("saved-repo-name").innerText = repoName;
        alert("Repository saved!");
    });
});

// Logout Handler
document.getElementById("logout").addEventListener("click", function() {
    chrome.storage.sync.remove(["token", "repo"], function() {
        alert("Logged out successfully!");
        location.reload(); // Reset UI
    });
});
