from flask import Flask, request, render_template_string, jsonify
import pymysql

app = Flask(__name__)

def categoryData(category_column, category_values):
    conn = None
    cur = None
    data = []
    
    try:
        conn = pymysql.connect(host='127.0.0.1', user='root', password='1234', db='mydb', charset='utf8')
        cur = conn.cursor()
        
        if category_column == 'tech_stack':
            conditions = ' AND '.join([f"{category_column} LIKE %s" for _ in category_values])
            sql = f"SELECT * FROM post_info WHERE {conditions}"
            like_values = [f"%{value}%" for value in category_values]
            cur.execute(sql, like_values)
        else:
            placeholders = ', '.join(['%s'] * len(category_values))
            sql = f"SELECT * FROM post_info WHERE {category_column} IN ({placeholders})"
            cur.execute(sql, category_values)
        
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

def filter_results(results, column, values):
    filtered_results = []
    for result in results:
        if column == 'tech_stack':
            if all(value in result[6] for value in values):
                filtered_results.append(result)
        else:
            if result[3] in values or result[4] in values or result[8] in values:
                filtered_results.append(result)
    return filtered_results

@app.route('/')
def index():
    categories = ['스터디', '프로젝트']
    tech_stacks = ['JavaScript', 'TypeScript', 'React', 'Vue', 'NodeJs', 'Spring', 'Java', 'NextJs', 'NestJS', 'Express', 'Go', 'C', 'Python', 'Django', 'Swift', 'Kotlin', 'MySQL', 'MongoDB', 'php', 'GraphQL', 'Firebase', 'ReactNative', 'Unity', 'Flutter', 'AWS', 'Kubernetes', 'Docker', 'Git', 'Figma', 'Zeplin']
    positions = ['프론트엔드', '백엔드', '디자이너', 'IOS', '안드로이드', '데브옵스', 'PM', '기획자', '마케터']
    ways = ['전체', '온라인', '오프라인', '온오프라인']
    return render_template_string("""
    <html>
        <head>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script>
                $(document).ready(function() {
                    $('#searchForm').on('submit', function(event) {
                        event.preventDefault();
                        $.ajax({
                            url: '/search',
                            method: 'POST',
                            data: $(this).serialize(),
                            success: function(response) {
                                $('#results').html(response);
                            }
                        });
                    });
                });
            </script>
        </head>
        <body>
            <h2>Select Categories:</h2>
            <form id="searchForm">
                <h3>Categories</h3>
                <ul>
                {% for category in categories %}
                    <li><input type="checkbox" name="categories" value="{{ category }}"> {{ category }}</li>
                {% endfor %}
                </ul>
                <h3>Tech Stacks</h3>
                <ul>
                {% for tech_stack in tech_stacks %}
                    <li><input type="checkbox" name="tech_stacks" value="{{ tech_stack }}"> {{ tech_stack }}</li>
                {% endfor %}
                </ul>
                <h3>Positions</h3>
                <ul>
                {% for position in positions %}
                    <li><input type="checkbox" name="positions" value="{{ position }}"> {{ position }}</li>
                {% endfor %}
                </ul>
                <h3>Ways</h3>
                <ul>
                {% for way in ways %}
                    <li><input type="checkbox" name="ways" value="{{ way }}"> {{ way }}</li>
                {% endfor %}
                </ul>
                <input type="submit" value="Search">
            </form>
            <div id="results"></div>
        </body>
    </html>
    """, categories=categories, tech_stacks=tech_stacks, positions=positions, ways=ways)

@app.route('/search', methods=['POST'])
def search():
    categories = request.form.getlist('categories')
    tech_stacks = request.form.getlist('tech_stacks')
    positions = request.form.getlist('positions')
    ways = request.form.getlist('ways')

    results = categoryData('category', categories) if categories else []

    if tech_stacks:
        results = filter_results(results, 'tech_stack', tech_stacks) if results else categoryData('tech_stack', tech_stacks)

    if positions:
        results = filter_results(results, 'position', positions) if results else categoryData('position', positions)

    if ways:
        results = filter_results(results, 'way', ways) if results else categoryData('way', ways)

    return render_template_string("""
    <h2>Results:</h2>
    <ul>
    {% for result in results %}
        <li>{{ result }}</li>
    {% endfor %}
    </ul>
    """, results=results)

if __name__ == '__main__':
    app.run(debug=True)
