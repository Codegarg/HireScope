import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function testNative() {
  const uri = "mongodb://hirescope:hirescope123@ac-reaynlo-shard-00-01.s9gkoqs.mongodb.net:27017,ac-reaynlo-shard-00-02.s9gkoqs.mongodb.net:27017,ac-reaynlo-shard-00-00.s9gkoqs.mongodb.net:27017/?authSource=admin&replicaSet=atlas-reaynlo-shard-0&tls=true";
  console.log("Attempting direct connection to shards...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Native connection successful!");
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Native connection failed!");
    console.error(error);
    process.exit(1);
  }
}

testNative();
