const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI; // must match .env key
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI not found in .env file");
    }

    console.log(`Attempting to connect to MongoDB at: ${MONGO_URI}`);

    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database Name: ${conn.connection.name}`);

    // List collections (optional debug info)
    const collections = await conn.connection.db.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));

    return conn;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
