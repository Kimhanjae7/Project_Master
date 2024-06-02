require('dotenv').config();  // 가장 위에 위치
const express = require('express');
const ejs = require('ejs');
const axios = require('axios');
const app = express();
const path = require('path');
const port = process.env.PORT || 8090;
const bodyParser = require('body-parser');
const session = require('express-session');

const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', './views'); // views라는 폴더안에 있는걸 가져온다

app.use(bodyParser.urlencoded({ extended: false }));

// Use the session middleware
app.use(session({ secret: 'yesung', cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));

app.use((req, res, next) => {
    res.locals.user_id = "";
    if (req.session.member) {
        res.locals.user_id = req.session.member.user_id;
    }
    next();
});

// 메인 페이지 라우팅
app.get('/', (req, res) => {
    // 페이지 번호 가져오기
    const page = parseInt(req.query.page) || 1;
    const perPage = 9; // 페이지당 데이터 개수
    const user_id = req.session.member ? req.session.member.user_id : 'user01'; // 기본 사용자 ID 설정

    // Flask 서버에 요청을 보내어 맞춤 추천 게시글 가져오기 (G1)
    axios.get('http://localhost:5004/get_matching_posts', { params: { user_id } })
        .then(response => {
            const recommendations = response.data;

            // 페이지에 해당하는 데이터 가져오는 쿼리 수정
            let offset = (page - 1) * perPage;
            let sql = `
            SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
            FROM project_info p
            JOIN member m ON p.user_id = m.user_id
            LIMIT ${perPage}
            OFFSET ${offset}`;

            connection.query(sql, (err, results) => {
                if (err) throw err;

                // 전체 데이터 개수 가져오기 (페이징 처리를 위해)
                let countSql = `SELECT COUNT(*) as count FROM project_info`;
                connection.query(countSql, (err, countResult) => {
                    if (err) throw err;
                    const totalCount = countResult[0].count;

                    // 전체 페이지 수 계산
                    const totalPages = Math.ceil(totalCount / perPage);

                    // EJS 템플릿 렌더링
                    res.render('index', { projects: results, totalPages, currentPage: page, recommendations: recommendations });
                });
            });
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            res.render('index', { projects: [], totalPages: 0, currentPage: 1, recommendations: [] });
        });
});

// 로그인 페이지 라우팅
app.get('/login', (req, res) => {
  res.render('login');
});

// 로그인 처리
app.post('/loginProc', (req, res) => {
  const user_id = req.body.user_id;
  const user_pw = req.body.user_pw;

  var sql = `SELECT * FROM member WHERE user_id = ? AND user_pw = ?`;
  var values = [user_id, user_pw];

  connection.query(sql, values, function(err, result) {
      if (err) {
          console.error('SQL error:', err);
          res.send("<script> alert('서버 오류가 발생했습니다. 나중에 다시 시도해주세요.'); location.href='/login';</script>");
          return;
      }

      if (result.length === 0) {
          res.send("<script> alert('존재하지 않는 아이디입니다.'); location.href='/login';</script>");
      } else {
          req.session.member = result[0];
          res.send("<script> location.href='/';</script>");
      }
  });
});

// 마이페이지 처리
app.post('/mypageProc', (req, res) => {
  const user_id = req.session.member.user_id;
  let nickname = req.body.nickname;
  let job = req.body.job;
  let affiliation = req.body.affiliation;
  let career = req.body.career;
  let introduce = req.body.introduce;
  let interest_stack = req.body.interest_stack;

  if (interest_stack && interest_stack !== null) {
    interest_stack = interest_stack.toString();
    interest_stack = interest_stack.replace(/'/g, '');
  }
  
  if (!nickname) {
    nickname = req.session.member.nickname;
  }

  if (!affiliation) {
    affiliation = req.session.member.affiliation;
  }

  if (!career) {
    career = req.session.member.career;
  }

  if (!introduce) {
    introduce = req.session.member.introduce;
  }

  // 먼저 nickname 중복 확인
  var checkSql = 'SELECT * FROM member WHERE nickname = ? AND user_id != ?';
  connection.query(checkSql, [nickname, user_id], function (err, result) {
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

      connection.query(sql, values, function(err, result) {
        if(err) throw err;
        console.log('자료 1개를 삽입하였습니다');
        res.send("<script> alert('마이페이지가 수정되었습니다.'); location.href='/mypage';</script>")
      });
    }
  });
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.member = null;
  res.send("<script> alert('로그아웃 되었습니다'); location.href='/';</script>")
});

// 회원가입 페이지 라우팅
app.get('/join', (req, res) => {
  res.render('join');
});

// 회원가입 처리
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
  });
});

// 게시판 페이지 라우팅
app.get('/board', (req, res) => {
  // 페이지 번호 가져오기
  const page = parseInt(req.query.page) || 1;
  const perPage = 9; // 페이지당 데이터 개수

  // 페이지에 해당하는 데이터 가져오는 쿼리 수정
  let offset = (page - 1) * perPage;
  let sql = `
  SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
  FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  LIMIT ${perPage}
  OFFSET ${offset}`;

  connection.query(sql, (err, results) => {
      if (err) throw err;

      // 전체 데이터 개수 가져오기 (페이징 처리를 위해)
      let countSql = `SELECT COUNT(*) as count FROM project_info`;
      connection.query(countSql, (err, countResult) => {
          if (err) throw err;
          const totalCount = countResult[0].count;

          // 전체 페이지 수 계산
          const totalPages = Math.ceil(totalCount / perPage);

          // EJS 템플릿 렌더링
          res.render('board', { projects: results, totalPages, currentPage: page });
      });
  });
});

// 프로젝트 등록 페이지 라우팅
app.get('/registration', (req, res) => {
  if(req.session.member == null){
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>")
  }else{
  res.render('registration');
  }
});

// 프로젝트 등록 처리
app.post('/registrationProc', (req, res) => {
  const user_id = req.session.member.user_id; // 현재 세션의 사용자 ID 가져오기
  const { category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail } = req.body;

  var insertSql = `INSERT INTO project_info (category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, date, user_id) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE(), ?)`;
  var values = [category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id];

  connection.query(insertSql, values, function (err, result) {
    if (err) throw err;
    res.send("<script> alert('게시글이 등록되었습니다'); location.href='/';</script>");
  });
});

// 프로젝트 상세 페이지 라우팅
app.get('/project/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;

  var selectSql = `SELECT * FROM project_info WHERE project_seq = ?`;

  connection.query(selectSql, [project_seq], function (err, result) {
      if (err) throw err;

      if (result.length > 0) {
          console.log(result);
          res.render('projectDetail', { project: result[0] });
      } else {
          console.log('No project found');
          res.send("<script> alert('게시물이 존재하지 않습니다'); location.href='/board';</script>");
      }
  });
});


app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
});
