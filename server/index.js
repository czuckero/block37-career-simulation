const express = require('express');
const app = express();

const {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment
} = require('./db');

const init = async () => {
  await client.connect();
  console.log('connected to express server');

  await createTables();
  console.log('tables created');

  const [christian, william, speebie, cris, shampoo, bracelet, milk, tubesock]
  = await Promise.all([
    createUser({username: 'christian', password: 'tubular'}),
    createUser({username: 'william', password: 'password'}),
    createUser({username: 'speebie', password: 'icup'}),
    createUser({username: 'cris', password: 'tina'}),
    createItem({name: 'shampoo', description: 'cruelty free'}),
    createItem({name: 'bracelet', description: 'homemade'}),
    createItem({name: 'milk', description: 'skim'}),
    createItem({name: 'tubesock', description: 'large'}),
  ]);

  const review = await createReview({txt: "not worth the money", rating: 1, user_id: christian.id, item_id: shampoo.id})
  const comment = await createComment({txt: "really? i thought it was good shampoo", user_id: cris.id, review_id: review.id})
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();