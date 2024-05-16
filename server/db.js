const pg = require('pg');
const client = new pg.Client(
  process.env.DATABASE_URL || 'postgres://localhost/review-site-block37'
);
const uuid = require('uuid');
const bcrypt = require('bcrypt');

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
      txt VARCHAR(255),
      rating INTEGER,
      item_id UUID REFERENCES items(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      CONSTRAINT unique_user_id_and_item_id UNIQUE (user_id, item_id)
    );

    CREATE TABLE comments(
      id uuid PRIMARY KEY,
      txt VARCHAR(255),
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

const createReview = async ({ txt, rating, user_id, item_id }) => {
  const SQL = /* sql */ `
    INSERT INTO reviews(id, txt, rating, user_id, item_id)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(), txt, rating, user_id, item_id
  ]);
  return response.rows[0];
};

const createComment = async ({ txt, user_id, review_id }) => {
  const SQL = /* sql */ `
    INSERT INTO comments(id, txt, user_id, review_id)
    VALUES($1, $2, $3, $4)
    RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), txt, user_id, review_id]);
  return response.rows[0];
};

module.exports = {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment
};