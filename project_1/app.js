//npm install express
//npm install ejs
//npm install body-parser
//npm install express-session
//npm install dotnev
//npm install mysql2
//----수정
//npm install multer

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

// ----수정
const fs = require('fs');   
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

//-----------------------search추가---------------------------
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

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      callback([]);
      return;
    }
    callback(results);
  });
}
//----------------------------------------------------------

//localhost:3000/ 를 입력하면 나온다
//추가
app.get('/', (req, res) => {
  // 페이지 번호 가져오기
  const page = parseInt(req.query.page) || 1;
  const perPage = 9; // 페이지당 데이터 개수

  // 페이지에 해당하는 데이터 가져오는 쿼리 수정
  let offset = (page - 1) * perPage;
  let sql = `
    SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
    FROM project_info p
    JOIN member m ON p.user_id = m.user_id
    WHERE p.status = 'active'
    LIMIT ${perPage}
    OFFSET ${offset}`;

  connection.query(sql, (err, results) => {
    if (err) throw err;

    // 전체 데이터 개수 가져오기 (페이징 처리를 위해)
    let countSql = `SELECT COUNT(*) as count FROM project_info WHERE status = 'active'`;
    connection.query(countSql, (err, countResult) => {
      if (err) throw err;
      const totalCount = countResult[0].count;

      // 전체 페이지 수 계산
      const totalPages = Math.ceil(totalCount / perPage);

      // EJS 템플릿 렌더링
      res.render('index', { projects: results, totalPages, currentPage: page });
    });
  });
});



app.post('/', (req, res) => {
  const keyword = req.body.keyword;
  if (keyword) {
      const keywords = keyword.split(',');
      searchData(keywords, (results) => {
          res.json({ projects: results });
      });
  } else {
      res.redirect('/');
  }
});

app.post('/searchCategory', (req, res) => {
  const { category, skill_stack, roll } = req.body;

  let sql = 'SELECT * FROM project_info WHERE 1=1';
  let values = [];

  if (category) {
    sql += ' AND category = ?';
    values.push(category);
  }

  if (skill_stack) {
    sql += ' AND teck_stack LIKE ?';
    values.push(`%${skill_stack}%`);
  }

  if (roll) {
    sql += ' AND position LIKE ?';
    values.push(`%${roll}%`);
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Database query error' });
      return;
    }
    res.json({ projects: results });
  });
});


//----------------------------------------------------


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

//----수정
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
        res.send("<script> alert('마이페이지가 수정되었습니다.'); location.href='/mypage';</script>");
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
      res.send("<script> location.href='/';</script>")
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

  // 이미지 파일을 읽어서 바이너리 데이터로 변환
  //---수정
  const imagePath = '/Users/sung_a__/workspace/VsCode/project_1/public/images/c.png';
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
      
      res.send("<script> alert('" + errorMessage + "'); location.href='/join';</script>");
      
    } else {
      var insertSql = `INSERT INTO member (user_id, user_pw, user_name, user_phone, nickname, profile_pic) VALUES (?, ?, ?, ?, ?, ?)`;
      var values = [user_id, user_pw, user_name, user_phone, nickname, profile_pic];

      connection.query(insertSql, values, function(err, result) {
        if (err) throw err;

        res.send("<script> alert('회원가입 성공하였습니다'); location.href='/';</script>");
      });
    }
  })
})


//추가
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
})



//추가
app.get('/registration', (req, res) => {
  if(req.session.member == null){
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>")
  }else{
  res.render('registration')
  }
})

//추가
/*
app.post('/registrationProc', (req, res) => {

  const user_id = req.session.member.user_id; // 현재 세션의 사용자 ID 가져오기
  const { category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail } = req.body

  var insertSql = `INSERT INTO project_info (category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, date, user_id) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE(), ?)`
  var values = [category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id]

  connection.query(insertSql, values, function (err, result) {
    if (err) throw err
    res.send("<script> alert('게시글이 등록되었습니다'); location.href='/';</script>")
  })
})
*/
//수정
app.post('/registrationProc', (req, res) => {
  // 현재 세션의 사용자 ID 가져오기
  const user_id = req.session.member ? req.session.member.user_id : null;

  // 사용자 ID가 없는 경우 처리
  if (!user_id) {
    return res.send("<script> alert('사용자 ID를 찾을 수 없습니다. 다시 로그인 해주세요.'); location.href='/login';</script>");
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
      return res.send("<script> alert('게시글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/registration';</script>");
    }
    
    // 삽입된 프로젝트의 ID 가져오기
    const project_seq = result.insertId;

    // participants 테이블에 데이터 삽입
    const participantSql = `
      INSERT INTO participants (user_id, project_seq, status, position)
      VALUES (?, ?, '작성자', '미정')
    `;
    const participantValues = [user_id, project_seq];

    // participants 테이블에 쿼리 실행
    connection.query(participantSql, participantValues, function (err, participantResult) {
      if (err) {
        console.error('Database query error:', err);
        return res.send("<script> alert('게시글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/registration';</script>");
      }
      
      // 등록 성공 메시지 출력 및 리다이렉트
      res.send("<script> alert('게시글이 등록되었습니다'); location.href='/';</script>");
    });
  });
});




