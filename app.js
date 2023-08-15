const crypto = require('node:crypto');
const express = require('express');
const movies = require('./movies.json');
const cors = require('cors');
const { validateMovie, validatePartialMovie } = require('./schema/movie');
const app = express();
const PORT = process.env.PORT ?? 3000;

// settings
app.disable('x-powered-by'); // deshabilitar el header X-Powered-By: Express

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      const ACCEPTED_ORIGINS = [
        'http://localhost:8080',
        'http://localhost:3000',
        'https://movies.com',
        'https://midu.dev',
      ];

      if (ACCEPTED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      if (!origin) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// rutas
app.get('/', (req, res) => {
  res.json({ message: 'hola mundo' });
});

// metodos normales: GET/HEAD/POST
// metodos complejos: PUT/PATCH/DELETE

// 'origins' permitidos
const ACCEPTED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://movies.com',
  'https://midu.dev',
];

app.get('/movies', (req, res) => {
  const origin = req.header('origin');
  // el navegador NO ENVIA el header 'origin',
  //  cuando la peticion es del MISMO ORIGIN
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    // permitimos cualquier otro 'origin' diferente
    // res.header('Access-Control-Allow-Origin', '*'); // '*' -> cualquier 'origin'
    res.header('Access-Control-Allow-Origin', origin); // origin especifico
  }

  const { genre } = req.query;
  if (genre) {
    const filteredMovies = movies.filter((movie) =>
      movie.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
    );
    return res.json(filteredMovies);
  }

  res.json(movies);
});

app.get('/movies/:id', (req, res) => {
  const { id } = req.params;

  const movie = movies.find((movie) => movie.id === id);
  if (movie) return res.json(movie);

  res.status(404).json({ message: 'Movie not found!' });
});

app.post('/movies', (req, res) => {
  // resultado de la validacion, con 'zod'
  const result = validateMovie(req.body);
  if (result.error) {
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }

  const newMovie = {
    id: crypto.randomUUID(), // uuid v4
    // exito -> ocupamos los datos que trajo
    ...result.data,
  };

  // Esto no seria REST, porque estamos guardando
  // el estado de la aplicacion en memoria
  movies.push(newMovie);
  res.status(201).json(newMovie);
});

app.patch('/movies/:id', (req, res) => {
  // validamos solo las propiedades solicitadas
  const result = validatePartialMovie(req.body);
  if (!result.success) {
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }

  const { id } = req.params;
  const movieIndex = movies.findIndex((movie) => movie.id === id);
  if (movieIndex < 0) return res.status(404).json({ message: 'Movie not found' });

  //
  const updateMovie = {
    ...movies[movieIndex],
    ...result.data,
  };

  // guardar pelicula en el indice
  movieIndex[movieIndex] = updateMovie;
  return res.status(200).json(updateMovie);
});

app.delete('/movies/:id', (req, res) => {
  const origin = req.header('origin');
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  const { id } = req.params;
  const movieIndex = movies.findIndex((movie) => movie.id === id);

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  movies.splice(movieIndex, 1);
  return res.json({ message: 'Movie deleted' });
});

app.options('/movies/:id', (req, res) => {
  const origin = req.header('origin');
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin);
    // indicamos que metodos puede utilizar
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  }
  // res.send(200);
  res.sendStatus(200);
});

// listen
app.listen(PORT, () => console.log(`server running on http://localhost:${PORT}`));
