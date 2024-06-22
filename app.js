require('dotenv').config();  // 가장 위에 위치
const express = require('express');
const ejs = require('ejs');
const axios = require('axios');
const app = express();
const path = require('path');
const port = process.env.PORT || 5070;
const bodyParser = require('body-parser');
const session = require('express-session');
const { exec } = require('child_process');  // 추가된 부분


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

const fs = require('fs');   
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views 경로를 절대 경로로 설정


app.use(bodyParser.urlencoded({ extended: false }));
// ----------  admin 때문에 추가함. -----------//
app.use(bodyParser.json()); // --> admin 때문에 추가함.

// Use the session middleware
app.use(session({ secret: 'yesung', cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));

app.use((req, res, next) => {
    res.locals.user_id = "";
    if (req.session.member) {
        res.locals.user_id = req.session.member.user_id;
    }
    next();
});


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
//------------------------------------------------

// 메인 페이지 라우팅
// 메인 페이지 라우팅
app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 9;
  const user_id = req.session.member ? req.session.member.user_id : null;
  const offset = (page - 1) * perPage;

  let sql = `
  SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
  FROM project_info p
  JOIN member m ON p.user_id = m.user_id
  ORDER BY p.project_seq ASC
  LIMIT ${perPage}
  OFFSET ${offset}`;



  if (user_id) {
      axios.get('http://localhost:2060/get_matching_posts', { params: { user_id } })
          .then(response => {
              const recommendations = response.data;

              connection.query(sql, (err, results) => {
                  if (err) {
                      console.error('Error executing query:', err);
                      throw err;
                  }

                  let countSql = `SELECT COUNT(*) as count FROM project_info`;
                  connection.query(countSql, (err, countResult) => {
                      if (err) {
                          console.error('Error executing count query:', err);
                          throw err;
                      }
                      const totalCount = countResult[0].count;
                      const totalPages = Math.ceil(totalCount / perPage);

                      res.render('index', { projects: results, totalPages, currentPage: page, recommendations });
                  });
              });
          })
          .catch(error => {
              console.error('Error fetching recommendations:', error);
              res.render('index', { projects: [], totalPages: 0, currentPage: 1, recommendations: [] });
          });
  } else {
      connection.query(sql, (err, results) => {
          if (err) {
              console.error('Error executing query:', err);
              throw err;
          }

          let countSql = `SELECT COUNT(*) as count FROM project_info`;
          connection.query(countSql, (err, countResult) => {
              if (err) {
                  console.error('Error executing count query:', err);
                  throw err;
              }
              const totalCount = countResult[0].count;
              const totalPages = Math.ceil(totalCount / perPage);

              res.render('index', { projects: results, totalPages, currentPage: page, recommendations: [] });
          });
      });
  }
});


//------------------------- 평점 -------------------------------//
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

//--------------------------------------------------------//

//------------------------- 알람 -------------------------------//
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


//--------------------------------------------------------//



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


//----------------------------카테고리 -------------------------------//
app.get('/filter_projects', (req, res) => {
  const { category, skill_stack, role, keyword } = req.query;
  let sql = `SELECT p.category, p.project_seq, p.introduce_title, p.teck_stack, p.position, p.deadline, m.nickname
             FROM project_info p
             JOIN member m ON p.user_id = m.user_id
             WHERE 1=1`;

  if (category && category !== "카테고리") {
      sql += ` AND p.category = '${category}'`;
  }

  if (skill_stack && skill_stack !== "기술스택") {
      sql += ` AND p.teck_stack LIKE '%${skill_stack}%'`;
  }

  if (role && role !== "역할") {
      sql += ` AND p.position = '${role}'`;
  }

  if (keyword) {
      sql += ` AND (p.introduce_title LIKE '%${keyword}%' OR p.introduce_detail LIKE '%${keyword}%')`;
  }

  console.log(`SQL Query: ${sql}`); // 쿼리 확인용 로그

  connection.query(sql, (err, results) => {
      if (err) throw err;
      console.log(`Query Results: ${results}`); // 결과 확인용 로그
      res.json(results);
  });
});

