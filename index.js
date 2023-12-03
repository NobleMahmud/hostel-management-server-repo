require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express();
const cors = require('cors');


//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@car-project.leyflmf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db("hostelDb").collection("users");
    const mealCollection = client.db("hostelDb").collection("meals");
    const reviewCollection = client.db("hostelDb").collection("reviews");
    const paymentCollection = client.db("hostelDb").collection("payments");
    const requestCollection = client.db("hostelDb").collection("requests");
    const upcomingCollection = client.db("hostelDb").collection("upcoming");

    //
      // jwt related api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        })
        res.send({ token })
      })
  
      // middlewares
      const verifyToken = (req, res, next) => {
        console.log('inside verify token', req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
  
      }
    //
     // use verifyAdmin after verifyToken
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    //
    app.get('/users/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {
        email: email
      }
      const result = await userCollection.findOne(query);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user does not exist
      // you can do this in many ways. (1. email unique, 2. upsert, 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    //payment related
    app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body;
      const amount = parseInt(price*100);
      // parseInt(price*100)
      
      console.log('value of price: ', amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    //
    app.get('/payments/:email', verifyToken, async (req, res)=>{
      const query ={email: req.params.email}
      const result = await paymentCollection.find(query).toArray();
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'});
      }
      res.send(result);

    })
    //
    

    //user plans update api
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      console.log('the email is', email);
      const userPayment = req.body;
      const plan = userPayment.plan;
      
      const result = await userCollection.updateOne(
        { email: email },
        {
          $set: { badges: ["Bronze", plan] } // Set the badges field to an array with both values
        }
      );
      res.send(result);

    })
    // app.patch('/users/:email', async (req, res) => {
    //   const email = req.params.email;
    //   console.log('the email is', email);
    //   const userPayment = req.body;
    //   const plan = userPayment.plan;
      
    //   const result = await userCollection.updateOne(
    //     { email: email },
    //     {
    //       $push: {
    //         badges: plan
    //       }
    //     }
    //   );
    //   res.send(result);

    // })
    //
    //meals related api
    app.get('/meals', async (req, res) => {
      const result = await mealCollection.find().toArray();
      res.send(result);
    })

    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      console.log('the id is', id);
      const query = { _id: new ObjectId(id) };
      const result = await mealCollection.findOne(query);
      res.send(result);
    })

    app.patch('/meals/:id', async (req, res) => {
      const id = req.params.id;
      console.log('the id is', id);
      const likedUser = req.body;
      const email = likedUser.email;
      const result = await mealCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $push: {
            likes: email
          }
        }
      );
      res.send(result);

    })

    //meal request related api
    app.post('/mealRequests', async(req, res)=>{
      const mealRequest = req.body;
      const result = await requestCollection.insertOne(mealRequest);
      res.send(result);
    })
    //upcoming
    app.get('/upcoming', async (req, res)=>{
      const upcomingMeals = req.body;
      const result = await upcomingCollection.find().toArray();
      res.send(result);
    })

    //review related api
    app.get('/reviews', async (req, res) => {
      const id = req.query.id;
      console.log('The id is: ', id);
      const query = { mealId: id }

      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/reviews', async (req, res) => {
      const userReview = req.body;
      console.log(userReview);
      const result = await reviewCollection.insertOne(userReview);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('canteen is open')
})

app.listen(port, () => {
  console.log(`canteen is running on port: ${port}`);
})