const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

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

    //meals related api
    app.get('/meals', async(req, res)=>{
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
    // app.get('/meals/:id', async (req, res) => {
    //   const id = req.params.id;
    //   console.log('the id is', id);
    //   const query = { _id: id };
    //   const result = await mealCollection.findOne(query);
    //   res.send(result);
    // })

     app.patch('/meals/:id', async (req, res) => {
      const id = req.params.id;
      console.log('the id is', id);
      const likedUser = req.body;
      const email = likedUser.email;
      // const filter = {_id: id}
      // const updateDoc = {
      //   $push: {
      //     likes: email
      //   }
      // }
      // const options = {upsert: true}
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

    //review related api
    app.get('/reviews', async(req, res)=>{
      const id = req.query.id;
      console.log('The id is: ', id);
      const query = {mealId: id}

      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/reviews', async(req, res)=>{
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


app.get('/', (req, res)=>{
    res.send('canteen is open')
})

app.listen(port, ()=>{
    console.log(`canteen is running on port: ${port}`);
})