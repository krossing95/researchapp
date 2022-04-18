const express = require('express');
const app = express();
const helmet = require('helmet');

require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 4000;

try {
    mongoose.connect(process.env.MONGO_URL)
} catch (error) {
    throw new Error(error)
}

// Routers

const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const archievesRouter = require('./routes/archieves');

app.use(cors({
    origin: '*', 
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
}))                                      

app.use(express.json())
app.use(helmet())

app.get('/', (req, res) => {
    res.send('This is an API build for MERN STACK application');
})

app.use('/users', usersRouter)
app.use('/categories', categoriesRouter)
app.use('/archieves', archievesRouter)

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))