const express = require('express');
const app = express();
app.use(express.json());

const {
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
} = require('./db');

const isLoggedIn = async(req, res, next) => {
  try {
    console.log('req, headers', req.headers.authorization);
    req.headers.authorization = req.headers.authorization.replace("Bearer ", "")
    req.user = await findUserWithToken(req.headers.authorization);
    next();
  } catch (error) {
    next(error)
  }
};

app.get('/api/items', async(req, res, next) => {
  try {
    res.send(await fetchItems());
  } catch (error) {
    next();
  }
});

app.get('/api/items/:id', async(req, res, next) => {
  try {
    res.send(await fetchItemById(req.params.id));
  } catch (error) {
    next();
  }
});

app.post('/api/auth/register', async(req, res, next) => {
  try {
    res.status(201).send(
      await createUser({
        username: req.body.username, 
        password: req.body.password
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async(req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', isLoggedIn, async(req, res, next) => {
  try {
    res.send(req.user);
  } catch (error) {
    next();
  }
});

app.get('/api/items/:id/reviews', async(req, res, next) => {
  try {
    res.send(await fetchReviews(req.params.id));
  } catch (error) {
    next();
  }
});

app.get('/api/items/:itemId/reviews/:id', async(req, res, next) => {
  try {
    res.send(await fetchSingleReview(req.params.id, req.params.itemId))
  } catch (error) {
    next();
  }
});

app.post('/api/items/:itemId/reviews', isLoggedIn, async(req, res, next) => {
  try {
    res.status(201).send(await createReview({
      text: req.body.text, 
      rating: req.body.rating,
      user_id: req.user.id,
      item_id: req.params.itemId
    }));
  } catch (error) {
    next();
  };
});

app.get('/api/reviews/me', isLoggedIn, async(req, res, next) => {
  try {
    res.send(await fetchUserReviews(req.user.id));
  } catch (error) {
    next();
  }
});

app.put('/api/users/:userId/reviews/:id', isLoggedIn, async(req, res, next) => {
  try {
    if(req.params.userId !== req.user.id) {
      const error = Error('not authorized');
      error.status = 401;
      throw error
    };

    res.send(await updateUserReview({
      user_id: req.user.id,
      review_id: req.params.id,
      text: req.body.text,
      rating: req.body.rating
    }));
  } catch (error) {
    next();
  }
});

app.delete('/api/users/:userId/reviews/:id', isLoggedIn, async(req, res, next) => {
  try {
    if(req.params.userId !== req.user.id) {
      const error = Error('not authorized');
      error.status = 401;
      throw error
    };
    await deleteUserReview({
      user_id: req.user.id,
      id: req.params.id
    });
    res.sendStatus(204);
  } catch (error) {
    next();
  }
});

app.post('/api/items/:itemId/reviews/:id/comments', isLoggedIn, async(req, res, next) => {
  try {

    res.status(201).send(await createComment({
      text: req.body.text, 
      user_id: req.user.id,
      reviewId: req.params.id
    }));
  } catch (error) {
    next();
  };
});

app.get('/api/comments/me', isLoggedIn, async(req, res, next) => {
  try {
    res.send(await fetchUserComments(req.user.id))
  } catch (error) {
    next();
  }
});

app.put('/api/users/:userId/comments/:id', isLoggedIn, async(req, res, next) => {
  try {
    if(req.params.userId !== req.user.id) {
      const error = Error('not authorized');
      error.status = 401;
      throw error
    };

    res.send(await updateUserComment({
      user_id: req.user.id,
      comment_id: req.params.id,
      text: req.body.text,
    }));
  } catch (error) {
    next();
  }
});

app.delete('/api/users/:userId/comments/:id', isLoggedIn, async(req, res, next) => {
  try {
    if(req.params.userId !== req.user.id) {
      const error = Error('not authorized');
      error.status = 401;
      throw error
    };
    await deleteUserComment({
      user_id: req.user.id,
      comment_id: req.params.id
    });
    res.sendStatus(204);
  } catch (error) {
    next();
  }
});

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

  console.log(await fetchUsers());
  console.log(await fetchItems());
  console.log(await fetchItemById(milk.id));

  const [review1, review2]= await Promise.all([
    createReview({text: "not worth the money", rating: 1, user_id: christian.id, item_id: shampoo.id}),
    createReview({text: "it's surprisingly good", rating: 4, user_id: william.id, item_id: shampoo.id})
  ])
  const comment = await createComment({text: "really? i thought it was good shampoo", user_id: cris.id, reviewId: review1.id})

  console.log(await fetchReviews(shampoo.id));
  console.log(await fetchUserReviews(christian.id));
  console.log(await fetchSingleReview(review1.id));
  console.log(await fetchUserComments(cris.id));

  // await updateUserReview({user_id: christian.id, review_id: review1.id, text: 'changed my mind', rating: 5, })
  // await updateUserComment({user_id: cris.id, comment_id: comment.id, text: 'actually no ur sooo right'})

  // await deleteUserComment({user_id: cris.id, comment_id: comment.id})
  // await deleteUserReview({user_id: christian.id, id: review1.id});

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();