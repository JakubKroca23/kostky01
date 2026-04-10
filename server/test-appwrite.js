import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://appwrite.propoj.app/v1')
    .setProject('arena')
    .setKey('standard_20a1557879e9d059f90069651f46edcb7ef33d2efc35279a8837df4145a8f63f587f7ad6bcad1a01a04c8d347604020d2720f858e3e5643848f10e40b9608bffd616bdceefd0860789be134fc3cac64e28ee674a8806a763cf1e18bf3ebecf8e35b2d5eab8ab0bd881cf1f15949762df13ac44628292f0170acc621bc265cd75');

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
