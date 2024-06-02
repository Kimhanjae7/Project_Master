from flask import Flask, request, render_template_string
import pymysql

app = Flask(__name__)

def searchData(keywords):
    conn = None
    cur = None
    data = []
    sql = "SELECT * FROM post_info WHERE 1=1"
    values = []
    
    try:
        conn = pymysql.connect(host='127.0.0.1', user='root', password='1234', db='project', charset='utf8')
        cur = conn.cursor()
        
        for keyword in keywords:
            keyword = f"%{keyword.strip()}%"
            sql += """
                AND (
                    category LIKE %s OR 
                    mem_number LIKE %s OR 
                    way LIKE %s OR 
                    period LIKE %s OR 
                    teck_stack LIKE %s OR 
                    deadline LIKE %s OR 
                    position LIKE %s OR 
                    contact LIKE %s OR 
                    introduce_title LIKE %s OR 
                    introduce_detail LIKE %s
                )
            """
            values.extend([keyword] * 10)
        
        cur.execute(sql, values)
        data = cur.fetchall()
        
        return data
        
    except pymysql.MySQLError as e:
        print(f"Error: {e}")
        return []
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/', methods=['GET', 'POST'])
def search():
    results = []
    if request.method == 'POST':
        keyword = request.form.get('keyword')
        if keyword:
            keywords = keyword.split(',')
            results = searchData(keywords)
    
    return render_template_string("""
    <html>
        <body>
            <form method="post">
                <div>
                    <label>Search: 
                        <input type="text" name="keyword" placeholder="키워드를 입력하세요.">
                    </label>
                    <input type="submit" value="Search">
                </div>
            </form>
            <h2>Results:</h2>
            <ul>
            {% for result in results %}
                <li>{{ result }}</li>
            {% endfor %}
            </ul>
        </body>
    </html>
    """, results=results)

if __name__ == '__main__':
    app.run(debug=True)
