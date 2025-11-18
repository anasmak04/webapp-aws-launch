require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL');
});

// Optional: Create table if it doesn’t exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(50) NOT NULL,
  lastname VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
)
`;

db.query(createTableQuery, err => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Students table is ready');
  }
});

const handleError = (res, error, view, data = {}) => {
  console.error(error);
  res.render(view, {
    ...data,
    alert: { type: 'error', message: 'Something went wrong, please try again.' }
  });
};

app.get('/', (req, res) => {
  res.redirect('/students');
});

app.get('/students', (req, res) => {
  db.query('SELECT * FROM students ORDER BY id DESC', (err, results) => {
    if (err)
      return handleError(res, err, 'students/index', {
        students: [],
        title: 'Students'
      });
    res.render('students/index', {
      title: 'Students',
      students: results,
      alert: req.query.message
        ? { type: req.query.type || 'success', message: req.query.message }
        : null
    });
  });
});

app.get('/students/new', (req, res) => {
  res.render('students/form', {
    title: 'Add Student',
    student: null,
    action: 'create'
  });
});

app.post('/students', (req, res) => {
  const { firstname, lastname, email } = req.body;
  const insertQuery =
    'INSERT INTO students (firstname, lastname, email) VALUES (?, ?, ?)';
  db.query(insertQuery, [firstname, lastname, email], err => {
    if (err) {
      return handleError(res, err, 'students/form', {
        title: 'Add Student',
        student: { firstname, lastname, email },
        action: 'create'
      });
    }
    res.redirect('/students?message=Student%20added%20successfully&type=success');
  });
});

app.get('/students/:id/edit', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM students WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.redirect(
        '/students?message=Student%20not%20found&type=error'
      );
    }
    res.render('students/form', {
      title: 'Edit Student',
      student: results[0],
      action: 'edit'
    });
  });
});

app.post('/students/:id/update', (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, email } = req.body;
  const updateQuery =
    'UPDATE students SET firstname = ?, lastname = ?, email = ? WHERE id = ?';
  db.query(updateQuery, [firstname, lastname, email, id], err => {
    if (err) {
      return handleError(res, err, 'students/form', {
        title: 'Edit Student',
        student: { id, firstname, lastname, email },
        action: 'edit'
      });
    }
    res.redirect('/students?message=Student%20updated%20&type=success');
  });
});

app.post('/students/:id/delete', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM students WHERE id = ?', [id], err => {
    if (err) {
      return res.redirect(
        '/students?message=Unable%20to%20delete%20student&type=error'
      );
    }
    res.redirect('/students?message=Student%20removed&type=success');
  });
});

// Start server
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
