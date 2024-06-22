//npm install dotenv
//npm install express
//npm install ejs
//npm install axios
//npm install body-parser
//npm install express-session
//npm install mysql2
//npm install fs
//npm install multer

/*
검색 종류

메인 페이지
카테고리 로직
마이 페이지
마이 페이지 로직
로그인
로그인 로직
회원가입
회원가입 로직
게시글
수락
거절
신청

*/

require('dotenv').config();  // 가장 위에 위치
const express = require('express');
const ejs = require('ejs');
const axios = require('axios');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const session = require('express-session');
const { exec } = require('child_process');

const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log("connected db")

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

const fs = require('fs');   
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
/*
// Flask 서버 실행 코드 수정
const flaskScriptPath = path.join(__dirname, 'flask_app.py');
console.log(`Attempting to start Flask server with script at: ${flaskScriptPath}`);

exec(`python ${flaskScriptPath} > flask_server.log 2>&1`, (err, stdout, stderr) => {
    if (err) {
        console.error(`Error executing Flask server: ${err}`);
        return;
    }
    console.log(`Flask server started successfully.`);
});
*/
// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', './views'); // views라는 폴더안에 있는걸 가져온다

app.use(bodyParser.urlencoded({ extended: false }));

// Use the session middleware
app.use(session({ secret: 'yesung', cookie: { maxAge: 24 * 60 * 60 * 1000 }, resave: true, saveUninitialized: true }));

app.use((req, res, next) => {
    res.locals.user_id = "";
    if (req.session.member) {
        res.locals.user_id = req.session.member.user_id;
    }
    next();
});

// 메인 페이지
app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 9;
  const user_id = req.session.member ? req.session.member.user_id : 'none';  // 세션에서 사용자 ID를 가져옴, 기본값은 null
  const offset = (page - 1) * perPage;

  let sql = `
  SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
  FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  WHERE p.status = 'active'
  LIMIT ${perPage}
  OFFSET ${offset}`;

  if (user_id) {
      // 추천 포스트를 가져오는 API 호출
      axios.get('http://localhost:2010/get_matching_posts', { params: { user_id } })
          .then(response => {
              const recommendations = response.data;
              console.log(recommendations)
              connection.query(sql, (err, results) => {
                  if (err) throw err;

                  let countSql = `SELECT COUNT(*) as count FROM project_info WHERE status = 'active'`;
                  connection.query(countSql, (err, countResult) => {
                      if (err) throw err;
                      const totalCount = countResult[0].count;
                      const totalPages = Math.ceil(totalCount / perPage);

                      res.render('index', { projects: results, totalPages, currentPage: page, recommendations: recommendations });
                  });
              });
          })
          .catch(error => {
              console.error('Error fetching recommendations:', error);
              res.render('index', { projects: [], totalPages: 0, currentPage: 1, recommendations: [] });
          });
  } else {
      // 세션에 사용자 ID가 없는 경우 추천 프로그램을 표시하지 않음
      connection.query(sql, (err, results) => {
          if (err) throw err;

          let countSql = `SELECT COUNT(*) as count FROM project_info WHERE status = 'active'`;
          connection.query(countSql, (err, countResult) => {
              if (err) throw err;
              const totalCount = countResult[0].count;
              const totalPages = Math.ceil(totalCount / perPage);

              res.render('index', { projects: results, totalPages, currentPage: page, recommendations: [] });
          });
      });
  }
});





// ------------------------- 인기순 -------------------------------
app.get('/get_popular_projects', (req, res) => {
  // 페이지 번호 가져오기
  const page = parseInt(req.query.page) || 1;
  const perPage = 9; // 페이지당 데이터 개수
  let offset = (page - 1) * perPage;

  // 조회수에 따라 프로젝트 정렬
  let sql = `
  SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname, p.view_count
  FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  ORDER BY p.view_count DESC, p.project_seq ASC
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

          // JSON 데이터로 응답
          res.json({ projects: results, totalPages, currentPage: page });
      });
  });
});

// ------------------------- 최신순 -------------------------------
app.get('/get_recent_projects', (req, res) => {
  // 페이지 번호 가져오기
  const page = parseInt(req.query.page) || 1;
  const perPage = 9; // 페이지당 데이터 개수
  let offset = (page - 1) * perPage;

  // 최신순으로 정렬된 데이터 가져오는 쿼리
  let sql = `
  SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
  FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  ORDER BY p.date DESC
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

          // JSON 데이터로 응답
          res.json({ projects: results, totalPages, currentPage: page });
      });
  });
});

