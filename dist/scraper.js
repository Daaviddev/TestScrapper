"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeListings = void 0;
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeListings(url) {
    const browser = await puppeteer_extra_1.default.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url);
    let listings = [];
    let nextPageUrl = url;
    while (nextPageUrl) {
        await page.goto(nextPageUrl);
        // Extract listings from the current page
        const newListings = await extractListingsFromPage(page);
        listings = [...listings, ...newListings];
        // Get the URL for the next page
        nextPageUrl = await getNextPageUrl(page, nextPageUrl);
    }
    await browser.close();
    return listings;
}
exports.scrapeListings = scrapeListings;
/**
 * Extracts listings from the given page.
 *
 * @param page - The Puppeteer page object
 * @returns A promise that resolves to an array of listings
 */
async function extractListingsFromPage(page) {
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('li.EntityList-item')).map((article) => {
            const titleElement = article.querySelector('.entity-title a');
            const priceElement = article.querySelector('.price--hrk');
            return {
                title: titleElement ? titleElement.innerText : null,
                link: titleElement ? titleElement.href : null,
                price: priceElement
                    ? priceElement.innerText.replace(/\s+/g, '')
                    : null,
            };
        });
    });
}
/**
 * Gets the URL for the next page.
 *
 * @param page - The Puppeteer page object
 * @param currentUrl - The current page URL
 * @returns A promise that resolves to the next page URL or null if there is no next page
 */
async function getNextPageUrl(page, currentUrl) {
    const nextPageLink = await page.evaluate(() => {
        const nextPage = document.querySelector('li.Pagination-item--next a');
        return nextPage ? nextPage.href : null;
    });
    return nextPageLink && new URL(nextPageLink, currentUrl).href !== currentUrl
        ? new URL(nextPageLink, currentUrl).href
        : null;
}
