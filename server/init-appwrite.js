import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const COLL_ID = process.env.APPWRITE_COLLECTION_ID;

export async function initAppwrite() {
    try {
        console.log('Appwrite: Checking database structure...');

        // 1. Check if Database exists
        try {
            await databases.get(DB_ID);
            console.log(`Appwrite: Database '${DB_ID}' exists.`);
        } catch (e) {
            console.error(`Appwrite Error: Database '${DB_ID}' not found. Please create it manually if it doesn't exist.`);
            return;
        }

        // 2. Check if Collection exists
        try {
            await databases.getCollection(DB_ID, COLL_ID);
            console.log(`Appwrite: Collection '${COLL_ID}' exists.`);
        } catch (e) {
            console.log(`Appwrite: Collection '${COLL_ID}' not found. Creating...`);
            await databases.createCollection(
                DB_ID,
                COLL_ID,
                COLL_ID, // Name
                ['read("any")', 'create("any")', 'update("any")'] // Permissions for SDK 9
            );
            console.log(`Appwrite: Collection '${COLL_ID}' created.`);

            // 3. Create Attributes
            console.log('Appwrite: Creating attributes...');
            await databases.createStringAttribute(DB_ID, COLL_ID, 'nickname', 255, true);
            await databases.createIntegerAttribute(DB_ID, COLL_ID, 'wins', false, 0);
            await databases.createIntegerAttribute(DB_ID, COLL_ID, 'total_points', false, 0);
            await databases.createIntegerAttribute(DB_ID, COLL_ID, 'games_played', false, 0);
            console.log('Appwrite: Attributes created. (Syncing may take a moment)');
            
            // 4. Create Indexes
            console.log('Appwrite: Creating indexes...');
            await databases.createIndex(DB_ID, COLL_ID, 'idx_wins', 'key', ['wins'], ['desc']);
            console.log('Appwrite: Index created.');
        }

    } catch (err) {
        console.error('Appwrite Initialization Error:', err.message);
    }
}