// 카테고리 로직
app.get('/filter_projects', (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = 9; // 페이지당 데이터 개수
  let offset = (page - 1) * perPage;

  const { category, skill_stack, role, keyword } = req.query;
  let sql = `SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
             FROM project_info p
             JOIN member m ON p.user_id = m.user_id
             WHERE p.status = 'active'`;

  let countsql = `SELECT COUNT(*) as count FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  WHERE p.status = 'active'`;

  if (category && category !== "카테고리") {
      sql += ` AND p.category = '${category}'`;
      countsql += ` AND p.category = '${category}'`;
  }

  if (skill_stack && skill_stack !== "기술스택") {
      sql += ` AND p.teck_stack LIKE '%${skill_stack}%'`;
      countsql += ` AND p.teck_stack LIKE '%${skill_stack}%'`;
  }

  if (role && role !== "직무") {
      sql += ` AND p.position = '${role}'`;
      countsql += ` AND p.position = '${role}'`;
  }

  if (keyword) {
    if(category && category == "카테고리" && skill_stack && skill_stack == "기술스택" && role && role == "직무" && keyword) {
      sql += `
      AND (
        category LIKE '%${keyword}%' OR mem_number LIKE '%${keyword}%' OR way LIKE '%${keyword}%' OR period LIKE '%${keyword}%' OR 
        teck_stack LIKE '%${keyword}%' OR deadline LIKE '%${keyword}%' OR position LIKE '%${keyword}%' OR 
        contact LIKE '%${keyword}%' OR introduce_title LIKE '%${keyword}%' OR introduce_detail LIKE '%${keyword}%' )`;
      countsql += `
        AND (
        category LIKE '%${keyword}%' OR mem_number LIKE '%${keyword}%' OR way LIKE '%${keyword}%' OR period LIKE '%${keyword}%' OR 
        teck_stack LIKE '%${keyword}%' OR deadline LIKE '%${keyword}%' OR position LIKE '%${keyword}%' OR 
        contact LIKE '%${keyword}%' OR introduce_title LIKE '%${keyword}%' OR introduce_detail LIKE '%${keyword}%' )`;
    } else {
      sql += ` AND (p.introduce_title LIKE '%${keyword}%' OR p.introduce_detail LIKE '%${keyword}%')`;
      countsql += ` AND (p.introduce_title LIKE '%${keyword}%' OR p.introduce_detail LIKE '%${keyword}%')`;
    }
  }

  connection.query(countsql, (err, countResult) => {
    if (err) {
      console.error('Error executing count query:', err);
      call([], 0);
      return;
    }
    const totalCount = countResult[0].count;
    const totalPages = Math.ceil(totalCount / perPage);

    sql += ` LIMIT ${perPage} OFFSET ${offset}`;

    console.log(`SQL Query: ${sql}`); // 쿼리 확인용 로그

    connection.query(sql, (err, results) => {
      if (err) throw err;
      console.log(`Query Results: ${results}`); // 결과 확인용 로그
      res.json({ results, totalPages });
    });
  });
});




// 마이 페이지
app.get('/mypage', (req, res) => { //수정한 부분
  if(req.session.member == null){
    res.render('popup', {
      message: '로그인하고 이용해주세요.', // 표시할 메시지
      redirectPath: '/login' // 확인을 눌렀을 때 이동할 경로
  });
  }else{
    const user_id = req.session.member.user_id;
    const sql = 'SELECT * FROM member WHERE user_id = ?';

    connection.query(sql, [user_id], (err, result) => {
      if (err) throw err;
      if (result.length === 0) {
        res.render('popup', {
          message: '회원 정보를 찾을 수 없습니다.',
          redirectPath: '/' 
      });
      } else {
        const member = result[0];
        // 프로필 이미지를 Base64로 인코딩하여 전달
        if (member.profile_pic) { // 수정된 부분 시작
          const base64Image = Buffer.from(member.profile_pic).toString('base64');
          member.profile_pic = base64Image;
        } // 수정된 부분 끝
        res.render('mypage', { member });
      }
    });
  }
});

