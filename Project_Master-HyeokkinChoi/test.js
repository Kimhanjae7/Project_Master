const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'project',
    charset: 'utf8'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

function searchData(keywords, callback) {
    let sql = 'SELECT * FROM project_info WHERE 1=1';
    let values = [];
    
    keywords.forEach(keyword => {
        keyword = `%${keyword.trim()}%`;
        sql += `
            AND (
                category LIKE ? OR 
                mem_number LIKE ? OR 
                way LIKE ? OR 
                period LIKE ? OR 
                teck_stack LIKE ? OR 
                deadline LIKE ? OR 
                position LIKE ? OR 
                contact LIKE ? OR 
                introduce_title LIKE ? OR 
                introduce_detail LIKE ?
            )
        `;
        values.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    });

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            callback([]);
            return;
        }
        callback(results);
    });
}

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <form method="post" action="/">
                    <div>
                        <label>Search: 
                            <input type="text" name="keyword" placeholder="키워드를 입력하세요.">
                        </label>
                        <input type="submit" value="Search">
                    </div>
                </form>
                <h2>Results:</h2>
                <ul id="results"></ul>
            </body>
            <script>
                function displayResults(results) {
                    const ul = document.getElementById('results');
                    ul.innerHTML = '';
                    results.forEach(result => {
                        const li = document.createElement('li');
                        li.textContent = JSON.stringify(result);
                        ul.appendChild(li);
                    });
                }
            </script>
        </html>
    `);
});

app.post('/', (req, res) => {
    const keyword = req.body.keyword;
    if (keyword) {
        const keywords = keyword.split(',');
        searchData(keywords, (results) => {
            res.send(`
                <html>
                    <body>
                        <form method="post" action="/">
                            <div>
                                <label>Search: 
                                    <input type="text" name="keyword" placeholder="키워드를 입력하세요.">
                                </label>
                                <input type="submit" value="Search">
                            </div>
                        </form>
                        <h2>Results:</h2>
                        <ul>
                            ${results.map(result => `<li>${JSON.stringify(result)}</li>`).join('')}
                        </ul>
                    </body>
                </html>
            `);
        });
    } else {
        res.send(`
            <html>
                <body>
                    <form method="post" action="/">
                        <div>
                            <label>Search: 
                                <input type="text" name="keyword" placeholder="키워드를 입력하세요.">
                            </label>
                            <input type="submit" value="Search">
                        </div>
                    </form>
                    <h2>Results:</h2>
                    <ul></ul>
                </body>
            </html>
        `);
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