//----------------------------카테고리 여기까지-------------------------------//

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

  if (user_id === 'admin' && user_pw === '0000') {
    req.session.admin = true;
    res.redirect('/admin');
    return;
}

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
// 게시글
// 프로젝트 상세 페이지 라우트
app.get('/project/:project_seq', (req, res) => {
  const project_seq = req.params.project_seq;
  const user_id = req.session.member ? req.session.member.user_id : null;

  const selectSql = `SELECT * FROM project_info WHERE project_seq = ?`;

  connection.query(selectSql, [project_seq], function(err, result) {
    if (err) throw err;

    if (result.length > 0) {
      const project = result[0];
      const isAuthor = user_id === project.user_id;
      const isOngoing = project.status === '진행중'; // 상태가 '진행중'인 경우에만 true

      const participantsSql = `SELECT user_id, position, status FROM project_participants WHERE project_seq = ?`;
      connection.query(participantsSql, [project_seq], function(err, participantsResult) {
        if (err) throw err;
        res.render('projectDetail', { projects: project, isAuthor, participants: participantsResult, isOngoing });
      });
    } else {
      console.log('No project found');
      res.send("<script> alert('게시물이 존재하지 않습니다'); location.href='/board';</script>");
    }
  });
});


// 수락 라우트 추가
app.post('/accept', (req, res) => {
  const { user_id, project_seq } = req.body;

  const updateSql = `UPDATE project_participants SET status = '수락' WHERE user_id = ? AND project_seq = ?`;

  connection.query(updateSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      return res.send("<script> alert('수락 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'); history.go(-1);</script>");
    }
    res.send("<script> alert('참가 신청이 수락되었습니다.'); location.href='/project/" + project_seq + "';</script>");
  });
});

// 참가 신청 거절
app.post('/reject', (req, res) => {
  const { user_id, project_seq } = req.body;

  const deleteSql = `DELETE FROM project_participants WHERE user_id = ? AND project_seq = ?`;

  connection.query(deleteSql, [user_id, project_seq], function(err, result) {
    if (err) {
      console.error('Database query error:', err);
      return res.send("<script> alert('거절 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'); history.go(-1);</script>");
    }
    res.send("<script> alert('참가 신청이 거절되었습니다.'); location.href='/project/" + project_seq + "';</script>");
  });
});

//----수정(추가)
app.get('/see_project', (req, res) => {
  if (req.session.member == null) {
    res.send("<script> alert('로그인하고 접근해주세요'); location.href='/';</script>");
    return;
  }

  const user_id = req.session.member.user_id;

  const projectSql = 'SELECT introduce_title, category, deadline, position, teck_stack, project_seq, status FROM project_info WHERE user_id = ?';
  
  const memberSql = 'SELECT nickname, profile_pic FROM member WHERE user_id = ?';

  connection.query(projectSql, [user_id], (err, projectResults) => {
    if (err) throw err;
    
    connection.query(memberSql, [user_id], (err, memberResults) => {
      if (err) throw err;
      
      const memberInfo = memberResults[0];
      
      // 새로운 기능 추가: project_participants 테이블과 project_info 테이블을 조인하여 데이터 조회
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
          res.send("<script> alert('프로젝트 정보를 가져오는 중 오류가 발생했습니다.'); location.href='/';</script>");
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
            res.send("<script> alert('지원한 프로젝트 정보를 가져오는 중 오류가 발생했습니다.'); location.href='/';</script>");
            return;
          }

          // 데이터를 렌더링할 템플릿에 전달
          res.render('post_view_see', { 
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
      console.error('Database query error:', err);
      return res.send("<script> alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/';</script>");
    }

    // 게시글 작성자와 로그인한 사용자의 user_id 비교하여 신청 가능 여부 확인
    const author_id = result[0].user_id;
    if (user_id === author_id) {
      return res.send("<script> alert('본인 게시글에는 신청할 수 없습니다.'); history.go(-1);</script>");
    }

    // SQL 삽입문
    const insertSql = `
      INSERT INTO project_participants (user_id, project_seq, position, status) 
      VALUES (?, ?, ?, ?)
    `;
    const values = [user_id, project_seq, position, '신청']; // status의 값으로 '신청'을 사용

    // 데이터베이스 쿼리 실행
    connection.query(insertSql, values, (err, result) => {
      if (err) {
        console.error('Database query error:', err);
        return res.send("<script> alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.'); location.href='/';</script>");
      }
      
      res.send("<script> alert('신청이 완료되었습니다'); location.href='/';</script>");
    });
  });
});

app.post('/end_project', (req, res) => {
  const project_seq = req.body.project_seq;
  const updateSql = 'UPDATE project_info SET status = ? WHERE project_seq = ?';
  connection.query(updateSql, ['종료됨', project_seq], (err, result) => {
    if (err) throw err;
    res.send("<script> alert('프로젝트가 종료되었습니다'); location.href='/grade?project_seq=" + project_seq + "&introduce_title=" + encodeURIComponent(req.body.introduce_title) + "';</script>");
  });
});


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
app.post('/start_project', (req, res) => {
  const project_seq = req.body.project_seq;
  const updateSql = 'UPDATE project_info SET status = ? WHERE project_seq = ?';
  connection.query(updateSql, ['진행중', project_seq], (err, result) => {
    if (err) throw err;
    res.send("<script> alert('프로젝트가 시작되었습니다'); location.href='/project/" + project_seq + "';</script>");
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
        redirectPath: '/back' 
    });
    }
    res.render('popup', {
      message: '게시글이 수정되었습니다.',
      redirectPath: '/project/' + project_seq 
  });
  });
});
});



