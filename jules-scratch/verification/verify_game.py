import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local HTML file
        await page.goto(f"file://{os.getcwd()}/index.html")

        # Wait for the blocker to be visible
        await expect(page.locator("#blocker")).to_be_visible()

        # Add a delay to allow the game to load
        await page.wait_for_timeout(1000)

        # Click the renderer's canvas to start the game
        await page.locator("canvas").click()

        # Wait for the blocker to disappear
        await expect(page.locator("#blocker")).to_be_hidden()

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())