// 마이 페이지 로직
app.post('/mypageProc', upload.single('profile_pic'), (req, res) => {
  const user_id = req.session.member.user_id; // 수정된 부분: 세션에서 user_id 가져오기
  let nickname = req.body.nickname;
  let job = req.body.job;
  let affiliation = req.body.affiliation;
  let career = req.body.career;
  let introduce = req.body.introduce;
  let interest_stack = req.body.interest_stack;
  let profile_pic = req.file ? req.file.buffer : null; // 수정된 부분: multer를 사용하여 파일 버퍼 가져오기

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
      res.render('popup', {
        message: '이미 존재하는 닉네임입니다. 다른 닉네임을 선택해주세요.',
        redirectPath: 'back' 
    }); 
    } else {
      var sql = `
        UPDATE member 
        SET 
          nickname = ?,
          job = ?, 
          affiliation = ?, 
          career = ?, 
          introduce = ?, 
          interest_stack = ?`;
      
      var values = [nickname, job, affiliation, career, introduce, interest_stack];

      if (profile_pic) {
        sql += `, profile_pic = ?`; // 수정된 부분: profile_pic이 존재할 경우 쿼리문에 추가
        values.push(profile_pic);
      }

      sql += ` WHERE user_id = ?`; // 수정된 부분: WHERE 절이 두 번 들어가지 않도록 조정
      values.push(user_id);

      connection.query(sql, values, function(err, result) {
        if (err) throw err;
        console.log('자료 1개를 삽입하였습니다');
        res.render('popup', {
          message: '마이페이지가 수정되었습니다.',
          redirectPath: '/mypage' 
      });
      });
    }
  });
});

// 로그인
app.get('/login', (req, res) => {
  res.render('login')
})

// 로그인 로직 
app.post('/loginProc', (req, res) => {
  const user_id = req.body.user_id;
  const user_pw = req.body.user_pw;

  var sql = `select * from member where user_id=? and user_pw=? `
  var values = [user_id, user_pw]

  connection.query(sql, values, function(err, result){
    if(err) throw err;
    if(result.length==0){
      res.render('popup', {
        message: '존재하지 않는 아이디입니다.',
        redirectPath: '/login' 
    });
    } else{
      req.session.member = result[0];
      res.send("<script> location.href='/';</script>")
    }
  })
})

// 로그아웃
app.get('/logout', (req, res) => {
  req.session.member = null;
  res.render('popup', {
    message: '로그아웃 되었습니다.',
    redirectPath: '/' 
});
})

// 회원가입
app.get('/join', (req, res) => {
  res.render('join')
})

// 회원가입 로직
app.post('/joinProc', (req, res) => {
  const { user_id, user_pw, user_name, user_phone, nickname } = req.body;

  // 이미지 파일을 읽어서 바이너리 데이터로 변환
  //---수정
  const imagePath = 'Users/재희/Desktop/project/public/images/c.png';
  const profile_pic = fs.readFileSync(imagePath);

  // 먼저 user_id 중복 확인
  var checkSql = 'SELECT * FROM member WHERE user_id = ? OR nickname = ?';
  connection.query(checkSql, [user_id, nickname], function(err, result) {
    if (err) throw err;

    if (result.length > 0) {
      let errorMessage = '이미 존재하는 ';

      if (result.some(row => row.user_id === user_id)) {
          errorMessage += '아이디';
      }
      if (result.some(row => row.nickname === nickname)) {
          if (errorMessage !== '이미 존재하는 ') {
              errorMessage += ' 및 ';
          }
          errorMessage += '닉네임';
      }
      errorMessage += '입니다.';
      
      res.render('popup', {
        message: errorMessage,
        redirectPath: '/join' 
    });
    } else {
      var insertSql = `INSERT INTO member (user_id, user_pw, user_name, user_phone, nickname, profile_pic) VALUES (?, ?, ?, ?, ?, ?)`;
      var values = [user_id, user_pw, user_name, user_phone, nickname, profile_pic];

      connection.query(insertSql, values, function(err, result) {
        if (err) throw err;

        res.render('popup', {
          message: '회원가입에 성공하였습니다.',
          redirectPath: '/login' 
      });
      });
    }
  })
})


