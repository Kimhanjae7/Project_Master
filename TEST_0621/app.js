// npm install express
// npm install ejs
// npm install body-parser
// npm install express-session
// npm install dotnev
// npm install mysql2

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

//-------------------grade 추가0621 ----------------------------
// Fetch project participants for grading
// Fetch project participants for grading
app.get('/grade', (req, res) => {
  const userId = req.session.member ? req.session.member.user_id : null;
  const projectSeq = req.query.project_seq;
  const introduceTitle = req.query.introduce_title;

  if (!userId) {
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/login';</script>");
    return;
  }

  // projectSeq가 없으면 메인 페이지로 리다이렉트
  if (!projectSeq) {
    res.send("<script> alert('프로젝트 정보를 찾을 수 없습니다.'); location.href='/';</script>");
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
      res.send("<script> alert('프로젝트 정보를 찾을 수 없습니다'); location.href='/';</script>");
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

        connection.query('CALL update_role_counts(?, ?)', [uid, jobRole], (err) => {
          if (err) return reject(err);

          connection.query('SELECT @output_grade AS average_grade', (err, results) => {
            if (err) return reject(err);
            resolve();
          });
        });
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
      const userRoleSql = `SELECT position FROM project_participants WHERE project_seq = ? AND user_id = ?`;
      connection.query(userRoleSql, [projectSeq, userId], (err, userRoleResults) => {
        if (err) {
          res.status(500).send('Database error');
          return;
        }

        const writerRole = userRoleResults[0].position;
        connection.query('CALL update_role_counts(?, ?)', [userId, writerRole], (err) => {
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
                res.send(`
                  <script>
                    alert('성공적으로 평점을 부여하였고 알림을 전송하였습니다!');
                    window.location.href = '/';
                  </script>
                `);
              })
              .catch(err => {
                res.send(`
                  <script>
                    alert('평점 부여 또는 알림 전송 중 오류가 발생했습니다.');
                    window.location.href = '/';
                  </script>
                `);
              });
          });
        });
      });
    } else {
      Promise.all(gradeProcedures)
        .then(() => {
          res.send(`
            <script>
              alert('성공적으로 평점을 부여하였습니다!');
              window.location.href = '/';
            </script>
          `);
        })
        .catch(err => {
          res.send(`
            <script>
              alert('평점 부여 중 오류가 발생했습니다.');
              window.location.href = '/';
            </script>
          `);
        });
    }
  });
});



//------------------------------------------------------------

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
          res.render('index', { projects: results, totalPages, currentPage: page });
      });
  });
})


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
        res.render('mypage', { member: result[0] });
      }
    });
  }
});

app.post('/mypageProc', (req, res) => {
  const user_id = req.session.member.user_id; //수정한 부분
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
    res.send("<script> alert('마이페이지가 수정되었습니다.'); location.href='/mypage';</script>")
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
      var insertSql = `INSERT INTO member (user_id, user_pw, user_name, user_phone, nickname) VALUES (?, ?, ?, ?, ?)`;
      var values = [user_id, user_pw, user_name, user_phone, nickname];

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


//혁진 06-20 추가---------------------
//추가
// Display alarms for the logged-in user
// Display alarms for the logged-in user
app.get('/alarms', (req, res) => {
  if (req.session.member == null) {
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/login';</script>");
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

//------------------------------------------

//추가
app.get('/registration', (req, res) => {
  if(req.session.member == null){
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>")
  }else{
  res.render('registration')
  }
})

//추가
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

//추가 (프로젝트 제목 클릭하면 그 게시물에 대한 페이지 열림)
app.get('/project/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;
  
  var selectSql = `SELECT * FROM project_info WHERE project_seq = ?`;
  
  connection.query(selectSql, [project_seq], function(err, result) {
    if (err) throw err;
    
    if (result.length > 0) {
      console.log(result);
      res.render('projectDetail', { projects: result[0] });
    } else {
      console.log('No project found');
      res.send("<script> alert('게시물이 존재하지 않습니다'); location.href='/board';</script>");
    }
  });
});


app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})