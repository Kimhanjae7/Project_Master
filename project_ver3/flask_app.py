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
        query_project_info = "SELECT * FROM project_info"

        # member 데이터 로드
        m_df = pd.read_sql(query_member, conn)

        # project_info 데이터 로드
        p_df = pd.read_sql(query_project_info, conn)

        # 기술 스택 처리
        m_df['interest_stack'] = m_df['interest_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])
        p_df['teck_stack'] = p_df['teck_stack'].apply(lambda x: x.split(', ') if pd.notna(x) else [])
    
    # 새로운 사용자 필터링
    new_user = m_df[m_df['user_id'] == user_id].iloc[0]
    print("new_user:", new_user)

    # 매칭 점수 계산 함수
    def calculate_match_score(member_tech_stack, post_tech_stack):
        if not post_tech_stack:
            return 0
        return len(set(member_tech_stack) & set(post_tech_stack)) / len(set(post_tech_stack))

    matching_scores = []
    for post in p_df.itertuples():
        # 포지션이 일치하는 경우 우선 고려
        if new_user.job == post.position:
            score = calculate_match_score(new_user.interest_stack, post.teck_stack) # 사용 스킬 몇개 매칭되는 지
            if score > 0:  # 매칭 점수가 0이 아닌 것만 추가
                matching_scores.append({ # 각각의 매치 점수 추가
                    'project_seq': post.project_seq,  # project_seq 추가
                    'user_id': new_user.user_id,
                    'user_name': new_user.user_name,
                    'post_title': post.introduce_title,
                    'position': post.position,
                    'tech_stack_match_score': score,
                    'matched_skills': ', '.join(set(new_user.interest_stack) & set(post.teck_stack)),
                    'total_required_skills': len(post.teck_stack)
                })

    print("matching_scores:", matching_scores)

    # 매치 점수 df 생성
    if matching_scores:  # matching_scores 리스트가 비어 있지 않은 경우에만 데이터프레임 생성
        match_df = pd.DataFrame(matching_scores)
        # 매치 점수로 정렬 (높은순으로)
        match_df = match_df.sort_values(by=['tech_stack_match_score'], ascending=False)
        return match_df.to_dict(orient='records')
    else:
        return []  # 매칭되는 포스트가 없는 경우 빈 리스트 반환

@app.route('/get_matching_posts', methods=['GET'])
def get_matching_posts_route():
    user_id = request.args.get('user_id')
    if user_id:
        matching_posts = get_matching_posts(user_id)
        return jsonify(matching_posts)
    else:
        return jsonify({"error": "Missing user_id"}), 400

if __name__ == '__main__':
    app.run(port=4000)