// 모집글
app.get('/registration', (req, res) => {
  if(req.session.member == null){
    res.render('popup', {
      message: '로그인하고 접근해주세요',
      redirectPath: '/' 
  });
  }else{
  res.render('registration')
  }
})

// 모집글 로직
app.post('/registrationProc', (req, res) => {
  // 현재 세션의 사용자 ID 가져오기
  const user_id = req.session.member ? req.session.member.user_id : null;

  // 사용자 ID가 없는 경우 처리
  if (!user_id) {
    return res.render('popup', {
      message: '사용자 ID를 찾을 수 없습니다. 다시 로그인 해주세요.',
      redirectPath: '/login' 
  });
  }

  // 폼 데이터 가져오기
  const { category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail } = req.body;

  // SQL 삽입문
  var insertSql = `
    INSERT INTO project_info (category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, date, user_id, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE(), ?, 'active')
  `;
  var values = [category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id];

  // 데이터베이스 쿼리 실행
  connection.query(insertSql, values, function (err, result) {
    if (err) {
      console.error('Database query error:', err);
      return res.render('popup', {
        message: '게시글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.',
        redirectPath: '/registration' 
    });
    }
    
    // 삽입된 프로젝트의 ID 가져오기
    const project_seq = result.insertId;

    // participants 테이블에 데이터 삽입
    const participantSql = `
      INSERT INTO project_participants (user_id, project_seq, status, position, check_writer)
      VALUES (?, ?, '작성자', '미정', 'Writer')
    `;
    const participantValues = [user_id, project_seq];

    // participants 테이블에 쿼리 실행
    connection.query(participantSql, participantValues, function (err, participantResult) {
      if (err) {
        console.error('Database query error:', err);
        return res.render('popup', {
          message: '게시글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.',
          redirectPath: '/registration' 
      });
      }
      
      // 등록 성공 메시지 출력 및 리다이렉트
      res.render('popup', {
        message: '게시글이 등록되었습니다.',
        redirectPath: '/' 
    });
    });
  });
});

// 게시글
app.get('/project/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;
  const user_id = req.session.member ? req.session.member.user_id : null;

  const selectSql = `SELECT * FROM project_info WHERE project_seq = ?`;

  connection.query(selectSql, [project_seq], function(err, result) {
    if (err) throw err;

    if (result.length > 0) {
      const project = result[0];
      const isAuthor = user_id === project.user_id;

      if (isAuthor) {
        const participantsSql = `SELECT user_id, position, status FROM project_participants WHERE project_seq = ? and check_writer = 'Participant'`;

        connection.query(participantsSql, [project_seq], function(err, participantsResult) {
          if (err) throw err;
          //작성자
          res.render('post_view_write', { projects: project, isAuthor: true, participants: participantsResult });
        });
      } else {
        //작성자 아닌 사람
        res.render('post_view_see', { projects: project, isAuthor: false, participants: [] });
      }
    } else {
      console.log('No project found');
      res.render('popup', {
        message: '게시물이 존재하지 않습니다.',
        redirectPath: '/' 
    });
    }
  });
});

