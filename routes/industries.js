const express = require("express");
const slugify = require("slugify");
const ExpressError = require("../expressError");
const db = require("../db");

let router = new express.Router();

/** Add routes for:

- adding an industry
- listing all industries, which should show the company code(s) for that industry
- associating an industry to a company

*/


/** 
 * POST - add industry
 *      {industries: code, industry} 
 * 
 * */

router.post("/", async function (req, res, next) {
    try {
        let { industry } = req.body;

        let code = slugify(industry, { lower: true });

        // Check if the industry already exists
        const existingIndustry = await db.query(
            "SELECT * FROM industries WHERE code = $1",
            [code]
        );

        if (existingIndustry.rows.length > 0) {
            throw new ExpressError("Industry already exists", 409); // Conflict error
        }

        // Insert the new industry into the database
        const result = await db.query(
            "INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING *",
            [code, industry]
        );

        res.status(201).json({ industry: result.rows[0] });
    } catch (err) {
        return next(err);
    }
});

/** POST */
// Route to associate a company with an industry
router.post("/associate", async function (req, res, next) {
    try {
        const { companyCode, industryCode } = req.body;

        // Check if the provided company code exists
        const companyExists = await db.query(
            `SELECT 1 FROM companies WHERE code = $1`,
            [companyCode]
        );

        if (companyExists.rows.length === 0) {
            throw new ExpressError(`Company with code ${companyCode} not found`, 404);
        }

        // Check if the provided industry code exists
        const industryExists = await db.query(
            `SELECT 1 FROM industries WHERE code = $1`,
            [industryCode]
        );

        if (industryExists.rows.length === 0) {
            throw new ExpressError(`Industry with code ${industryCode} not found`, 404);
        }

        // Check if the association already exists
        const associationExists = await db.query(
            `SELECT 1 FROM company_industry WHERE company_code = $1 AND industry_code = $2`,
            [companyCode, industryCode]
        );

        if (associationExists.rows.length > 0) {
            throw new ExpressError(`Company ${companyCode} is already associated with industry ${industryCode}`, 400);
        }

        // Insert the association into the company_industry table
        await db.query(
            `INSERT INTO company_industry (company_code, industry_code) VALUES ($1, $2)`,
            [companyCode, industryCode]
        );

        // Return a success response
        return res.status(201).json({ message: "Company successfully associated with industry" });
    } catch (err) {
        return next(err);
    }
});

/** GET - all industries
 * 
 *  Return {industry, code}
 * 
 */

router.get("/", async function (req, res, next) {
    try {
        const result = await db.query(
            `SELECT i.code AS industry_code, i.industry, ci.company_code
            FROM industries AS i
            LEFT JOIN company_industry AS ci ON i.code = ci.industry_code
            ORDER BY i.code, ci.company_code`
        );

        // Group the results by industry code
        const industries = {};
        result.rows.forEach(row => {
            const { industry_code, industry, company_code } = row;
            if (!industries[industry_code]) {
                industries[industry_code] = { industry, companies: [] };
            }
            if (company_code) {
                industries[industry_code].companies.push(company_code);
            }
        });

        return res.json({ industries });

    } catch (err) {
        return next(err);
    }

});



module.exports = router;
