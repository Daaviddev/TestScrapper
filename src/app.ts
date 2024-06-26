import { PrismaClient } from '@prisma/client';
import express from 'express';
import { scrapeListings } from './scraper';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/scrape/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const listings = await scrapeListings(company.url, companyId);
    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get all companies
app.get('/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get a single company by ID
app.get('/companies/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { listings: true },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get all listings for a company
app.get('/companies/:id/listings', async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { listings: true },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company.listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