app.get('/see_project', (req, res) => {
  if (req.session.member == null) {
    res.render('popup', {
      message: '로그인하고 접근해주세요',
      redirectPath: '/login' 
  });
    return;
  }

  const user_id = req.session.member.user_id;

  const projectSql = 'SELECT introduce_title, category, deadline, position, teck_stack, project_seq FROM project_info WHERE user_id = ?';
  
  const memberSql = 'SELECT nickname, profile_pic FROM member WHERE user_id = ?';

  connection.query(projectSql, [user_id], (err, projectResults) => {
    if (err) throw err;
    
    connection.query(memberSql, [user_id], (err, memberResults) => {
      if (err) throw err;
      
      const memberInfo = memberResults[0];
      
      // 새로운 기능 추가: participants 테이블과 project_info 테이블을 조인하여 데이터 조회
      const participantProjectsSql = `
        SELECT pi.introduce_title, pi.category, pi.deadline, pi.position, pi.teck_stack, pi.project_seq, m.nickname, m.profile_pic
        FROM project_participants p
        INNER JOIN project_info pi ON p.project_seq = pi.project_seq
        INNER JOIN member m ON pi.user_id = m.user_id
        WHERE p.user_id = ? AND pi.status = 'hidden'
      `;
      
      connection.query(participantProjectsSql, [user_id], (err, participantResults) => {
        if (err) {
          console.error('Database query error:', err);
          res.render('popup', {
            message: '프로젝트 정보를 가져오는 중 오류가 발생했습니다.',
            redirectPath: '/' 
        });
          return;
        }

        // 새로운 기능 추가: 지원한 프로젝트 데이터 조회
        const appliedProjectsSql = `
          SELECT pi.introduce_title, pi.category, pi.deadline, pi.position, pi.teck_stack, pi.project_seq, m.nickname, m.profile_pic
          FROM project_participants p
          INNER JOIN project_info pi ON p.project_seq = pi.project_seq
          INNER JOIN member m ON pi.user_id = m.user_id
          WHERE p.user_id = ? AND p.status = '신청'
        `;

        connection.query(appliedProjectsSql, [user_id], (err, appliedProjects) => {
          if (err) {
            console.error('Database query error:', err);
            res.render('popup', {
              message: '지원한 프로젝트 정보를 가져오는 중 오류가 발생했습니다.',
              redirectPath: '/' 
          });
            return;
          }

          // 데이터를 렌더링할 템플릿에 전달
          res.render('see_project', { 
            posts: projectResults,
            nickname: memberInfo.nickname,
            profile_pic: memberInfo.profile_pic,
            participantProjects: participantResults,  // 추가된 participantProjects 데이터 추가
            appliedProjects: appliedProjects         // 추가된 appliedProjects 데이터 추가
          });
        });
      });
    });
  });
});

// 수락
app.post('/accept', (req, res) => {
  const { user_id, project_seq } = req.body;

  const updateSql = `UPDATE project_participants SET status = '수락' WHERE user_id = ? AND project_seq = ?`;

  connection.query(updateSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      res.render('popup', {
        message: '수락 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        redirectPath: 'back' 
    });
    }
    res.render('popup', {
      message: '참가 신청이 수락되었습니다.',
      redirectPath: '/project/' + project_seq 
  }); 
  });
});

// 거절
app.post('/reject', (req, res) => {
  const { user_id, project_seq } = req.body;

  const deleteSql = `DELETE FROM project_participants WHERE user_id = ? AND project_seq = ?`;

  connection.query(deleteSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      res.render('popup', {
        message: '거절 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        redirectPath: 'back' 
    });
    }
    res.render('popup', {
      message: '참가 신청이 거절되었습니다..',
      redirectPath: '/project' + project_seq 
  });
  });
});

