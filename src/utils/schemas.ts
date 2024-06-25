import { z } from 'zod';

export const ListingDetailsSchema = z.object({
  mileage: z.number().nullable().optional(),
  addDate: z.date().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  listingIdNumber: z.number().nullable().optional(),
});

export const CarDetailsSchema = z.object({
  year: z.number().nullable().optional(),
  fuel: z.string().nullable().optional(),
  gear: z.string().nullable().optional(),
  engine: z.number().nullable().optional(),
  power: z.number().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  tip: z.string().nullable().optional(),
  modelYear: z.number().nullable().optional(),
});
