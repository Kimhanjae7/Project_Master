# 필요 패키지 설치
# pip install flask
# pip install flask-cors
# pip install SQLAlchemy
# pip install mysql-connector-python
# pip install pandas
# pip install axios

from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import create_engine
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# DB URL 설정
db_url = 'mysql+mysqlconnector://root:7070@localhost/project1'
engine = create_engine(db_url)

def get_matching_posts(user_id):
    with engine.connect() as conn:
        # 쿼리 실행 및 데이터 가져오기
        query_member = "SELECT * FROM member"
        query_project_info = "SELECT * FROM project_info WHERE status = 'active'"


        # member 데이터 로드
        m_df = pd.read_sql(query_member, conn)
        print("Loaded member data:")
        print(m_df.head())

        # project_info 데이터 로드
        p_df = pd.read_sql(query_project_info, conn)
        print("Loaded project info data:")
        print(p_df.head())

        # 기술 스택 처리
        m_df['interest_stack'] = m_df['interest_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])
        p_df['teck_stack'] = p_df['teck_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])

        # project_info와 member 데이터를 병합하여 nickname 추가
        p_df = p_df.merge(m_df[['user_id', 'nickname']], on='user_id', how='left')
        print("Merged project info with member data:")
        print(p_df.head())
    # 새로운 사용자 필터링
    matching_scores = []

    new_user = m_df[m_df['user_id'] == user_id].iloc[0]
    print("new_user:", new_user)

    # 매칭 점수 계산 함수
    def calculate_match_score(member_tech_stack, post_tech_stack):
        if not post_tech_stack:
            return 0
        return len(set(member_tech_stack) & set(post_tech_stack))

    for post in p_df.itertuples():
        print(f"Checking post: {post.project_seq}, Position: {post.position}")
        print(f"user Checking job: {new_user.job}")
        # 포지션이 일치하는 경우 우선 고려
        score = calculate_match_score(new_user.interest_stack, post.teck_stack) # 사용 스킬 몇개 매칭되는 지
        priority = 0
        if new_user.job == post.position:
            priority = 1

        print(f"Calculated score for post {post.project_seq}: {score}")
       
        matching_scores.append({
            'project_seq': post.project_seq,
            'user_id': new_user.user_id,
            'user_name': new_user.user_name,
            'nickname': new_user.nickname,
            'project_nickname': post.nickname,
            'introduce_title': post.introduce_title,
            'position': post.position,
            'priority': priority,
            'tech_stack_match_score': score,
            'category': post.category,
            'teck_stack': post.teck_stack,
            'view_count': post.view_count,
            'deadline': post.deadline,
            'matched_skills': ', '.join(set(new_user.interest_stack) & set(post.teck_stack)),
            'total_required_skills': len(post.teck_stack)
        })

    print("matching_scores:", matching_scores)

    # 매치 점수 df 생성
    match_df = pd.DataFrame(matching_scores)
    # 매치 점수로 정렬 (높은순으로)
    match_df = match_df.sort_values(by=['priority', 'tech_stack_match_score'], ascending=[False, False])
    return match_df.to_dict(orient='records')

@app.route('/get_matching_posts', methods=['GET'])
def get_matching_posts_route():
    user_id = request.args.get('user_id')
    if user_id:
        matching_posts = get_matching_posts(user_id)
        return jsonify(matching_posts)
    else:
        return jsonify({"error": "Missing user_id"}), 400

if __name__ == '__main__':
    app.run(port=2010)
