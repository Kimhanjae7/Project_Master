import pymysql

def categoryData(category_column, category_values):
    conn = None
    cur = None
    data = ""
    sql = ""
    
    try:
        conn = pymysql.connect(host='127.0.0.1', user='root', password='1234', db='mydb', charset='utf8')
        cur = conn.cursor()
        
        # category_values가 리스트인지 확인하고 리스트로 변환
        if not isinstance(category_values, list):
            category_values = [category_values]
        
        # 쿼리 생성
        placeholders = ', '.join(['%s'] * len(category_values))
        sql = f"SELECT * FROM post_info WHERE {category_column} IN ({placeholders})"
        
        # 쿼리를 실행하고 결과를 가져옵니다.
        cur.execute(sql, category_values)
        data = cur.fetchall()
        
        # 결과를 출력하거나 반환합니다.
        for row in data:
            print(row)
            
        return data
        
    except pymysql.MySQLError as e:
        print(f"Error: {e}")
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 예시 사용법
category_column = 'category'
category_values = ['프로젝트']
results = categoryData(category_column, category_values)
for result in results:
    print(result)