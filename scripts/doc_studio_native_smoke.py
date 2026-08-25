#!/usr/bin/env python3
"""Browser smoke test for the native Doc Studio admin mount.

Run with an authenticated preview session injected by Lovable:
    npm run qa:doc-studio-smoke
"""

import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright


BASE_URL = os.environ.get("DOC_STUDIO_SMOKE_URL", "http://localhost:8080")
TABS = ["My Files", "Email", "Letterhead", "Signature", "Social", "Billing", "Ship Label", "Statement"]


async def restore_session(context, page):
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for cookie in cookies:
            cookie["url"] = BASE_URL
        await context.add_cookies(cookies)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    if storage_key and session_json:
        await page.evaluate(
            "([key, session]) => localStorage.setItem(key, session)",
            [storage_key, session_json],
        )


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        console_errors = []
        def capture_console(message):
            if message.type != "error":
                return
            location = message.location.get("url", "") if message.location else ""
            console_errors.append(f"{message.text} | {location}")

        page.on("console", capture_console)
        page.on("pageerror", lambda error: console_errors.append(str(error)))

        await restore_session(context, page)
        await page.goto(f"{BASE_URL}/admin/docs/studio", wait_until="domcontentloaded")
        await page.locator(".ds-native-host #dc-root").wait_for(state="visible", timeout=30_000)

        for tab in TABS:
            button = page.locator("#embedded-tabbar").get_by_role("button", name=tab, exact=True)
            await button.evaluate("element => element.click()")
            await page.wait_for_timeout(150)
            expected_state = {
                "My Files": "files", "Email": "email", "Letterhead": "letter",
                "Signature": "signature", "Social": "social", "Billing": "billing",
                "Ship Label": "shiplabel", "Statement": "statement",
            }[tab]
            active_state = await page.evaluate("window._dsApp && window._dsApp.state.tab")
            if active_state != expected_state:
                raise AssertionError(f"{tab} did not become active (state={active_state})")
            title = await page.locator(".ds-native-host").get_by_text("preview", exact=False).count()
            if tab != "My Files" and title == 0:
                raise AssertionError(f"{tab} did not render a live preview")

        images = page.locator(".ds-native-host img")
        for index in range(await images.count()):
            image = images.nth(index)
            if await image.is_visible() and await image.evaluate("img => !img.complete || img.naturalWidth === 0"):
                raise AssertionError(f"Doc Studio image failed to load: {await image.get_attribute('src')}")

        await page.reload(wait_until="domcontentloaded")
        await page.locator(".ds-native-host #dc-root").wait_for(state="visible", timeout=30_000)

        actionable_errors = [
            error for error in console_errors
            if "vercel.live/_next-live/feedback" not in error
            and "lead_campaign_activation_profiles" not in error
        ]
        if actionable_errors:
            raise AssertionError("Console errors:\n" + "\n".join(actionable_errors))

        output = Path("/tmp/browser/doc-studio-smoke")
        output.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(output / "native-doc-studio.png"))
        await browser.close()
        print("Doc Studio native smoke passed: editor, tabs, previews, images, and refresh")


asyncio.run(main())