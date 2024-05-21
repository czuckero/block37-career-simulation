const pg = require('pg');
const client = new pg.Client(
  process.env.DATABASE_URL || 'postgres://localhost/review-site-block37'
);
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT = process.env.JWT || 'secret_key'

const createTables = async () => {
  const SQL = /* sql */ `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users(
      id uuid PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );

    CREATE TABLE items(
      id uuid PRIMARY KEY,
      name VARCHAR(255),
      description VARCHAR(255)
    );

    CREATE TABLE reviews(
      id uuid PRIMARY KEY,
      text VARCHAR(1000),
      rating INTEGER,
      item_id UUID REFERENCES items(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      CONSTRAINT unique_user_id_and_item_id UNIQUE (user_id, item_id)
    );

    CREATE TABLE comments(
      id uuid PRIMARY KEY,
      text VARCHAR(1000),
      review_id UUID REFERENCES reviews(id) NOT NULL,
      user_id UUID  REFERENCES users(id) NOT NULL,
      CONSTRAINT unique_review_id_and_user_id UNIQUE (user_id, review_id)
    );
  `;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = /* sql */ `
    INSERT INTO users(id, username, password)
    VALUES($1, $2, $3)
    RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), username, await bcrypt.hash(password, 5)]);
  return response.rows[0];
};

const createItem = async ({ name, description }) => {
  const SQL = /* sql */ `
    INSERT INTO items(id, name, description)
    VALUES($1, $2, $3)
    RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), name, description]);
  return response.rows[0];
};

const createReview = async ({ text, rating, user_id, item_id }) => {
  const SQL = /* sql */ `
    INSERT INTO reviews(id, text, rating, user_id, item_id)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(), text, rating, user_id, item_id
  ]);
  return response.rows[0];
};

const createComment = async ({ text, user_id, reviewId }) => {
  const SQL = /* sql */ `
    INSERT INTO comments(id, text, user_id, review_id)
    VALUES($1, $2, $3, $4)
    RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), text, user_id, reviewId]);
  return response.rows[0];
};

const authenticate = async({ username, password })=> {
  const SQL = /* sql */ `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;
  const response = await client.query(SQL, [ username ]);
  if(!response.rows.length || (await bcrypt.compare(password, response.rows[0].password)) === false){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }

  const token = await jwt.sign({id: response.rows[0].id}, JWT);
  console.log(token);
  return { token };
};

const findUserWithToken = async(token)=> {
  let id;
  try {
    const payload = await jwt.verify(token, JWT);
    console.log('payload', payload);
    id = payload.id;
  } catch (err) {
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  console.log(id);
  const SQL = /* sql */`
    SELECT id, username FROM users WHERE id=$1;
  `;
  const response = await client.query(SQL, [id]);
  if(!response.rows.length){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  return response.rows[0];
};

const fetchUsers = async()=> {
  const SQL = /* sql */ `
    SELECT id, username FROM users;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchItems = async()=> {
  const SQL = /* sql */ `
    SELECT * FROM items;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchItemById = async( item_id )=> {
  const SQL = /* sql */ `
    SELECT * FROM items where id = $1;
  `;
  const response = await client.query(SQL, [item_id]);
  return response.rows;
};

const fetchReviews = async( item_id )=> {
  const SQL = /* sql */ `
    SELECT * FROM reviews WHERE item_id = $1;
  `;
  const response = await client.query(SQL, [item_id]);
  return response.rows;
};

const fetchUserReviews = async( user_id )=> {
  const SQL = /* sql */ `
    SELECT * FROM reviews WHERE user_id = $1;
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const fetchSingleReview = async( review_id, item_id ) => {
  const SQL = /* sql */ `
    SELECT * FROM reviews where id = $1 and item_id = $2;
  `;
  const response = await client.query(SQL, [review_id, item_id]);
  return response.rows;
}

const deleteUserReview = async({ user_id, id }) => {
  const SQL = /* sql */ `
    DELETE FROM reviews WHERE user_id = $1 and id = $2
  `;
  const deleteCommentsQuery = /* sql */ `
    DELETE FROM comments 
    WHERE review_id = $1
  `;
  await client.query(deleteCommentsQuery, [id]);
  await client.query(SQL, [user_id, id]);
};

const updateUserReview = async({ user_id, review_id, text, rating }) => {
  const SQL = /* sql */`
    UPDATE reviews
    SET text = $1, rating = $2
    WHERE id = $3 AND user_id = $4
  `;
  await client.query(SQL, [text, rating, review_id, user_id]);
};

const fetchUserComments = async( user_id )=> {
  const SQL = /* sql */ `
    SELECT * FROM comments WHERE user_id = $1;
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const deleteUserComment = async({ user_id, comment_id }) => {
  const SQL = /* sql */ `
    DELETE FROM comments WHERE user_id = $1 and id = $2
  `;
  await client.query(SQL, [user_id, comment_id]);
};

const updateUserComment = async({ user_id, comment_id, text }) => {
  const SQL = /* sql */`
    UPDATE comments
    SET text = $1
    WHERE id = $2 AND user_id = $3
  `;
  await client.query(SQL, [text, comment_id, user_id]);
};

module.exports = {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  authenticate,
  findUserWithToken,
  fetchUsers,
  fetchItems,
  fetchItemById,
  fetchReviews,
  fetchUserReviews,
  fetchSingleReview,
  fetchUserComments,
  deleteUserReview,
  updateUserReview,
  deleteUserComment,
  updateUserComment
};