//추가 (프로젝트 제목 클릭하면 그 게시물에 대한 페이지 열림)
//----수정
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
        const participantsSql = `SELECT user_id, position, status FROM participants WHERE project_seq = ?`;

        connection.query(participantsSql, [project_seq], function(err, participantsResult) {
          if (err) throw err;

          res.render('projectDetail', { projects: project, isAuthor: true, participants: participantsResult });
        });
      } else {
        res.render('projectDetail', { projects: project, isAuthor: false, participants: [] });
      }
    } else {
      console.log('No project found');
      res.send("<script> alert('게시물이 존재하지 않습니다'); location.href='/board';</script>");
    }
  });
});


// 수락 라우트 추가
app.post('/accept', (req, res) => {
  const { user_id, project_seq } = req.body;

  const updateSql = `UPDATE participants SET status = '수락' WHERE user_id = ? AND project_seq = ?`;

  connection.query(updateSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      return res.send("<script> alert('수락 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'); history.go(-1);</script>");
    }
    res.send("<script> alert('참가 신청이 수락되었습니다.'); location.href='/project/" + project_seq + "';</script>");
  });
});

// 거절 라우트 추가
app.post('/reject', (req, res) => {
  const { user_id, project_seq } = req.body;

  const deleteSql = `DELETE FROM participants WHERE user_id = ? AND project_seq = ?`;

  connection.query(deleteSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      return res.send("<script> alert('거절 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'); history.go(-1);</script>");
    }
    res.send("<script> alert('참가 신청이 거절되었습니다.'); location.href='/project/" + project_seq + "';</script>");
  });
});

//----수정(추가)
//----수정(추가)
app.get('/see_project', (req, res) => {
  if (req.session.member == null) {
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>");
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
        FROM participants p
        INNER JOIN project_info pi ON p.project_seq = pi.project_seq
        INNER JOIN member m ON pi.user_id = m.user_id
        WHERE p.user_id = ? AND pi.status = 'hidden'
      `;
      
      connection.query(participantProjectsSql, [user_id], (err, participantResults) => {
        if (err) {
          console.error('Database query error:', err);
          res.send("<script> alert('프로젝트 정보를 가져오는 중 오류가 발생했습니다.'); location.href='/';</script>");
          return;
        }

        // 새로운 기능 추가: 지원한 프로젝트 데이터 조회
        const appliedProjectsSql = `
          SELECT pi.introduce_title, pi.category, pi.deadline, pi.position, pi.teck_stack, pi.project_seq, m.nickname, m.profile_pic
          FROM participants p
          INNER JOIN project_info pi ON p.project_seq = pi.project_seq
          INNER JOIN member m ON pi.user_id = m.user_id
          WHERE p.user_id = ? AND p.status = '신청'
        `;

        connection.query(appliedProjectsSql, [user_id], (err, appliedProjects) => {
          if (err) {
            console.error('Database query error:', err);
            res.send("<script> alert('지원한 프로젝트 정보를 가져오는 중 오류가 발생했습니다.'); location.href='/';</script>");
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




//----추가
app.post('/apply', async (req, res) => {
  // 현재 세션의 사용자 ID 가져오기
  const user_id = req.session.member ? req.session.member.user_id : null;

  // 사용자 ID가 없는 경우 처리
  if (!user_id) {
    return res.send("<script> alert('로그인 후 시도해주세요'); location.href='/login';</script>");
  }

  // 폼 데이터 가져오기
  const { project_seq, position } = req.body;

  // 현재 게시글의 작성자 정보 가져오기
  connection.query('SELECT user_id FROM project_info WHERE project_seq = ?', [project_seq], (err, result) => {
    if (err) {
      console.error('Database query error:', error);
      return res.send("<script> alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/';</script>");
    }

    // 게시글 작성자와 로그인한 사용자의 user_id 비교하여 신청 가능 여부 확인
    const author_id = result[0].user_id;
    if (user_id === author_id) {
      return res.send("<script> alert('본인 게시글에는 신청할 수 없습니다.'); history.go(-1);</script>");
    }

    // SQL 삽입문
    const insertSql = `
      INSERT INTO participants (user_id, project_seq, position, status) 
      VALUES (?, ?, ?, ?)
    `;
    const values = [user_id, project_seq, position, '신청']; // status의 값으로 '신청'을 사용

    // 데이터베이스 쿼리 실행
    connection.query(insertSql, values, (err, result) => {
      if (err) {
        console.error('Database query error:', error);
        return res.send("<script> alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/';</script>");
      }
      
      res.send("<script> alert('신청이 완료되었습니다'); location.href='/';</script>");
    });
  });
});

// 게시물 삭제 라우트
app.post('/delete/:project_seq', (req, res) => {
  const projectSeq = req.params.project_seq;

  connection.query('DELETE FROM project_info WHERE project_seq = ?', [projectSeq], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('게시물을 삭제하는 중 오류가 발생했습니다.');
    }
    res.send("<script> alert('게시물 삭제가 완료되었습니다'); location.href='/';</script>");
  });
});

// 추가
app.get('/start/:project_seq', (req, res) => {
  const projectSeq = req.params.project_seq;
  const updateSql = 'UPDATE project_info SET status = ? WHERE project_seq = ?';
  connection.query(updateSql, ['hidden', projectSeq], (err, result) => {
      if (err) throw err;
      res.send("<script> alert('프로젝트가 시작되었습니다'); location.href='/';</script>");
  });
});

app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})
