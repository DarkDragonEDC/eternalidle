import { getAllStoreItems } from '../shared/crownStore.js';

const items = getAllStoreItems();
items.forEach(item => {
    console.log(`ID: ${item.id}, Name: ${item.name}, Icon: ${item.icon}`);
});
