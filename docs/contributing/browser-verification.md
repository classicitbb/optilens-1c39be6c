# Browser verification

- For routine build verification, launch the application in the Codex in-app
  browser immediately and use it as the default live-test and annotation
  surface. Prefer quick, direct checks over conservative multi-browser
  confirmation.
- Use an external Chrome or Edge session only when the task specifically
  verifies text entry, clipboard behavior, browser permissions, or a suspected
  in-app-browser limitation. For those tests, use real keyboard input rather
  than clipboard-dependent filling.
- Record visible regressions and annotations from the in-app browser as part of
  the normal build-verification pass when a live app is available.
