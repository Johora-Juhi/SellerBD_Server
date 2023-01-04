const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fnbhyls.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const usersCollection = client.db('sellerBD').collection('users');
        const categoriesCollection = client.db('sellerBD').collection('categories');
        const productsCollection = client.db('sellerBD').collection('products');

        // verify seller
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        };

        // verifyBuyer
        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'buyer') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        };

        // verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        };

        // send token 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

                // useSeller
                app.get('/users/seller/:email', async (req, res) => {
                    const email = req.params.email;
                    const query = { email }
                    const user = await usersCollection.findOne(query);
                    res.send({ isSeller: user?.role === 'seller' })
                });
        
                // useBuyer
                app.get('/users/buyer/:email', async (req, res) => {
                    const email = req.params.email;
                    const query = { email }
                    const user = await usersCollection.findOne(query);
                    res.send({ isBuyer: user?.role === 'buyer' })
                });
        
                // useAdmin
                app.get('/users/admin/:email', async (req, res) => {
                    const email = req.params.email;
                    const query = { email }
                    const user = await usersCollection.findOne(query);
                    res.send({ isAdmin: user?.role === 'admin' })
                });
        
                // create usersCollection
                app.post('/users', async (req, res) => {
                    const user = req.body;
                    const result = await usersCollection.insertOne(user);
                    res.send(result);
                });
        
                // get buyers 
                app.get('/users/buyers', verifyJwt, verifyAdmin, async (req, res) => {
                    const query = { role: 'buyer' };
                    const buyers = await usersCollection.find(query).toArray();
                    console.log(buyers);
                    res.send(buyers);
                });
        
                // delete buyers 
                app.delete('/users/buyers/:id', verifyJwt, verifyAdmin, async (req, res) => {
                    const id = req.params.id;
                    const filter = { _id: ObjectId(id) };
                    const result = await usersCollection.deleteOne(filter);
                    res.send(result);
                });
        
                // get sellers 
                app.get('/users/sellers', verifyJwt, verifyAdmin, async (req, res) => {
                    const query = { role: 'seller' };
                    const sellers = await usersCollection.find(query).toArray();
                    console.log(sellers);
                    res.send(sellers);
                });
        
                // delete sellers 
                app.delete('/users/sellers/:id', verifyJwt, verifyAdmin, async (req, res) => {
                    const id = req.params.id;
                    const filter = { _id: ObjectId(id) };
                    const result = await usersCollection.deleteOne(filter);
                    res.send(result);
                });
        
                // verified seller 
                app.post('/users/sellers', verifyJwt, verifyAdmin, async (req, res) => {
                    const seller = req.body;
                    const id = seller._id;
                    const filterId = { _id: ObjectId(id) }
                    const updatedDoc = {
                        $set: {
                            verified: true
                        }
                    }
                    const email = seller.email;
                    const filterEmail = { email: email }
                    const result = await usersCollection.updateOne(filterId, updatedDoc);
                    const updatedProducts = await productsCollection.updateMany(filterEmail, updatedDoc)
                    res.send(result);
                });
        
        // get category types 
        app.get('/categoriesType', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        // get products according to category 
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Seller BD server is Running here');
});

app.listen(port, () => {
    console.log(`Seller BD server is running on port ${port}`);
})
