browser.contextMenus.create({
  id: "copy-alt-text-to-clipboard",
  title: "Copy Alt Text",
  contexts: ["image"],
});
const notify = (title, message) =>
  browser.notifications.create({
    type: "basic",
    iconUrl: browser.extension.getURL("icons/96.png"),
    title,
    message,
  });
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-alt-text-to-clipboard") {
    browser.tabs
      .executeScript(tab.id, {
        code: '[...document.querySelectorAll("img")].map(({src,alt,srcset}) => ({src,alt,srcset}))',
      })
      .then((images) => {
        const image = images[0].find((e) =>
          [
            e.src,
            ...parseSrcset(e.srcset).map((e) => new URL(e.url, tab.url).href),
          ].includes(info.srcUrl),
        );
        if (!image) {
          throw new Error("failed to find image in page");
        }
        const text = image.alt;
        if (!text) {
          notify("Nothing to copy.", "That image doesn’t have alt text.");
          return;
        }
        return browser.tabs
          .executeScript({
            code: "typeof copyToClipboard === 'function'",
          })
          .then((results) => {
            // The content script's last expression will be true if the function
            // has been defined. If this is not the case, then we need to run
            // clipboard-helper.js to define function copyToClipboard.
            if (!results || results[0] !== true) {
              return browser.tabs.executeScript(tab.id, {
                file: "clipboard-helper.js",
              });
            }
          })
          .then(() => {
            return browser.tabs.executeScript(tab.id, {
              code: `copyToClipboard(${JSON.stringify(text)})`,
            });
          })
          .then(() => {
            notify("Alt text copied!", `Copied “${text}” to the clipboard.`);
          });
      })
      .catch((error) => {
        if (tab.url.startsWith("about:")) {
          notify(
            "Failed to copy.",
            "This page is built in to Firefox and can’t be accessed by extensions.",
          );
        } else {
          notify(
            "Failed to copy.",
            "Please report this (with a link to the page you’re on) at https://github.com/easrng/copy-alt-text/issues.",
          );
          console.error(error);
        }
      });
  }
});
