const ext = typeof browser !== "undefined" ? browser : chrome;
ext.storage.local.get("enabled").then(data => {
  if (data.enabled === false) {
    return;
  }

  // 👇 YOUR EXISTING CODE GOES INSIDE HERE
  (function () {
    let detected = false;

    function detectLogin() {
      if (detected) return;

      const pwd = document.querySelector('input[type="password"]');
      if (!pwd) return;

      detected = true;
      console.log("[content.js] password field detected");

      try {
        const port = ext.runtime.connect({ name: "scan-port" });
        port.postMessage({
          type: "SCAN_URL",
          url: location.href
        });
      } catch (e) {
        console.error("[content.js] connect failed:", e);
      }
    }

    // 🔥 IMPORTANT: run immediately
    detectLogin();

    // 🔁 Watch for SPA pages
    const observer = new MutationObserver(detectLogin);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  })();
});