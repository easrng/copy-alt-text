browser.contextMenus.create({
    id: "copy-alt-text-to-clipboard",
    title: "Copy Alt Text",
    contexts: ["image"],
});
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "copy-alt-text-to-clipboard") {
        browser.tabs.executeScript(tab.id, { code:`[...document.querySelectorAll("img")].find(e=>e.src==${JSON.stringify(info.srcUrl)}).alt`})
        .then(text => {
        const code = "copyToClipboard(" + JSON.stringify(text) + ");";
        return browser.tabs.executeScript({
            code: "typeof copyToClipboard === 'function';",
        }).then((results) => {
            // The content script's last expression will be true if the function
            // has been defined. If this is not the case, then we need to run
            // clipboard-helper.js to define function copyToClipboard.
            if (!results || results[0] !== true) {
                return browser.tabs.executeScript(tab.id, {
                    file: "clipboard-helper.js",
                });
            }
        }).then(() => {
            return browser.tabs.executeScript(tab.id, {
                code,
            });
        })
        }).catch((error) => {
            // This could happen if the extension is not allowed to run code in
            // the page, for example if the tab is a privileged page.
            console.error("Failed to copy text: " + error);
        });
    }
});