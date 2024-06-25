"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const scraper_1 = require("./scraper");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
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
        const listings = await (0, scraper_1.scrapeListings)(company.url);
        res.json(listings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Route to get all companies
app.get('/companies', async (req, res) => {
    try {
        const companies = await prisma.company.findMany();
        res.json(companies);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = app;
