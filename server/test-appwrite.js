import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://appwrite.propoj.app/v1')
    .setProject('kostky01')
    .setKey('standard_4b3657687f52a475510c64335e6eb161ba99ca81cc16db8acf3da59ef35fae7b78e9ebabe07f4ca43b931c32a9129651e2a41c1f510cf91a3046fb1d55387f4b631ab47963ccabcaf21cffe01ad6d6789bfeffcf5ab8004ccb2690aa948a8d21ffed174ee845bd34fab7f17c1004a47431d3cfae4124806fba10d3e1375def24');

const dbs = new Databases(client);

async function run() {
    try {
        console.log('Fetching databases...');
        const list = await dbs.list();
        console.log('DATABASES FOUND:', JSON.stringify(list.databases, null, 2));

        for (const db of list.databases) {
            console.log(`Fetching collections for DB: ${db.name} (${db.$id})...`);
            const collections = await dbs.listCollections(db.$id);
            console.log(`COLLECTIONS IN ${db.name}:`, JSON.stringify(collections.collections, null, 2));
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

run();
