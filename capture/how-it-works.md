# How it works

Deep mode: what the site's JavaScript is made of and what its start page did while we watched.

## Its JavaScript

Analysed 85 script(s) from https://www.notion.com/: 69 module(s), 325 endpoint(s), 11 route(s), bundled with tsc.

Evidence ev_7f6689f4ee60e556468a906077f113a4385e915e2b5191d6b465bca189667838.

```json
{
  "api_operations": [],
  "app_kind": "unknown",
  "bundlers": [
    "tsc"
  ],
  "edges": [
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:CookieScriptLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#e@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:CookieScriptOutsideGeoLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#n@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#Fg@6"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#a@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document.addEventListener(DOMContentLoaded)@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#s@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:click",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#M@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:focusin",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.handleFormFieldFocus@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:mousemove",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#dn@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:mousemove",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#ge@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:mouseout",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#Ot@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:submit",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.handleFormSubmit@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:submit",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#x@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#Fn@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#e:error",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#c@6"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#e:load",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#c@6"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#l:click",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#l.addEventListener(click)@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#n:error",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#a@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#n:load",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#n.onload@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t:error",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#o@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t:error",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t.onerror@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t:load",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t.onload@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#t:loadedmetadata",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#a@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:beforeunload",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#L@7"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:beforeunload",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.navigationHandler@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:blur",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.handleWindowBlur@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:error",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window.addEventListener(error)@7"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:message",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.handlePostMessage@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:message",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window.addEventListener(message)@6"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:pagehide",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#L@7"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:popstate",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window.addEventListener(popstate)@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:resize",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.wakeUpHandler@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:resize",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#un@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:scroll",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#this.wakeUpHandler@1"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:scroll",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#un@4"
    },
    {
      "from": "event:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window:unhandledrejection",
      "kind": "handled-by",
      "to": "fn:app.tailorhq.ai/script/hEJ9QrOcTqmEEU2X2W8Ycw.js#window.addEventListener(unhandledrejection)@7"
    },
    {
      "from": "event:bat.bing.com/p/action/343272399.js#cp:load",
      "kind": "handled-by",
      "to": "fn:bat.bing.com/p/action/343272399.js#cp.onload@80"
    },
    {
      "from": "event:bat.bing.com/p/action/343272399.js#d:UetConsent",
      "kind": "handled-by",
      "to": "fn:bat.bing.com/p/action/343272399.js#d.addEventListener(UetConsent)@33"
    },
    {
      "from": "event:bat.bing.com/p/action/343272399.js#d:UetEvent",
      "kind": "handled-by",
      "to": "fn:bat.bing.com/p/action/343272399.js#d.addEventListener(UetEvent)@29"
    },
    {
      "from": "event:bat.bing.com/p/action/343272399.js#w:message",
      "kind": "handled-by",
      "to": "fn:bat.bing.com/p/action/343272399.js#w.addEventListener(message)@42"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#a:message",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#c@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#document:change",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#Ti@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#document:click",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#Lr@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#document:keydown",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#Rr@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#document:submit",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#Dr@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#io@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#i:message",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#c@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#n:beforeunload",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#n.addEventListener(beforeunload)@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#n:pagehide",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#n.addEventListener(pagehide)@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#n:pageshow",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#n.addEventListener(pageshow)@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#n:storage",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#n.addEventListener(storage)@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#t:message",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#s@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#t:pagehide",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#a@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#t:visibilitychange",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#t.addEventListener(visibilitychange)@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#u:message",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#u.onmessage@1"
    },
    {
      "from": "event:bzrcdn.openai.com/sdk/oaiq.min.js#u:messageerror",
      "kind": "handled-by",
      "to": "fn:bzrcdn.openai.com/sdk/oaiq.min.js#u.onmessageerror@1"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#e:message",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#L@24"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#e:pagehide",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#e.addEventListener(pagehide)@240"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#e:pageshow",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#e.addEventListener(pageshow)@340"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#e:popstate",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#l@24"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#t:visibilitychange",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#t.addEventListener(visibilitychange)@240"
    },
    {
      "from": "event:connect.facebook.net/en_US/fbevents.js#u:load",
      "kind": "handled-by",
      "to": "fn:connect.facebook.net/en_US/fbevents.js#u.onload@422"
    },
    {
      "from": "event:munchkin.marketo.net/165/munchkin.js#d:readystatechange",
      "kind": "handled-by",
      "to": "fn:munchkin.marketo.net/165/munchkin.js#d.onreadystatechange@13"
    },
    {
      "from": "event:munchkin.marketo.net/munchkin.js#a:load",
      "kind": "handled-by",
      "to": "fn:munchkin.marketo.net/munchkin.js#m@7"
    },
    {
      "from": "event:munchkin.marketo.net/munchkin.js#a:readystatechange",
      "kind": "handled-by",
      "to": "fn:munchkin.marketo.net/munchkin.js#a.onreadystatechange@7"
    },
    {
      "from": "event:snap.licdn.com/li.lms-analytics/insight.min.js#o:readystatechange",
      "kind": "handled-by",
      "to": "fn:snap.licdn.com/li.lms-analytics/insight.min.js#o.onreadystatechange@3"
    },
    {
      "from": "event:snap.licdn.com/li.lms-analytics/insight.min.js#u:error",
      "kind": "handled-by",
      "to": "fn:snap.licdn.com/li.lms-analytics/insight.min.js#u.onerror@3"
    },
    {
      "from": "event:snap.licdn.com/li.lms-analytics/insight.min.js#u:load",
      "kind": "handled-by",
      "to": "fn:snap.licdn.com/li.lms-analytics/insight.min.js#u.onload@3"
    },
    {
      "from": "event:ssl.pstatic.net/melona/libs/gfp-nac-module/synchronizer.js#o:error",
      "kind": "handled-by",
      "to": "fn:ssl.pstatic.net/melona/libs/gfp-nac-module/synchronizer.js#o.addEventListener(error)@1"
    },
    {
      "from": "event:ssl.pstatic.net/melona/libs/gfp-nac-module/synchronizer.js#o:load",
      "kind": "handled-by",
      "to": "fn:ssl.pstatic.net/melona/libs/gfp-nac-module/synchronizer.js#o.addEventListener(load)@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#document.addEventListener(DOMContentLoaded)@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:click",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#m@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:securitypolicyviolation",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#m@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#I@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#i@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#s@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#t@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#t:readystatechange",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#t.onreadystatechange@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#window:blur",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#x@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#window:focus",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#M@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#window:pagehide",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#S@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#window:pagehide",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#a@1"
    },
    {
      "from": "event:static.ads-twitter.com/uwt.js#window:pageshow",
      "kind": "handled-by",
      "to": "fn:static.ads-twitter.com/uwt.js#D@1"
    },
    {
      "from": "event:transcend-cdn.com/cm/a36a42ad-3a71-444f-9e8a-b19950129dc6/ui.js#u:load",
      "kind": "handled-by",
      "to": "fn:transcend-cdn.com/cm/a36a42ad-3a71-444f-9e8a-b19950129dc6/ui.js#u.addEventListener(load)@37"
    },
    {
      "from": "event:wcs.naver.net/wcslog.js#t:error",
      "kind": "handled-by",
      "to": "fn:wcs.naver.net/wcslog.js#t.onerror@1"
    },
    {
      "from": "event:wcs.naver.net/wcslog.js#t:load",
      "kind": "handled-by",
      "to": "fn:wcs.naver.net/wcslog.js#t.onload@1"
    },
    {
      "from": "event:wcs.naver.net/wcslog.js#wcs.gvar.nacm:load",
      "kind": "handled-by",
      "to": "fn:wcs.naver.net/wcslog.js#wcs.gvar.nacm.onload@1"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#A:hashchange",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#A.addEventListener(hashchange)@963"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#A:popstate",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#A.addEventListener(popstate)@962"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#A:securitypolicyviolation",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#A.addEventListener(securitypolicyviolation)@846"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#b:updatefound",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#b.addEventListener(updatefound)@706"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#c.m:error",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#c.m.onerror@270"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#c.m:error",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#p@277"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#d.contentWindow:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#d.contentWindow.addEventListener(load)@1004"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#d.contentWindow:message",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#d.contentWindow.addEventListener(message)@1004"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#d:statechange",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#d.addEventListener(statechange)@705"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#e:error",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#e.onerror@333"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#e:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#e.addEventListener(load)@1003"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#e:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#e.onload@333"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#f:error",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#c@268"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#f:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#b@275"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#g:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#b@275"
    },
    {
      "from": "event:www.googletagmanager.com/gtm.js#g:load",
      "kind": "handled-by",
      "to": "fn:www.googletagmanager.com/gtm.js#f@257"
    },
    {
      "from": "event:www.notion.com/_next/static/chunks/01yw_cl2uj8xf.js#document:touchmove",
      "kind": "handled-by",
      "to": "fn:www.n
```

