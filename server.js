'use stirct';

//#region  Dependencies

require('dotenv').config();

const express = require('express');

const pg = require('pg');

const cors = require('cors');

const superagent = require('superagent');

const override = require('method-override');

const { render } = require('ejs');

//#endregion


//#region Variables Area

let diff_string;

let diff_int;

const Q_number = 5;

//let Q_counter = 0;

//#endregion


//#region  Setup

let app = express();

const PORT = process.env.PORT || 3005;

const DATABASE_URL = process.env.DATABASE_URL;

const client = new pg.Client(DATABASE_URL);
// const options = NODE_ENV === 'production' ? {
//     connectionString: DATABASE_URL
//     , ssl: { rejectUnauthorized: false }
// } : {
//     connectionString: DATABASE_URL
// };

//#endregion


//#region Middlewares

app.use(express.urlencoded({ extended: true }));

app.use(express.static('./public'));

app.use(override('_method'));

app.use(cors());

app.set('view engine', 'ejs');

//#endregion


//#region Routes

// home Page Route
app.get('/', renderHomePage);

// from home to quiz page Route
app.post('/quiz', handleQuiz);

// quiz page Route
app.get('/quiz', handleStart);

// result partial Route
app.get('/result', handleResult);

// Top scores Route
app.get('/scores', handleTopScores);

// // about us Route
app.get('/about', handleAbout);

// // Update Route
// app.put('//:', handleUpdate);

// // Posting Update Route
// app.post('//:', handleUpdate);

// Route not found
app.get('*', handleError);

//#endregion


//#region client connection check

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log('Connected to database:'); //show what database we connected to
        console.log(`Listening to Port ${PORT}`); //start point for the application"initialisation"
    });
});

client.on('error', error => console.error(error));

//#endregion


//#region Constructors Area

function Question(data) {
    this.question = data.question;
    this.correct_answer = data.correct_answer;
    this.incorrect_answers = data.incorrect_answers;
    this.difficulty = data.difficulty;
    this.full_arr = this.incorrect_answers;
    this.full_arr.push(this.correct_answer);
}

//#endregion


//#region Functions/Handlers Area
function renderHomePage(req, res) {
    res.render('pages/index');
}

function handleAbout(req, res) {
    res.render('pages/about');
}

function handleQuiz(req, res) {
    const userName = req.body.name;
    diff_string = req.body.difficulty;
    if (diff_string === 'easy') {
        diff_int = 1;
    } else if (diff_string === 'medium') {
        diff_int = 2;
    } else if (diff_string === 'hard') {
        diff_int = 3;
    }
    const sql = 'SELECT name FROM users WHERE name = $1 ;';
    // const sql2 = 'SELECT name FROM users WHERE name = $1 ;';
    const values = [userName];
    client.query(sql, values).then(result => {
        if (result.rows.length === 0) {
            const insertName = 'INSERT INTO users (name) VALUES($1) RETURNING id;';
            client.query(insertName, values).then(results => {
                // console.log('my id'+results.rows[0].id);
                const val = [results.rows[0].id, diff_int, 0, 0];
                const sql2 = 'INSERT INTO quiz_Result (User_id, difficulty_id, score, time) VALUES ($1, $2 , $3 ,$4)';
                client.query(sql2, val);
            });
            res.redirect('/quiz').catch(error => handleError(error, res));
        } else {
            // const sql = `SELECT difficulty_id FROM quiz_Result WHERE User_id = ${result.rows[0].id} ;`;
            res.redirect('/quiz');
        }
    })
        .catch(error => handleError(error, res));
}

function handleStart(req, res) {
    const url = `https://opentdb.com/api.php?amount=${Q_number}&category=9&difficulty=${diff_string}&type=multiple`;
    superagent.get(url)
        .then(quiz => {
            let arr = quiz.body.results.map(ques => new Question(ques));
            console.log(arr);
            res.render('pages/quiz-page', { data: arr });
        })
        .catch(error => handleError(error, res));
}

function handleResult(req, res) {
    // alter quiz_Result to save the new score and time.
    res.render('pages/partials/result');
}

function handleTopScores(req, res) {
    const sql = `SELECT score, time, name, difficulty FROM users 
                JOIN quiz_Result 
                ON user_id = users.id  
                JOIN quiz_Difficulty 
                ON difficulty_id = quiz_Difficulty.id  
                WHERE quiz_Difficulty.id = ${diff_int}
                ORDER BY score DESC;`;
    return client.query(sql)
        .then(results => res.render('pages/scores', { scores: results.rows }))
        .catch((error) => handleError(error, res));
}

//#endregion


//#region Error Handler

function handleError(error, res) {
    res.send({ status: 404, message: `Sorry something went wrong => ${error}` });
}

//#endregion
