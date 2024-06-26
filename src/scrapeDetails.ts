import { Browser, Page } from 'puppeteer-extra-plugin/dist/puppeteer';
import { CarDetailsSchema, ListingDetailsSchema } from './utils/schemas';

import { SELECTORS } from './utils/selectors';
import logger from './utils/logger';
import { retry } from './utils/retry';

export interface ListingDetails {
  mileage: number | null;
  addDate: Date | null;
  imageUrl: string | null;
  listingIdNumber: number | null;
}

export interface CarDetails {
  year: number;
  fuel: string;
  gear: string;
  engine: number;
  power: number;
  make: string;
  model: string;
  tip: string;
  modelYear?: number;
}

export interface Listing {
  title: string | null;
  link: string | null;
  price: string | null;
  oldPrice?: number | null;
  priceChangedAt?: Date;
  isSold?: boolean;
  isSoldChangedAt?: Date;
  isPromoted?: boolean;
  excludeFromData?: boolean;
  details?: ListingDetails;
  car?: CarDetails;
}

export async function scrapeListingDetails(
  browser: Browser,
  url: string
): Promise<{ details: ListingDetails; car: CarDetails }> {
  const page: Page = await browser.newPage();
  try {
    logger.info(`Scraping details for: ${url}`);
    await retry(() =>
      page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    );
    await page.waitForSelector(SELECTORS.image, { visible: true });

    const details = await parseListingDetails(page);
    const date = await parseDate(page);
    details.addDate = date;
    logger.info(`Listing details: ${JSON.stringify(details)}`);
    logger.info(`Date: ${date}`);
    const car = await parseCarDetails(page);
    logger.info(`Car details: ${JSON.stringify(car)}`);

    // Validate the scraped data
    ListingDetailsSchema.parse(details);
    CarDetailsSchema.parse(car);

    return { details, car };
  } catch (error) {
    logger.error(`Error scraping details for ${url}: ${error}`);
    throw error;
  } finally {
    await page.close();
  }
}

async function parseCarDetails(page: Page): Promise<CarDetails> {
  const carDetails = await page.evaluate((SELECTORS) => {
    const details: { [key: string]: string } = {};
    document.querySelectorAll(SELECTORS.carDetails).forEach((dt) => {
      const term = dt.textContent?.trim();
      const definition = dt.nextElementSibling?.textContent?.trim();
      if (term && definition) {
        details[term] = definition;
      }
    });
    return details;
  }, SELECTORS);

  const parseNumber = (value: string | undefined): number | null => {
    const parsed = value ? parseFloat(value.replace(/\D/g, '')) : NaN;
    return isNaN(parsed) ? null : parsed;
  };

  return {
    year: parseNumber(carDetails['Godina proizvodnje']) || 0,
    fuel: carDetails['Motor'] || '',
    gear: carDetails['Mjenjač'] || '',
    engine: parseNumber(carDetails['Radni obujam']) || 0,
    power: parseNumber(carDetails['Snaga motora']) || 0,
    make: carDetails['Marka automobila'] || '',
    model: carDetails['Model automobila'] || '',
    tip: carDetails['Tip automobila'] || '',
    modelYear: parseNumber(carDetails['Godina modela']) || 0,
  };
}

async function parseListingDetails(page: Page): Promise<ListingDetails> {
  const listingDetails = await page.evaluate((SELECTORS) => {
    const details: { [key: string]: string } = {};
    document.querySelectorAll(SELECTORS.listingDetails).forEach((dt) => {
      const term = dt.textContent?.trim();
      const definition = dt.nextElementSibling?.textContent?.trim();
      if (term && definition) {
        details[term] = definition;
      }
    });

    const listingIdText =
      document.querySelector(SELECTORS.listingId)?.textContent?.trim() || '';
    const listingIdNumber = parseInt(listingIdText.replace(/\D/g, ''));

    const imageUrl = (
      document.querySelector(
        'div.ClassifiedDetailGallery-slide img.ClassifiedDetailGallery-slideImage'
      ) as HTMLImageElement
    )?.src;

    const mileage = details['Prijeđeni kilometri']
      ? parseFloat(details['Prijeđeni kilometri'].replace(/\D/g, ''))
      : null;

    return {
      listingIdNumber: listingIdNumber || null,
      addDate: null,
      imageUrl,
      mileage,
    };
  }, SELECTORS);

  return {
    listingIdNumber: listingDetails.listingIdNumber || 0,
    addDate: listingDetails.addDate,
    imageUrl: listingDetails.imageUrl || null,
    mileage: listingDetails.mileage || 0,
  };
}

async function parseDate(page: Page): Promise<Date | null> {
  const addDateText = await page.evaluate((SELECTORS) => {
    const dtElements = Array.from(document.querySelectorAll(SELECTORS.addDate));
    for (let i = 0; i < dtElements.length; i++) {
      const term = dtElements[i].textContent?.trim();
      if (term === 'Oglas objavljen') {
        const ddElement = dtElements[i].nextElementSibling;
        return ddElement?.textContent?.trim() || '';
      }
    }
    return '';
  }, SELECTORS);

  const [day, month, year, time] = addDateText
    .replace(' u ', ' ')
    .split(/[. ]+/);
  return new Date(`${year}-${month}-${day}T${time}:00`);
}
