const express = require("express");
const ExpressError = require("../expressError");
const db = require("../db");

let router = new express.Router();

/** GET /invoices : 
 * Return info on invoices: 
 * like {invoices: [{id, comp_code}, ...]} 
 * */

router.get("/", async function (req, res, next) {
    try {
        const result = await db.query(
            `SELECT id, comp_code
             FROM invoices
             ORDER BY id`
        );

        return res.json({ "invoices": result.rows });
    }

    catch (err) {
        return next(err);
    }
});

/** GET /invoices/[id] : 
 * Returns obj on given invoice.
 * If invoice cannot be found, returns 404. 
 * Returns 
 * {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}} 
 * 
 * */

router.get("/:id", async function (req, res, next) {
    try {
        let invId = req.params.id

        const invResult = await db.query(
            `SELECT i.id,
                    i.amt,
                    i.paid,
                    i.add_date,
                    i.paid_date,
                    i.comp_code,
                    c.name,
                    c.description
             FROM invoices AS i
                INNER JOIN companies AS c ON (i.comp_code = c.code)
            WHERE id = $1`,
            [invId]);

        if (invResult.rows.length === 0) {
            throw new ExpressError(`No such invoice: ${invId}`, 404);
        }

        const data = invResult.rows[0];
        const invoice = {
            id: data.id,
            amt: data.amt,
            paid: data.paid,
            add_date: data.add_date,
            paid_date: data.paid_date,
            company: {
                code: data.comp_code,
                name: data.name,
                description: data.description,
            },
        };

        return res.json({ "invoice": invoice });
    }

    catch (err) {
        return next(err);
    }
});

/** POST /invoices : Adds an invoice. 
 * Needs to be passed in JSON body of: 
 * {comp_code, amt}
 * Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}} 
 * 
 * */

router.post("/", async function (req, res, next) {
    try {
        let { comp_code, amt } = req.body;

        const result = await db.query(
            `INSERT INTO invoices (comp_code, amt)
        VALUES ($1, $2)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]);

        return res.json({ "invoice": result.rows[0] });
    }
    catch {
        return next(err)
    }

});

/** PUT /invoices/[id] : Updates an invoice. 
 * If invoice cannot be found, returns a 404.
 * Needs to be passed in a JSON body of {amt} 
 * Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}} 
 * 
 * */
router.put("/:id", async function (req, res, next) {
    try {
        let { amt, paid } = req.body;

        let result = await db.query(
            `UPDATE invoices
             SET amt=$1, paid=$2, paid_date=$3
             WHERE id=$4
             RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, paid, paid_date, id]);

        return res.json({ "invoice": result.rows[0] })
    }

    catch (err) {
        return next(err);
    }
});