//------------------------ADMIN 로그인 -------------------------//
app.post('/admin/login', (req, res) => {
  const { user_id, user_pw } = req.body;
  if (user_id === 'admin' && user_pw === '0000') {
      req.session.admin = true;
      res.redirect('/admin');
  } else {
      res.send("<script> alert('잘못된 관리자 로그인 정보입니다.'); location.href='/admin/login';</script>");
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.render('admin_login');
});

// 관리자 페이지 보호 미들웨어 추가
function adminAuth(req, res, next) {
  if (req.session.admin) {
      next();
  } else {
      res.redirect('/admin/login');
  }
}

app.get('/admin', adminAuth, (req, res) => {
  res.render('admin_dashboard');
});

//-------------------ADMIN 사용자 생성,수정,삭제-----------------------//
app.get('/admin/users', adminAuth, (req, res) => {
  const sql = 'SELECT * FROM member';
  connection.query(sql, (err, results) => {
      if (err) throw err;
      res.render('admin_users', { users: results }); // 'admin_users.ejs' 템플릿에 데이터 전달
  });
});

app.post('/admin/users/create', adminAuth, (req, res) => {
  const { user_id, user_pw, user_name, user_phone, nickname } = req.body;
  const sql = `INSERT INTO member (user_id, user_pw, user_name, user_phone, nickname) VALUES (?, ?, ?, ?, ?)`;

  connection.query(sql, [user_id, user_pw, user_name, user_phone, nickname], (err, result) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
  });
});

app.put('/admin/users/edit/:user_id', adminAuth, (req, res) => {
  const user_id = req.params.user_id;
  const updateFields = req.body;

  console.log('Received updateFields:', updateFields); // 수신된 데이터 확인

  const allowedFields = ['user_pw', 'user_name', 'user_phone', 'nickname', 'job', 'affiliation', 'career', 'introduce', 'interest_stack'];

  // 필터링된 필드만 업데이트 쿼리에 포함
  let sql = `UPDATE member SET `;
  let params = [];

  allowedFields.forEach(field => {
      if (updateFields[field] !== undefined && updateFields[field] !== null && updateFields[field] !== '') {
          sql += `${field} = ?, `;
          params.push(updateFields[field]);
      }
  });

  // 마지막 쉼표와 공백 제거
  if (params.length > 0) {
      sql = sql.slice(0, -2);
      sql += ` WHERE user_id = ?`;
      params.push(user_id);

      console.log('SQL Query:', sql); // SQL 쿼리 로그
      console.log('Params:', params); // 파라미터 로그

      connection.query(sql, params, (err, result) => {
          if (err) return res.json({ success: false, error: err });
          res.json({ success: true });
      });
  } else {
      console.log('No fields to update', updateFields); // 전달된 데이터 로그
      return res.json({ success: false, error: 'No fields to update' });
  }
});




app.delete('/admin/users/delete/:user_id', adminAuth, (req, res) => {
  const user_id = req.params.user_id;

  // 먼저 project_info 테이블에서 해당 user_id를 참조하는 행을 삭제합니다.
  const deleteProjects = 'DELETE FROM project_info WHERE user_id = ?';
  connection.query(deleteProjects, [user_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

    // 이후 member 테이블에서 해당 user_id를 삭제합니다.
    const deleteUser = 'DELETE FROM member WHERE user_id = ?';
    connection.query(deleteUser, [user_id], (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      return res.json({ success: true });
    });
  });
});

