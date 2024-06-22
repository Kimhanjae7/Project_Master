from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 데이터베이스 연결 설정
db_config = {
    'host': 'localhost',  # MySQL 서버 주소
    'user': 'root',  # MySQL 사용자 이름
    'password': '0000',  # MySQL 비밀번호
    'database': 'project'  # 사용할 데이터베이스 이름
}

def get_matching_posts(user_id):
    try:
        conn = mysql.connector.connect(**db_config)
        
        m_df = pd.read_sql("SELECT * FROM member", conn)  # member 테이블에서 데이터 로드
        p_df = pd.read_sql("SELECT * FROM project_info", conn)  # project_info 테이블에서 데이터 로드
        
        m_df['interest_stack'] = m_df['interest_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])
        p_df['teck_stack'] = p_df['teck_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])
        
        conn.close()

        matching_scores = []
        if user_id == 'none':
            return []
        new_user = m_df[m_df['user_id'] == user_id].iloc[0]
        
        def calculate_match_score(member_tech_stack, post_tech_stack):
            if not post_tech_stack:
                return 0
            return len(set(member_tech_stack) & set(post_tech_stack)) 
        
        for post in p_df.itertuples():
            score = calculate_match_score(new_user.interest_stack, post.teck_stack)
            priority = 0
            if new_user.job == post.position:
                priority = 1
                
            matching_scores.append({
                'project_seq': post.project_seq,
                'user_id': new_user.user_id,
                'user_name': new_user.user_name,
                'post_title': post.introduce_title,
                'position': post.position,
                'priority': priority,
                'tech_stack_match_score': score,
                'matched_skills': ', '.join(set(new_user.interest_stack) & set(post.teck_stack)),
                'total_required_skills': len(post.teck_stack)
            })
        
        # 매치 점수 df 생성
        match_df = pd.DataFrame(matching_scores)

        # 우선순위(priority)와 매칭 점수(tech_stack_match_score)로 정렬 (우선순위 높은 것 먼저, 매칭 점수 높은 것 먼저)
        match_df = match_df.sort_values(by=['priority', 'tech_stack_match_score'], ascending=[False, False])
        
        app.logger.debug('Matching posts: %s', match_df.to_dict(orient='records'))
        return match_df.to_dict(orient='records')

    except Exception as e:
        app.logger.error('Error in get_matching_posts: %s', str(e))
        raise

@app.route('/get_matching_posts', methods=['GET'])
def get_matching_posts_route():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    try:
        recommendations = get_matching_posts(user_id)
        return jsonify(recommendations)
    except Exception as e:
        print(f"Error getting matching posts: {e}")
        return jsonify({"error": "An error occurred while getting matching posts"}), 500

if __name__ == '__main__':
    app.run(port=2060)
