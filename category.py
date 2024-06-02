from flask import Flask, request, render_template_string, jsonify
import pymysql

app = Flask(__name__)

def categoryData(filters):
    conn = None
    cur = None
    data = []

    try:
        conn = pymysql.connect(host='127.0.0.1', user='root', password='0000', db='project', charset='utf8')
        cur = conn.cursor()
        
        conditions = []
        values = []

        for column, column_values in filters.items():
            if column == 'teck_stack':
                conditions.append(' AND '.join([f"{column} LIKE %s" for _ in column_values]))
                values.extend([f"%{value}%" for value in column_values])
            else:
                placeholders = ', '.join(['%s'] * len(column_values))
                conditions.append(f"{column} IN ({placeholders})")
                values.extend(column_values)

        where_clause = ' AND '.join(conditions)
        sql = f"SELECT * FROM project_info WHERE {where_clause}"
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

@app.route('/')
def index():
    categories = ['스터디', '프로젝트']
    teck_stacks = ['JavaScript', 'TypeScript', 'React', 'Vue', 'NodeJs', 'Spring', 'Java', 'NextJs', 'NestJS', 'Express', 'Go', 'C', 'Python', 'Django', 'Swift', 'Kotlin', 'MySQL', 'MongoDB', 'php', 'GraphQL', 'Firebase', 'ReactNative', 'Unity', 'Flutter', 'AWS', 'Kubernetes', 'Docker', 'Git', 'Figma', 'Zeplin']
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
                <h3>Teck Stacks</h3>
                <ul>
                {% for teck_stack in teck_stacks %}
                    <li><input type="checkbox" name="teck_stacks" value="{{ teck_stack }}"> {{ teck_stack }}</li>
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
    """, categories=categories, teck_stacks=teck_stacks, positions=positions, ways=ways)

@app.route('/search', methods=['POST'])
def search():
    categories = request.form.getlist('categories')
    teck_stacks = request.form.getlist('teck_stacks')
    positions = request.form.getlist('positions')
    ways = request.form.getlist('ways')

    filters = {}
    if categories:
        filters['category'] = categories
    if teck_stacks:
        filters['teck_stack'] = teck_stacks
    if positions:
        filters['position'] = positions
    if ways:
        filters['way'] = ways

    results = categoryData(filters)

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