const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pino = require('pino');
const connectToDatabase = require('../models/db');

const router = express.Router();
const logger = pino();

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

router.post('/register', async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const db = await connectToDatabase();

    const collection = db.collection('users');

    const existingEmail = await collection.findOne({ email: req.body.email });

    if (existingEmail) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(req.body.password, salt);
    const email = req.body.email;

    const newUser = await collection.insertOne({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: hash,
      createdAt: new Date(),
    });

    const payload = {
      user: {
        id: newUser.insertedId,
      },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);

    logger.info('User registered successfully');
    res.json({ authtoken, email });
  } catch (e) {
    logger.error(e);
    return res.status(500).send('Internal server error');
  }
});

module.exports = router;