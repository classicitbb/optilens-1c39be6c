// Doc Studio cloud bridge. The studio was built against optilens-local's
// /api/* routes with cookie auth. In the cloud it runs as a same-origin iframe
// inside the admin console, so this shim redirects those calls to the
// docstudio-api edge function and carries the admin's Supabase session token
// (read from the shared localStorage). The studio app itself is untouched.
(function () {
  "use strict";

  function findSession() {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      var m = key && key.match(/^sb-([a-z0-9]+)-auth-token$/);
      if (!m) continue;
      try {
        var raw = JSON.parse(localStorage.getItem(key));
        var session = Array.isArray(raw) ? raw[0] : raw;
        var token = session && (session.access_token || (session.currentSession && session.currentSession.access_token));
        if (token) return { ref: m[1], token: token };
      } catch (e) {
        /* keep scanning */
      }
    }
    return null;
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf("/api/") !== 0) return origFetch(input, init);

    var session = findSession();
    if (!session) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: "Not signed in to the admin console." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    // Strip the local-server prefix: /api/docstudio/files -> /files, while
    // reference-data routes (/api/pl/customers, /api/statement/:id) keep their
    // first segment: /api/statement/123 -> /statement/123.
    var path = url.indexOf("/api/docstudio/") === 0 ? url.slice(14) : url.slice(4);
    var target = "https://" + session.ref + ".supabase.co/functions/v1/docstudio-api" + path;
    var options = Object.assign({}, init);
    var headers = new Headers((init && init.headers) || {});
    headers.set("Authorization", "Bearer " + session.token);
    options.headers = headers;
    options.credentials = "omit";
    return origFetch(target, options);
  };
})();
