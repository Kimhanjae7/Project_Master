const express = require('express')
const ejs = require('ejs') //js 코드를 html템플릿에 삽입하여 동적으로 웹페이지 생성
const app = express()
const path = require('path');
const port = 3000
var bodyParser = require('body-parser')
var session = require('express-session')

require('dotenv').config()

const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log("connected db")

// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/mypage', (req, res) => { //수정한 부분
  if(req.session.member == null){
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>")
  }else{
    const user_id = req.session.member.user_id;
    const sql = 'SELECT * FROM member WHERE user_id = ?';

    connection.query(sql, [user_id], (err, result) => {
      if (err) throw err;
      if (result.length === 0) {
        res.send("<script> alert('회원 정보를 찾을 수 없습니다'); location.href='/';</script>");
      } else {
        res.render('mypage', { member: result[0] });
      }
    });
  }
});

app.get('/mypage_re', (req, res) => { //수정한 부분
  if(req.session.member == null){
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>")
  } else {
  res.render('mypage_re')
  }
})

app.post('/mypageProc', (req, res) => {
  const user_id = req.session.member.user_id; //수정한 부분
  const nickname = req.body.nickname;
  const job = req.body.job;
  const affiliation = req.body.affiliation;
  const career = req.body.career;
  const introduce = req.body.introduce;
  const interest_stack = req.body.interest_stack;

  // 먼저 nickname 중복 확인
  var checkSql = 'SELECT * FROM member WHERE nickname = ? AND user_id != ?';
  connection.query(checkSql, [nickname,user_id], function (err, result) {
    if (err) throw err;

    if (result.length > 0) {
      res.send("<script> alert('이미 존재하는 닉네임입니다. 다른 닉네임을 선택해주세요.'); history.back();</script>");
    } else {
  var sql = `
    UPDATE member 
    SET 
      nickname = ?,
      job = ?, 
      affiliation = ?, 
      career = ?, 
      introduce = ?, 
      interest_stack = ? 
    WHERE 
      user_id = ?
  `;
  var values = [nickname, job, affiliation, career, introduce, interest_stack, user_id];

  connection.query(sql, values, function(err, result){
    if(err) throw err;
    console.log('자료 1개를 삽입하였습니다');
    res.send("<script> alert('저장되었습니다'); location.href='/mypage';</script>")
    });
    }
  });
});

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
      //res.send("로그인 성공한 후 페이지는 아직 안 만들었음");
    }
  })
})

app.get('/logout', (req, res) => {
  req.session.member = null;
  res.send("<script> alert('로그아웃 되었습니다'); location.href='/';</script>")

})

app.get('/join', (req, res) => {
  res.render('join')
})

app.post('/joinProc', (req, res) => {
  const { user_id, user_pw, user_name, user_phone, nickname } = req.body;

  // 먼저 user_id 중복 확인
  var checkSql = 'SELECT * FROM member WHERE user_id = ?';
  connection.query(checkSql, [user_id], function(err, result) {
    if (err) throw err;

    if (result.length > 0) {
      res.render('join', {
        user_id: user_id,
        user_pw: user_pw,
        user_name: user_name,
        user_phone: user_phone,
        nickname: nickname,
        error: '이미 존재하는 아이디입니다.'
      });
    } else {
      var insertSql = `INSERT INTO member (user_id, user_pw, user_name, user_phone, nickname) VALUES (?, ?, ?, ?, ?)`;
      var values = [user_id, user_pw, user_name, user_phone, nickname];

      connection.query(insertSql, values, function(err, result) {
        if (err) throw err;

        res.send("<script> alert('회원가입 성공하였습니다'); location.href='/';</script>");
      });
    }
  })
})



app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})