// admin - user - serach
app.get('/admin/users/search', adminAuth, (req, res) => {
  const keyword = req.query.keyword;
  const sql = `SELECT * FROM member WHERE 
               user_id LIKE ? OR 
               user_name LIKE ? OR 
               user_phone LIKE ? OR 
               nickname LIKE ? OR 
               job LIKE ? OR 
               affiliation LIKE ? OR 
               career LIKE ? OR 
               introduce LIKE ? OR 
               interest_stack LIKE ?`;

  const searchValue = `%${keyword}%`;
  const params = Array(9).fill(searchValue); // 각 필드에 대해 동일한 검색어 사용

  connection.query(sql, params, (err, results) => {
      if (err) return res.json({ success: false, error: err });
      res.json({ success: true, users: results });
  });
});



//-------------------ADMIN 게시글 생성,수정,삭제-----------------------//
// 게시글 관리 페이지
app.get('/admin/posts', adminAuth, (req, res) => {
  const searchQuery = req.query.search || '';
  let sql = 'SELECT * FROM project_info';

  if (searchQuery) {
    sql += ` WHERE introduce_title LIKE ? OR teck_stack LIKE ? OR category LIKE ? OR project_seq LIKE ? OR user_id LIKE ?`;
  }

  connection.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`], (err, results) => {
      if (err) throw err;
      res.render('admin_posts', { posts: results, searchQuery }); // 'admin_posts.ejs' 템플릿에 데이터 전달
  });
});

// 게시글 검색
app.get('/admin/posts/search', adminAuth, (req, res) => {
  const keyword = req.query.keyword;
  const sql = `SELECT * FROM project_info WHERE 
               category LIKE ? OR 
               mem_number LIKE ? OR 
               way LIKE ? OR 
               period LIKE ? OR 
               teck_stack LIKE ? OR 
               deadline LIKE ? OR 
               position LIKE ? OR 
               contact LIKE ? OR 
               introduce_title LIKE ? OR 
               introduce_detail LIKE ?`;

  const searchValue = `%${keyword}%`;
  const params = Array(10).fill(searchValue);

  connection.query(sql, params, (err, results) => {
      if (err) return res.json({ success: false, error: err });
      res.json({ success: true, posts: results });
  });
});

// 게시글 생성
app.post('/admin/posts/create', adminAuth, (req, res) => {
  const { category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id } = req.body;
  const sql = `INSERT INTO project_info (category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  connection.query(sql, [category, mem_number, way, period, teck_stack, deadline, position, contact, introduce_title, introduce_detail, user_id], (err, result) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
  });
});

// 게시글 수정
app.put('/admin/posts/edit/:project_seq', adminAuth, (req, res) => {
  const project_seq = req.params.project_seq;
  const updateFields = req.body;
  const allowedFields = [
    'category', 'mem_number', 'way', 'period', 'teck_stack', 
    'deadline', 'position', 'contact', 'introduce_title', 'user_id'
  ];

  // 필터링된 필드만 업데이트 쿼리에 포함
  let sql = `UPDATE project_info SET `;
  let params = [];

  allowedFields.forEach(field => {
      if (updateFields[field] !== undefined && updateFields[field] !== '') {
          sql += `${field} = ?, `;
          params.push(updateFields[field]);
      }
  });

  // 마지막 쉼표와 공백 제거
  sql = sql.slice(0, -2);
  sql += ` WHERE project_seq = ?`;
  params.push(project_seq);

  // 필드가 없는 경우의 처리
  if (params.length === 1) {
      console.log('No fields to update', updateFields); // 전달된 데이터 로그
      return res.json({ success: false, error: 'No fields to update' });
  }

  console.log('SQL Query:', sql); // SQL 쿼리 로그
  console.log('Params:', params); // 파라미터 로그

  connection.query(sql, params, (err, result) => {
      if (err) return res.json({ success: false, error: err });
      res.json({ success: true });
  });
});


// 게시글 삭제
app.delete('/admin/posts/delete/:project_seq', adminAuth, (req, res) => {
  const project_seq = req.params.project_seq;
  const sql = 'DELETE FROM project_info WHERE project_seq = ?';

  connection.query(sql, [project_seq], (err, result) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
  });
});

//------------------------ADMIN-------------------------//
app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})