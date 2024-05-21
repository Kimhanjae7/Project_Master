const express = require('express')
const ejs = require('ejs') //js 코드를 html템플릿에 삽입하여 동적으로 웹페이지 생성
const app = express()
const port = 3000
var bodyParser = require('body-parser')

require('dotenv').config()

const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log("connected db")


app.set('view engine', 'ejs')
app.set('views', './views') //views라는 폴더안에 있는걸 가져온다

app.use(bodyParser.urlencoded({ extended: false }))

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
  const name = req.body.name;
  const phone = req.body.phone;
  const email = req.body.email;

  var sql = `insert into mypage(name,phone,email)
  values('${name}', '${phone}', '${email}')`
  connection.query(sql, function(err, result){
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
      res.send(result);
    }
  })
})

app.listen(port, () => {
  console.log(`서버 실행 성공하였습니다. 접속주소 : http://localhost:${port}`)
})