const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.es8at.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("Electrific").collection("users");
    const userInfoCollection = client.db("Electrific").collection("userInfo");
    const reviewCollection = client.db("Electrific").collection("reviews");
    const productCollection = client.db("Electrific").collection("products");

    // Verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // Get user
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // Get admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // Make admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Get specific user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    // Add user info
    app.post("/user-info", async (req, res) => {
      const newUser = req.body;
      const result = await userInfoCollection.insertOne(newUser);
      res.send(result);
    });

    // Get user info
    app.get("/user-info", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = userInfoCollection.find(query);
        const user = await cursor.toArray();
        res.send(user);
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // Delete user info
    app.delete("/user-info/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userInfoCollection.deleteOne(query);
      res.send(result);
    });

    // Add user review
    app.post("/user-review", async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    });

    // Get specific user reviews
    app.get("/user-review", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = reviewCollection.find(query);
      const review = await cursor.toArray();
      res.send(review);
    });

    // Get all user reviews
    app.get("/user-reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const review = await cursor.toArray();
      res.send(review);
    });

    // Get all inventory items
    app.get("/product", async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const product = await cursor.toArray();
      res.send(product);
    });

    // Add product
    app.post("/product", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Electrific Server Running");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});