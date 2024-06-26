import { CarDetails, Listing, ListingDetails } from '../scrapeDetails';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function saveListingsToDb(
  newListings: Listing[],
  companyId: string
) {
  const oldListings = await prisma.listing.findMany({
    where: { companyId },
    include: { listingDetails: true, car: true },
  });

  const oldListingMap = new Map(
    oldListings.map((listing) => [listing.link, listing])
  );

  for (const newListing of newListings) {
    if (!newListing.link) {
      continue; // Skip listings with null links
    }

    const existingListing = oldListingMap.get(newListing.link);

    if (existingListing) {
      // Update existing listing
      await updateExistingListing(existingListing, newListing);
    } else {
      // Create new listing
      await createNewListing(newListing, companyId);
    }
  }

  // Mark listings as sold if they are not in the new listings
  for (const oldListing of oldListings) {
    if (
      !newListings.some((newListing) => newListing.link === oldListing.link)
    ) {
      if (!oldListing.isSold) {
        await prisma.listing.update({
          where: { id: oldListing.id },
          data: {
            isSold: true,
            isSoldChangedAt: new Date(),
          },
        });
      }
    }
  }
}

async function updateExistingListing(
  existingListing: any,
  newListing: Listing
) {
  const updates: any = {};

  if (existingListing.price !== newListing.price) {
    updates.oldPrice = existingListing.price;
    updates.price = newListing.price;
    updates.priceChangedAt = new Date();
  }

  if (existingListing.listingDetails?.mileage !== newListing.details?.mileage) {
    updates.listingDetails = {
      update: {
        mileage: newListing.details?.mileage,
      },
    };
  }

  if (Object.keys(updates).length > 0) {
    await prisma.listing.update({
      where: { id: existingListing.id },
      data: updates,
    });
  }
}

async function createNewListing(newListing: Listing, companyId: string) {
  const car = await findOrCreateCar(newListing.car);

  await prisma.listing.create({
    data: {
      title: newListing.title || '',
      link: newListing.link || '',
      price: parseFloat(newListing.price || '0'),
      companyId,
      carId: car.id,
      listingDetails: {
        create: {
          imageUrl: newListing.details?.imageUrl || '',
          mileage: newListing.details?.mileage || 0,
          addDate: newListing.details?.addDate || new Date(),
          listingIdNumber: newListing.details?.listingIdNumber || 0,
        },
      },
    },
  });
}

async function findOrCreateCar(carDetails?: CarDetails) {
  if (!carDetails) {
    throw new Error('Car details are required to create a listing');
  }

  let car = await prisma.car.findFirst({
    where: {
      make: carDetails.make,
      model: carDetails.model,
      year: carDetails.year,
      engine: carDetails.engine,
    },
  });

  if (!car) {
    car = await prisma.car.create({
      data: {
        year: carDetails.year,
        fuel: carDetails.fuel,
        gear: carDetails.gear,
        engine: carDetails.engine,
        power: carDetails.power,
        make: carDetails.make,
        model: carDetails.model,
        tip: carDetails.tip,
        modelYear: carDetails.modelYear || 0,
      },
    });
  }

  return car;
}
