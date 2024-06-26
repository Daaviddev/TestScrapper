import { Browser, Page } from 'puppeteer-extra-plugin/dist/puppeteer';
import {
  CarDetails,
  Listing,
  ListingDetails,
  scrapeListingDetails,
} from './scrapeDetails';

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from './utils/logger';
import puppeteer from 'puppeteer-extra';
import { saveListingsToDb } from './utils/saveToDb';

puppeteer.use(StealthPlugin());

export async function scrapeListings(
  url: string,
  companyId: string
): Promise<void> {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();
  try {
    await page.goto(url);

    let listings: Listing[] = [];
    let nextPageUrl: string | null = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl);

      const newListings = await extractListingsFromPage(page, browser);
      listings = [...listings, ...newListings];

      nextPageUrl = await getNextPageUrl(page, nextPageUrl);
    }

    await saveListingsToDb(listings, companyId);
  } catch (error) {
    logger.error(`Error scraping listings from ${url}: ${error}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function extractListingsFromPage(
  page: Page,
  browser: Browser
): Promise<Listing[]> {
  const listings: Listing[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('li.EntityList-item')).map(
      (article) => {
        const titleElement = article.querySelector(
          '.entity-title a'
        ) as HTMLAnchorElement;
        const priceElement = article.querySelector(
          '.price--hrk'
        ) as HTMLElement;

        return {
          title: titleElement ? titleElement.innerText : null,
          link: titleElement ? titleElement.href : null,
          price: priceElement
            ? priceElement.innerText.replace(/\s+/g, '')
            : null,
        };
      }
    );
  });

  await Promise.all(
    listings.map(async (listing) => {
      logger.info(`Oglas: ${listing.title}`);

      if (listing.link) {
        try {
          const { details, car } = await scrapeListingDetails(
            browser,
            listing.link
          );
          listing.details = details;
          listing.car = car;
        } catch (error) {
          logger.error(
            `Error scraping listing details for ${listing.link}: ${error}`
          );
        }
      }
    })
  );

  return listings.filter((listing) => listing.link !== null); // Filter out listings with null links
}

async function getNextPageUrl(
  page: Page,
  currentUrl: string
): Promise<string | null> {
  const nextPageLink = await page.evaluate(() => {
    const nextPage = document.querySelector(
      'li.Pagination-item--next a'
    ) as HTMLAnchorElement;
    return nextPage ? nextPage.href : null;
  });

  return nextPageLink && new URL(nextPageLink, currentUrl).href !== currentUrl
    ? new URL(nextPageLink, currentUrl).href
    : null;
}
