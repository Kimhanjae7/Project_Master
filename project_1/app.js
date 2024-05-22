const express = require('express')
const ejs = require('ejs') //js 코드를 html템플릿에 삽입하여 동적으로 웹페이지 생성
const app = express()
const port = 3000
var bodyParser = require('body-parser')
var session = require('express-session')

require('dotenv').config()

const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log("connected db")


app.set('view engine', 'ejs')
app.set('views', './views') //views라는 폴더안에 있는걸 가져온다

app.use(bodyParser.urlencoded({ extended: false }))

// Use the session middleware
app.use(session({ secret: 'yesung', cookie: { maxAge: 60000 }, resave:true, saveUninitialized:true,}))

app.use((req, res, next) => {

  res.locals.user_id = "";
  
  if(req.session.member){
    res.locals.user_id = req.session.member.user_id;
  }
  next()
})

//localhost:3000/ 를 입력하면 나온다
app.get('/', (req, res) => {
  //res.send('Hello World!')
  res.render('index')  // ./views/index.ejs
})

app.get('/profile', (req, res) => {
  //res.send('Hello test!!!!!')
  res.render('profile')
})

app.post('/profileProc', (req, res) => {
  const user_id = req.body.user_id;
  const user_pw = req.body.user_pw;
  const user_name = req.body.user_name;
  const user_phone = req.body.user_phone;
  const nickname = req.body.nickname;
  const job = req.body.job;
  const affiliation = req.body.affiliation;
  const career = req.body.career;
  const introduce = req.body.introduce;
  const interest_stack = req.body.interest_stack;

  var sql = `
    UPDATE member 
    SET 
      user_pw = ?, 
      user_name = ?, 
      user_phone = ?, 
      nickname = ?, 
      job = ?, 
      affiliation = ?, 
      career = ?, 
      introduce = ?, 
      interest_stack = ? 
    WHERE 
      user_id = ?
  `;
  var values = [user_pw, user_name, user_phone, nickname, job, affiliation, career, introduce, interest_stack, user_id];

  connection.query(sql, values, function(err, result){
    if(err) throw err;
    console.log('자료 1개를 삽입하였습니다');
    res.send("<script> alert('저장되었습니다'); location.href='/';</script>")
  })
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.post('/loginProc', (req, res) => {
  const user_id = req.body.user_id;
  const user_pw = req.body.user_pw;

  var sql = `select * from member where user_id=? and user_pw=? `
  var values = [user_id, user_pw]

  connection.query(sql, values, function(err, result){
    if(err) throw err;
    if(result.length==0){
      res.send("<script> alert('존재하지 않는 아이디입니다.'); location.href='/login';</script>")
    } else{

      req.session.member = result[0];
      res.send("<script> alert('로그인 되었습니다'); location.href='/';</script>")

      //res.send("로그인 성공한 후 페이지는 아직 안 만들었음");
    }
  })
})

app.get('/logout', (req, res) => {
  req.session.member = null;
  res.send("<script> alert('로그아웃 되었습니다'); location.href='/';</script>")

})

app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})