// 신청
app.post('/apply', async (req, res) => {
  // 현재 세션의 사용자 ID 가져오기
  const user_id = req.session.member ? req.session.member.user_id : null;

  // 사용자 ID가 없는 경우 처리
  if (!user_id) {
    res.render('popup', {
      message: '사용자 ID를 찾을 수 없습니다. 다시 로그인 해주세요.',
      redirectPath: '/login' 
  });
  }

  // 폼 데이터 가져오기
  const { project_seq, position } = req.body;

  // 현재 게시글의 작성자 정보 가져오기
  connection.query('SELECT user_id FROM project_info WHERE project_seq = ?', [project_seq], (err, result) => {
    if (err) {
      console.error('Database query error:', error);
      res.render('popup', {
        message: '신청 중 오류가 발생했습니다. 다시 시도해 주세요.',
        redirectPath: '/' 
    });
    }

    // 게시글 작성자와 로그인한 사용자의 user_id 비교하여 신청 가능 여부 확인
    const author_id = result[0].user_id;
    if (user_id === author_id) {
      res.render('popup', {
        message: '본인 게시글에는 신청할 수 없습니다.',
        redirectPath: 'back' 
    });
    }

    // SQL 삽입문
    const insertSql = `
      INSERT INTO project_participants (project_seq, user_id , status, position, check_writer) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [project_seq, user_id, '신청', position, 'Participant']; // status의 값으로 '신청'을 사용

    // 데이터베이스 쿼리 실행
    connection.query(insertSql, values, (err, result) => {
      if (err) {
        console.error('Database query error:', error);
        res.render('popup', {
          message: '신청 중 오류가 발생했습니다. 다시 시도해 주세요.',
          redirectPath: '/' 
      });
      }
      
      res.render('popup', {
        message: '신청이 완료되었습니다.',
        redirectPath: '/' 
    });
    });
  });
});


// 게시물 삭제
app.post('/delete/:project_seq', (req, res) => {
  const projectSeq = req.params.project_seq;

  connection.query('DELETE FROM project_info WHERE project_seq = ?', [projectSeq], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('게시물을 삭제하는 중 오류가 발생했습니다.');
    }
    res.render('popup', {
      message: '게시글 삭제가 완료되었습니다.',
      redirectPath: '/' 
  });
  });
});

app.post('/edit/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;
  const user_id = req.session.member ? req.session.member.user_id : null;

  if(req.session.member == null){
    res.render('popup', {
      message: '로그인하고 접근해주세요.',
      redirectPath: '/login' 
  });
  }else{
  const selectSql = `SELECT * FROM project_info WHERE project_seq = ?`;

  connection.query(selectSql, [project_seq], function(err, result) {
    if (err) throw err;

    if (result.length > 0) {
      const project = result[0];
      const isAuthor = user_id === project.user_id;

      if (isAuthor) {
        const participantsSql = `SELECT user_id, position, status FROM project_participants WHERE project_seq = ?`;

        connection.query(participantsSql, [project_seq], function(err, participantsResult) {
          if (err) throw err;
          //작성자
          res.render('post_edit', { projects: project, isAuthor: true, participants: participantsResult });
        });
      } else {
        //작성자 아닌 사람
        res.render('popup', {
          message: '작성자가 아닙니다.',
          redirectPath: 'back' 
      });
      }
    } else {
      console.log('No project found');
      res.render('popup', {
        message: '게시글이 존재하지 않습니다.',
        redirectPath: '/' 
    });
    }
  });
}
});

app.post('/editProc/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;
  let { category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail } = req.body

  const getExistingSql = `SELECT * FROM project_info WHERE project_seq = ?`;
  connection.query(getExistingSql, [project_seq], function (err, results) {
    if (err) throw err;
    if (results.length === 0) {
      return res.render('popup', {
        message: '해당 게시글을 찾을 수 없습니다.',
        redirectPath: 'back' 
    });
    }
  
  const existingProject = results[0];

  const newCategory = category !== '' ? category : existingProject.category;
  const newMemNumber = mem_number !== '' ? mem_number : existingProject.mem_number;
  const newWay = way !== '' ? way : existingProject.way;
  const newPeriod = period !== '' ? period : existingProject.period;
  const newTeckStack = teck_stack !== '' ? teck_stack : existingProject.teck_stack;
  const newDeadline = deadline !== '' ? deadline : existingProject.deadline;
  const newPosition = position !== '' ? position : existingProject.position;
  const newContact = contact !== '' ? contact : existingProject.contact;
  const newIntroduceTitle = introduce_title !== '' ? introduce_title : existingProject.introduce_title;
  const newIntroduceDetail = introduce_detail !== '' ? introduce_detail : existingProject.introduce_detail;


  var updateSql = `UPDATE project_info
   SET 
   category = ?,  
   mem_number = ?, 
   way = ?, 
   period = ?, 
   teck_stack = ?, 
   deadline = ?, 
   position = ?, 
   contact = ?, 
   introduce_title = ?, 
   introduce_detail = ?
   WHERE project_seq = ?`
   var values = [newCategory, newMemNumber, newWay, newPeriod, newTeckStack, newDeadline, newPosition, newContact, newIntroduceTitle, newIntroduceDetail, project_seq];
   console.log(values);
   connection.query(updateSql, values, function (err, result) {
    if (err) throw err
    if (result.length === 0) {
      return res.render('popup', {
        message: '수정을 실패했습니다. 다시 시도해주세요.',
        redirectPath: 'back' 
    });
    }
    res.render('popup', {
      message: '게시글이 수정되었습니다.',
      redirectPath: '/project/' + project_seq 
  });
  });
});
});

// 추가
app.post('/start_project', (req, res) => {
  const projectSeq = req.body.project_seq;
  const updateSql = 'UPDATE project_info SET status = ? WHERE project_seq = ?';
  connection.query(updateSql, ['hidden', projectSeq], (err, result) => {
      if (err) throw err;
      const deleteSql = `DELETE FROM project_participants WHERE status = '신청' AND project_seq = ?`;

      connection.query(deleteSql,[projectSeq],(err, result)=> {
        if (err) throw err;
        res.render('popup', {
          message: '프로젝트가 시작 되었습니다!',
          redirectPath: '/project/' + projectSeq
      });
      })
  });
});

//게시글 종료
app.post('/end_project', (req, res) => {
  const project_seq = req.body.project_seq;
  res.render('popup', {
    message: '프로젝트가 종료 되었습니다. 평점을 남겨주세요!',
    redirectPath: '/grade?project_seq=' + project_seq + '&introduce_title=' +  encodeURIComponent(req.body.introduce_title)
});
});

//------------------------- 평점 -------------------------------//
app.get('/grade', (req, res) => {
  const userId = req.session.member ? req.session.member.user_id : null;
  const projectSeq = req.query.project_seq;
  const introduceTitle = req.query.introduce_title;

  if (!userId) {
    res.render('popup', {
      message: '로그인하고 접근해주세요',
      redirectPath: '/login' 
  });
    return;
  }

  // projectSeq가 없으면 메인 페이지로 리다이렉트
  if (!projectSeq) {
    res.render('popup', {
      message: '프로젝트 정보를 찾을 수 없습니다.',
      redirectPath: '/'
  });
    return;
  }

  const sql = `
    SELECT p.introduce_title, p.project_seq, pp.user_id, m.nickname, pp.position
    FROM project_info p 
    JOIN project_participants pp ON p.project_seq = pp.project_seq
    JOIN member m ON pp.user_id = m.user_id
    WHERE p.project_seq = ?
  `;

  connection.query(sql, [projectSeq], (err, results) => {
    if (err) {
      console.error('Error fetching project info:', err);
      res.status(500).send('Database error');
      return;
    }

    if (results.length === 0) {
      res.render('popup', {
        message: '프로젝트 정보를 찾을 수 없습니다.',
        redirectPath: '/' 
    });
      return;
    }

    const introduceTitle = results[0].introduce_title;
    const participants = results.map(row => ({
      user_id: row.user_id,
      nickname: row.nickname,
      position: row.position
    }));

    res.render('grade', { introduceTitle, participants, user_id: userId, project_seq: projectSeq });
  });
});
// Handle form submission for grading participants
app.post('/grade', (req, res) => {
  const userId = req.session.member ? req.session.member.user_id : null;
  if (!userId) {
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/login';</script>");
    return;
  }

  const projectSeq = req.body.project_seq;
  const introduceTitle = req.body.introduce_title;

  if (!projectSeq) {
    res.send("Invalid input: project_seq is missing");
    return;
  }

  const userIds = Array.isArray(req.body['user_ids[]']) ? req.body['user_ids[]'] : [req.body['user_ids[]']];
  const jobRoles = Array.isArray(req.body['job_roles[]']) ? req.body['job_roles[]'] : [req.body['job_roles[]']];
  const grades = {};

  userIds.forEach(uid => {
    grades[uid] = req.body[`grades[${uid}]`];
  });

  if (userIds.length !== jobRoles.length || userIds.length !== Object.keys(grades).length) {
    res.send("Invalid input: Mismatched lengths of user IDs, job roles, or grades");
    return;
  }

  const gradeProcedures = userIds.map((uid, i) => {
    const jobRole = jobRoles[i];
    const grade = parseFloat(grades[uid]);

    if (!uid || !jobRole || isNaN(grade)) {
      return Promise.reject(`Invalid input: Missing or invalid data for user ID ${uid}, job role ${jobRole}, or grade ${grade}`);
    }

    return new Promise((resolve, reject) => {
      connection.query('CALL grade_proc(?, ?, ?, @output_grade)', [uid, jobRole, grade], (err) => {
        if (err) return reject(err);

        resolve();
      });
    });
  });

  // Check if the current user is the writer
  const checkWriterSql = `SELECT check_writer FROM project_participants WHERE project_seq = ? AND user_id = ?`;
  connection.query(checkWriterSql, [projectSeq, userId], (err, results) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }

    if (results.length > 0 && results[0].check_writer === 'Writer') {
      // Update role count for the writer themselves
      const userRoleSql = `SELECT user_id, position FROM project_participants WHERE project_seq = ?`;
      connection.query(userRoleSql, [projectSeq], (err, userRoleResults) => {
        if (err) {
          res.status(500).send('Database error');
          return;
        }

        // Array to store promises for updating counts
        const updateCountPromises = [];

        // Update role count for the writer
        const writerRole = userRoleResults.find(item => item.user_id === userId)?.position;
        if (writerRole) {
          updateCountPromises.push(new Promise((resolve, reject) => {
            connection.query('CALL update_role_counts(?, ?)', [userId, writerRole], (err) => {
              if (err) return reject(err);
              resolve();
            });
          }));
        }

        // Update role counts for other participants
        userRoleResults.forEach(user => {
          if (user.user_id !== userId) {
            updateCountPromises.push(new Promise((resolve, reject) => {
              connection.query('CALL update_role_counts(?, ?)', [user.user_id, user.position], (err) => {
                if (err) return reject(err);
                resolve();
              });
            }));
          }
        });

        // Execute all update count promises
        Promise.all(updateCountPromises)
          .then(() => {
            // Delete alarms for the current user
            const deleteAlarmSql = `DELETE FROM alarms WHERE user_id = ? AND project_seq = ?`;
            connection.query(deleteAlarmSql, [userId, projectSeq], (err) => {
              if (err) {
                res.status(500).send('Database error');
                return;
              }

              // Send notifications to all participants
              const notifySql = `SELECT user_id FROM project_participants WHERE project_seq = ? AND user_id != ?`;
              connection.query(notifySql, [projectSeq, userId], (err, notifyResults) => {
                if (err) {
                  res.status(500).send('Database error');
                  return;
                }

                const notifications = notifyResults.map(row => new Promise((resolve, reject) => {
                  const insertAlarmSql = `INSERT INTO alarms (user_id, message, project_seq) VALUES (?, ?, ?)`;
                  const message = `프로젝트 "${introduceTitle}" 종료되었습니다. 평점을 남겨주세요.`;
                  connection.query(insertAlarmSql, [row.user_id, message, projectSeq], (err) => {
                    if (err) return reject(err);
                    resolve();
                  });
                }));

                Promise.all(notifications)
                  .then(() => Promise.all(gradeProcedures))
                  .then(() => {
                    res.render('popup', {
                      message: '성공적으로 평점을 부여하였고\n 알림을 전송하였습니다!',
                      redirectPath: '/'
                    });
                  })
                  .catch(err => {
                    res.render('popup', {
                      message: '평점 부여 또는 알림 전송 중 오류가 발생했습니다',
                      redirectPath: '/'
                    });
                  });
              });
            });
          })
          .catch(err => {
            res.status(500).send('Database error');
          });
      });
    } else {
      Promise.all(gradeProcedures)
        .then(() => {
          // Delete alarms for the current user
          const deleteAlarmSql = `DELETE FROM alarms WHERE user_id = ? AND project_seq = ?`;
          connection.query(deleteAlarmSql, [userId, projectSeq], (err) => {
            if (err) {
              res.status(500).send('Database error');
              return;
            }

            res.render('popup', {
              message: '성공적으로 평점을 부여하였습니다!',
              redirectPath: '/'
            });
          });
        })
        .catch(err => {
          res.render('popup', {
            message: '평점 부여 중 오류가 발생했습니다.',
            redirectPath: '/login'
          });
        });
    }
  });
});

//--------------------------------------------------------//

//------------------------- 알람 -------------------------------//
app.get('/alarms', (req, res) => {
  if (req.session.member == null) {
    res.render('popup', {
      message: '로그인하고 접근해주세요',
      redirectPath: '/login'
  });
  } else {
    const userId = req.session.member.user_id;
    const sql = `
      SELECT DISTINCT a.message, a.project_seq, p.introduce_title
      FROM alarms a
      JOIN project_info p ON a.project_seq = p.project_seq
      WHERE a.user_id = ?
    `;

    console.log(`Executing SQL: ${sql} with userId: ${userId}`); // SQL 쿼리 로그

    connection.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching alarms:', err);
        res.status(500).send('Database error');
        return;
      }

      console.log('Fetched alarms:', results); // 결과 로그

      const alarms = results.map(row => ({
        message: row.message,
        project_seq: row.project_seq,
        introduce_title: row.introduce_title
      }));

      res.render('alarm', { alarms });
    });
  }
});


//--------------------------------------------------------//
app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})