## Ten seconds of it

Watched https://www.notion.com/ for 10000ms: 3 request outline(s), 12 console entr(y/ies).

Evidence ev_ad91c25134f8ae909fb418b820934d2243ab0467161fecf20b4465572219df26.

```json
{
  "accessibility": null,
  "console": {
    "count": 12,
    "entries": [
      {
        "level": "warning",
        "source": "console-api"
      },
      {
        "level": "info",
        "source": "console-api"
      },
      {
        "level": "error",
        "source": "console-api"
      },
      {
        "level": "error",
        "source": "console-api"
      },
      {
        "level": "warning",
        "source": "console-api"
      },
      {
        "level": "error",
        "source": "console-api"
      },
      {
        "level": "error",
        "source": "security"
      },
      {
        "level": "error",
        "source": "javascript"
      },
      {
        "level": "error",
        "source": "security"
      },
      {
        "level": "error",
        "source": "other"
      },
      {
        "level": "error",
        "source": "network"
      },
      {
        "level": "error",
        "source": "console-api"
      }
    ],
    "has_text": false
  },
  "dom": {
    "attribute_names": [
      "alt",
      "aria-activedescendant",
      "aria-autocomplete",
      "aria-controls",
      "aria-current",
      "aria-describedby",
      "aria-expanded",
      "aria-haspopup",
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "aria-live",
      "aria-selected",
      "as",
      "async",
      "autocomplete",
      "charset",
      "class",
      "clip-path",
      "clip-rule",
      "content",
      "crossorigin",
      "d",
      "data-airgap-id",
      "data-analytics-event",
      "data-analytics-href",
      "data-analytics-label",
      "data-analytics-name",
      "data-analytics-scroll-point",
      "data-cancel_on_tap_outside",
      "data-css",
      "data-customer-logo-artwork",
      "data-customer-logo-box",
      "data-endcap",
      "data-gtm-vis-first-on-screen40392510_305",
      "data-gtm-vis-has-fired40392510_305",
      "data-gtm-vis-recent-on-screen40392510_305",
      "data-gtm-vis-total-visible-time40392510_305",
      "data-locale",
      "data-n-css",
      "data-n-g",
      "data-n-p",
      "data-next-font",
      "data-next-head",
      "data-nimg",
      "data-nscript",
      "data-position",
      "data-prompt_parent_id",
      "data-route",
      "data-sample-rate",
      "data-scroll-behavior",
      "data-sdkn",
      "data-sdkv",
      "data-tailor-extension",
      "data-ueto",
      "data-ui-shadow-root",
      "decoding",
      "defer",
      "fetchpriority",
      "fill",
      "fill-rule",
      "height",
      "href",
      "hreflang",
      "id",
      "imagesrcset",
      "itemprop",
      "lang",
      "loading",
      "loop",
      "mask",
      "maskunits",
      "media",
      "muted",
      "name",
      "nomodule",
      "placeholder",
      "playsinline",
      "points",
      "popover",
      "popovertarget",
      "preload",
      "property",
      "rel",
      "role",
      "sizes",
      "src",
      "srcset",
      "style",
      "tabindex",
      "text",
      "type",
      "value",
      "viewbox",
      "width",
      "x",
      "xmlns",
      "y"
    ],
    "elements_by_name": {
      "a": 94,
      "article": 3,
      "blockquote": 4,
      "body": 2,
      "br": 1,
      "button": 6,
      "clippath": 1,
      "defs": 1,
      "div": 124,
      "figcaption": 4,
      "figure": 4,
      "footer": 1,
      "g": 2,
      "h1": 1,
      "h2": 6,
      "h3": 9,
      "head": 2,
      "header": 4,
      "html": 2,
      "iframe": 1,
      "img": 62,
      "input": 1,
      "li": 69,
      "link": 103,
      "main": 1,
      "mask": 1,
      "meta": 21,
      "nav": 2,
      "next-route-announcer": 1,
      "noscript": 2,
      "p": 22,
      "path": 33,
      "picture": 11,
      "polygon": 2,
      "script": 97,
      "section": 3,
      "source": 8,
      "span": 195,
      "style": 2,
      "svg": 27,
      "title": 1,
      "ul": 9,
      "video": 1
    },
    "text_nodes": 177,
    "total_nodes": 1126,
    "truncated": false
  },
  "dropped_events": 0,
  "frame_origins": [
    "about:blank",
    "https://www.notion.com"
  ],
  "network": {
    "request_count": 3,
    "requests": [
      {
        "initiator": "script",
        "method": "POST",
        "mime_type": "text/plain",
        "response_headers": {
          "credentials_present": [],
          "kept": {
            "access-control-allow-credentials": {
              "value_length": 4
            },
            "access-control-allow-origin": {
              "value_length": 22
            },
            "alt-svc": {
              "value_length": 46
            },
            "cache-control": "no-cache, no-store, must-revalidate",
            "content-length": "0",
            "content-security-policy-report-only": "script-src 'none'; form-action 'none'; frame-src 'none'; report-uri https://csp.withgoogle.com/csp/scaffolding/ascnsrsggc:201:0",
            "content-type": "text/plain",
            "cross-origin-opener-policy-report-only": {
              "value_length": 39
            },
            "cross-origin-resource-policy": "cross-origin",
            "date": {
              "value_length": 29
            },
            "expires": {
              "value_length": 29
            },
            "pragma": {
              "value_length": 8
            },
            "report-to": {
              "value_length": 141
            },
            "server": {
              "value_length": 6
            }
          }
        },
        "status": 204,
        "type": "Fetch",
        "url": "https://analytics.google.com/g/collect?v=2&tid=G-9ZJ8CB186L&gtm=45je6ba1v876131458za20ozb840392510zd840392510xf1&_p=1794444256094&gcs=G111&gcd=13t3t3t3t5l1&npa=0&dma=0&tcfd=10000&_eu=AAAAAGQC&cid=571339941.1794444231&frm=0&pscdl=noapi&rcb=4&sr=800x600&uaa=x86&uab=64&uafvl=Not-A.Brand%3B99.0.0.0%7CGoogle%2520Chrome%3B157.0.8103.51%7CChromium%3B157.0.8103.51&uam=&uamb=0&uap=Windows&uapv=19.0.0&uaw=0&ul=en-us&gaf=2&_s=2&tag_exp=115616986~115938465~115938468~118897920~118897930~120213116~120385423~120412528~120420414~120469145~120469153~121246026~121246034~123329125~124170883&sid=1794444231&sct=1&seg=1&dl=https%3A%2F%2Fwww.notion.com%2F&dt=The%20AI%20workspace%20that%20works%20for%20you.%20%7C%20Notion&en=page_view&tfd=6317"
      },
      {
        "initiator": "other",
        "method": "GET",
        "mime_type": "image/gif",
        "response_headers": {
          "credentials_present": [],
          "kept": {
            "cache-control": "no-cache, no-store, max-age=0",
            "cf-cache-status": {
              "value_length": 7
            },
            "cf-ray": {
              "value_length": 20
            },
            "content-length": "43",
            "content-type": "image/gif;charset=utf-8",
            "date": {
              "value_length": 29
            },
            "origin-cf-ray": {
              "value_length": 20
            },
            "perf": {
              "value_length": 10
            },
            "server": {
              "value_length": 16
            },
            "strict-transport-security": "max-age=631138519; includeSubdomains",
            "x-response-time": {
              "value_length": 1
            },
            "x-served-by": {
              "value_length": 4
            },
            "x-transaction-id": {
              "value_length": 16
            }
          }
        },
        "status": 200,
        "type": "Image",
        "url": "https://t.co/i/adsct?bci=4&cv=96%261&dv=America%2FBarbados%26en-US%2Cen%26Google%20Inc.%26Win32%26255%26800%26600%2624%2624%26800%26600%260%26na%261&eci=2&event_id=56a94373-4d9e-4eaa-88b9-3df7dbc55341&events=%5B%5B%22auto_long_site_dwell%22%2C%7B%7D%5D%5D&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=58d5b328-e321-47b7-8eb4-2b7c5fc62214&tw_ch_fvl=Not-A.Brand%2F99.0.0.0%2CGoogle%20Chrome%2F157.0.8103.51%2CChromium%2F157.0.8103.51&tw_ch_pv=19.0.0&tw_document_href=https%3A%2F%2Fwww.notion.com%2F&tw_engaged_ms=0&tw_iframe_status=0&tw_pid_src=1&tw_session_count=1&tw_session_id=1794444256350-440335588&twpid=tw.1794444256350.526050895351346672&txn_id=ofilm&type=javascript&version=2.4.12"
      },
      {
        "initiator": "other",
        "method": "GET",
        "mime_type": "image/gif",
        "response_headers": {
          "credentials_present": [],
          "kept": {
            "cache-control": "no-cache, no-store, max-age=0",
            "cf-cache-status": {
              "value_length": 7
            },
            "cf-ray": {
              "value_length": 20
            },
            "content-length": "43",
            "content-type": "image/gif;charset=utf-8",
            "date": {
              "value_length": 29
            },
            "origin-cf-ray": {
              "value_length": 20
            },
            "perf": {
              "value_length": 10
            },
            "server": {
              "value_length": 16
            },
            "strict-transport-security": "max-age=631138519; includeSubdomains",
            "x-response-time": {
              "value_length": 1
            },
            "x-served-by": {
              "value_length": 4
            },
            "x-transaction-id": {
              "value_length": 16
            }
          }
        },
        "status": 200,
        "type": "Image",
        "url": "https://analytics.twitter.com/i/adsct?bci=4&cv=96%261&dv=America%2FBarbados%26en-US%2Cen%26Google%20Inc.%26Win32%26255%26800%26600%2624%2624%26800%26600%260%26na%261&eci=2&event_id=56a94373-4d9e-4eaa-88b9-3df7dbc55341&events=%5B%5B%22auto_long_site_dwell%22%2C%7B%7D%5D%5D&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=58d5b328-e321-47b7-8eb4-2b7c5fc62214&tw_ch_fvl=Not-A.Brand%2F99.0.0.0%2CGoogle%20Chrome%2F157.0.8103.51%2CChromium%2F157.0.8103.51&tw_ch_pv=19.0.0&tw_document_href=https%3A%2F%2Fwww.notion.com%2F&tw_engaged_ms=0&tw_iframe_status=0&tw_pid_src=1&tw_session_count=1&tw_session_id=1794444256350-440335588&twpid=tw.1794444256350.526050895351346672&txn_id=ofilm&type=javascript&version=2.4.12"
      }
    ]
  },
  "origin": "https://www.notion.com/",
  "resources": [
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/163cb6mq2rawn.js"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://analytics.twitter.com/1/i/adsct?bci=4&dv=America%2FBarbados%26en-US%2Cen%26Google%20Inc.%26Win32%26255%26800%26600%2624%2624%26800%26600%260%26na%261&eci=3&event=%7B%7D&event_id=cdea028a-27be-4208-95ab-837b166618d0&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=58d5b328-e321-47b7-8eb4-2b7c5fc62214&tw_ch_fvl=Not-A.Brand%2F99.0.0.0%2CGoogle%20Chrome%2F157.0.8103.51%2CChromium%2F157.0.8103.51&tw_ch_pv=19.0.0&tw_document_href=https%3A%2F%2Fwww.notion.com%2F&tw_engaged_ms=0&tw_iframe_status=0&tw_pid_src=1&tw_session_count=1&tw_session_id=1794444256350-440335588&tw_session_start=1&twpid=tw.1794444256350.526050895351346672&txn_id=ofilm&type=javascript&version=2.4.12"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    },
    {
      "mime_type": "image/webp",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/5bqhI7eaPc7AeAtuuTvtuh/915d56f683fcd7edbd9f1e0434136b0d/pin_capture.png?w=1080&q=55&fm=webp"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/23lo74sdqhaih.js"
    },
    {
      "mime_type": "image/svg+xml",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/75O9653Z83boVzSMBMSY2D/4b36e928296e00612213aff4bdd369f2/toyota-black.svg"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/0h__50ie2ksx9.js"
    },
    {
      "mime_type": "image/svg+xml",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/5PYK3Lg8UW2Pk5pjMSo0oo/386446de76c143e694ec9790807eff7e/david-zwirner-mono.svg"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://trkn.us/pixel/c?ppt=25579&g=sitewide&gid=65016&ord=737b80e3b8144a6bb95d2d3b2a8f2def"
    },
    {
      "mime_type": "image/webp",
      "type": "Image",
      "url": "https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_5.webp&w=256&q=75"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/14p4-gbfz_p4d.js"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/2yfm5cv595lyl.js"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://analytics.twitter.com/i/adsct?bci=4&cv=96%261&dv=America%2FBarbados%26en-US%2Cen%26Google%20Inc.%26Win32%26255%26800%26600%2624%2624%26800%26600%260%26na%261&eci=2&event_id=56a94373-4d9e-4eaa-88b9-3df7dbc55341&events=%5B%5B%22auto_long_site_dwell%22%2C%7B%7D%5D%5D&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=58d5b328-e321-47b7-8eb4-2b7c5fc62214&tw_ch_fvl=Not-A.Brand%2F99.0.0.0%2CGoogle%20Chrome%2F157.0.8103.51%2CChromium%2F157.0.8103.51&tw_ch_pv=19.0.0&tw_document_href=https%3A%2F%2Fwww.notion.com%2F&tw_engaged_ms=0&tw_iframe_status=0&tw_pid_src=1&tw_session_count=1&tw_session_id=1794444256350-440335588&twpid=tw.1794444256350.526050895351346672&txn_id=ofilm&type=javascript&version=2.4.12"
    },
    {
      "mime_type": "image/webp",
      "type": "Image",
      "url": "https://www.notion.com/_next/image?url=%2Ffront-static%2Fnav%2FallFeaturesNav%2Ffind.png&w=256&q=75"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/1u2fhpzx-y34k.js"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://www.google.com/pagead/1p-user-list/18388395671/?random=1794444256306&cv=11&fst=1794441600000&bg=ffffff&guid=ON&async=1&en=gtag.config&gtm=45je6ba1v876131458za20ozb840392510zd840392510xecxf1&gcd=13t3t3t3t5l1&dma=0&tcfd=10000&tag_exp=115616986~115938465~115938468~118897920~118897930~119317811~120213116~120385423~120412528~120420414~120469145~120469153~121191153~121246026~121246034~123329125~124170883&u_w=800&u_h=600&url=https%3A%2F%2Fwww.notion.com%2F&rcb=4&frm=0&tiba=The%20AI%20workspace%20that%20works%20for%20you.%20%7C%20Notion&hn=www.googleadservices.com&npa=0&pscdl=noapi&auid=692884268.1794444231&uaa=x86&uab=64&uafvl=Not-A.Brand%3B99.0.0.0%7CGoogle%2520Chrome%3B157.0.8103.51%7CChromium%3B157.0.8103.51&uamb=0&uam=&uap=Windows&uapv=19.0.0&uaw=0&data=event%3Dgtag.config&ept=9&rfmt=3&fmt=3&is_vtc=1&cid=CAQS4gEAogo4daGxvU99bXD6Nj3vp1awh-28KEd9eAH2pTAJW3zw8b2peM4FvZ9Ba1T77V7w9uf_yEv7J6zeRpXmWuc-GZnxnOdKGaEF7Um9A_QrGKYL3BEYEZ0O7Ece_kJSSuw6Z1mk3djQ7cduzPu1TrKBszot7qsDPDuTHbHV7vWec_H47QC3fRP-E1psLqOafrCnKu5NjEeeM_16g6t1d6WB48i9bT2ELFd4tTl8AbWhPE4zJMNJzBv1nnXa1aPMzBTwf9dn6kHybjiC9AAKpbRhiuOZ-IlOOD9-cvYaIFTwg-24&random=4275324834&rmt_tld=0&ipr=y"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://www.google.com/pagead/1p-user-list/18009663456/?random=1794444256197&cv=11&fst=1794441600000&bg=ffffff&guid=ON&async=1&en=gtag.config&gtm=45be6ba1v9242956174za20ozb840392510zd840392510xecxf1&gcd=13t3t3t3t5l1&dma=0&tcfd=10000&tag_exp=115616985~115938465~115938469~118897920~118897930~119317811~120213116~120385423~120412528~120420414~120469145~120469153~121191153~121246026~121246034~123329125~124170881&u_w=800&u_h=600&url=https%3A%2F%2Fwww.notion.com%2F&rcb=13&frm=0&tiba=The%20AI%20workspace%20that%20works%20for%20you.%20%7C%20Notion&hn=www.googleadservices.com&npa=0&pscdl=noapi&auid=692884268.1794444231&uaa=x86&uab=64&uafvl=Not-A.Brand%3B99.0.0.0%7CGoogle%2520Chrome%3B157.0.8103.51%7CChromium%3B157.0.8103.51&uamb=0&uam=&uap=Windows&uapv=19.0.0&uaw=0&data=event%3Dgtag.config&ept=9&rfmt=3&fmt=3&is_vtc=1&cid=CAQS4gEAogo4dUIFs9kuf7clku_dhecaGN2zf02iMLRuFO-D5qWpq1fvBRFbWE_2i-ASFKLtFZ83wI15HssDmJSXdrR7UAdKw-2BZWliW1E1hWc25ppcKGenoqY2XHYJMTV7WsvtloIFBz6HBurgpqmGiHHFTkI8Y1W2rnfXBvV70l-kURBIVCA7Tt7OahRXbfqbwrA0a0IlaB71AzwdFFjFdRTIWma7VD8V0yHFmookJPfFHzNi8l5LIDzVoooGAJRa6QsxrFFKbEwOKS4bCefLGORu8Nq-Zd1JTEdGsgW8YCtjQfdc&random=1454045192&rmt_tld=0&ipr=y"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://www.notion.com/front-static/fonts/NotionInter-Bold.woff2"
    },
    {
      "mime_type": "image/gif",
      "type": "Image",
      "url": "https://www.google.com/pagead/1p-user-list/695511889/?random=1794444256188&cv=11&fst=1794441600000&bg=ffffff&guid=ON&async=1&en=gtag.config&gtm=45be6ba1v9242956174za20ozb840392510zd840392510xecxf1&gcd=13t3t3t3t5l1&dma=0&tcfd=10000&tag_exp=115616985~115938465~115938469~118897920~118897930~119317811~120213116~120385423~120412528~120420414~120469145~120469153~121191153~121246026~121246034~123329125~124170881&u_w=800&u_h=600&url=https%3A%2F%2Fwww.notion.com%2F&rcb=13&frm=0&tiba=The%20AI%20workspace%20that%20works%20for%20you.%20%7C%20Notion&hn=www.googleadservices.com&npa=0&pscdl=noapi&auid=692884268.1794444231&uaa=x86&uab=64&uafvl=Not-A.Brand%3B99.0.0.0%7CGoogle%2520Chrome%3B157.0.8103.51%7CChromium%3B157.0.8103.51&uamb=0&uam=&uap=Windows&uapv=19.0.0&uaw=0&data=event%3Dgtag.config&ept=9&rfmt=3&fmt=3&is_vtc=1&cid=CAQS4gEAogo4dZVWSx9aJ29XlsdNxFZqUYINXlXVBACtPRkdzkyuyMTfvlNObds30mrR_Okn81S9m9u_lm67H7_mtAIwLKBRcgfmDuB_chOKR6z9WQ0QauHwo86-S9mKmoZayk7QaMz6hHwq2kqqgNjSfXwoS65f0DXFeebudl-oJqLZ6K195CAvaZ9Uq0IDzXKAR7_I2agoD-UhLvld7dalH_aRG11VsbWXYeymV58W6aIWBcMPIxWzWo9M7ZYFp_JoHO_yc1q5HGzt-ckPy6gIqZ0xQ96hCgRlEK7nJ7DmosRaGzP7&random=1578559836&rmt_tld=0&ipr=y"
    },
    {
      "mime_type": "image/svg+xml",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/2lvHXS3UJ5sJscJTW8GTpc/c22ac415979069ab3be881b2749e0d77/Faire_logo_-_black.svg"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://www.notion.com/_next/static/media/LyonText-Regular-Web.0v5-4d-mnyixl.woff2"
    },
    {
      "mime_type": "image/webp",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/74S6scH4Wyb7HIj8vAQwcT/37fb4a6eaa694d43a684592c48f252da/automate_front_mobile.jpg?w=384&q=55&fm=webp"
    },
    {
      "mime_type": "image/svg+xml",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/kelAN094ZCNSM1hzESs2C/71fdfc39756f757c95f984aa78fc1e82/1Password.svg"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://www.notion.com/front-static/fonts/NotionInter-SemiBold.woff2"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/9f2239a6c9d84688f968be4f94daf0c44d17d630/_clientMiddlewareManifest.js"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/1m9ndph5lsf3u.js"
    },
    {
      "mime_type": "application/javascript",
      "type": "Image",
      "url": "https://px.ads.linkedin.com/collect?v=2&fmt=js&pid=2368700&time=1794444256237&li_adsId=a09aafac-e145-429b-beaf-d5be8066eda7&pageLoadId=b1105139-43a8-45cb-8794-75f51535b553&url=https%3A%2F%2Fwww.notion.com%2F"
    },
    {
      "mime_type": "image/svg+xml",
      "type": "Image",
      "url": "https://images.ctfassets.net/spoqsaf9291f/6ZbZcPA6g5hFrPMbOPfraR/ef4bc2c92ed55a60c9609900717d3755/substack-wordmark-mono.svg"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/1phy5t3fgvrhx.js"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://www.notion.com/_next/static/chunks/3g3kd85z47r78
```
