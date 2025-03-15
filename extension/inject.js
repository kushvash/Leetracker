(function() {
    setTimeout(() => {
        let editor = document.querySelector(".monaco-editor");
        let problemTitle = document.querySelector("div.text-label-1")?.innerText.trim();
        let problemNumber = document.querySelector("div.text-label-2")?.innerText.split(".")[0].trim();
        let language = document.querySelector(".ant-select-selection-item")?.innerText.toLowerCase();

        if (!editor || !problemTitle || !problemNumber) return;

        // Extract code from LeetCode's editor
        let code = editor.__vue__.getValue();

        // Send code data to content script
        window.postMessage({
            action: "codeExtracted",
            code,
            problemTitle,
            problemNumber,
            language
        }, "*");
    }, 3000);
})();