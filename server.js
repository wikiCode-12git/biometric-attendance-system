// step 1: import the libraries of express, bodyParser, cors, mysql
require("dotenv").config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');

const app = express();

app.use(cors());
app.use(bodyParser.json({limit: '10mb'})); // file limit size defined
app.use(bodyParser.urlencoded({limit: '10mb', extended: true })); // file size to accept

app.get('/', (req, res) => {
  res.send("Server is running...");
});
app.use(express.static('public'));


// create database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed", err);
  } else {
    console.log("Connected to MySQL");
  }
});

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
const adminSessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60; // 1 hour

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (!name) return cookies;
    cookies[name] = rest.join('=');
    return cookies;
  }, {});
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.admin_session;
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

function createAdminSession(res) {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  adminSessions.set(token, { expires: Date.now() + SESSION_TTL_MS });
  res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Path=/; SameSite=Lax`);
}

function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).send('Unauthorized');
    return null;
  }
  return session;
}

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    createAdminSession(res);
    return res.send('Login successful');
  }
  res.status(401).send('Invalid admin credentials');
});

app.post('/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.admin_session;
  if (token) adminSessions.delete(token);
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
  res.send('Logged out');
});

app.get('/admin/session', (req, res) => {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, username: ADMIN_USER });
});

app.get('/admin/dashboard-data', (req, res) => {

    const session = requireAdmin(req, res);

    if (!session) return;

    const summarySql = `

        SELECT

            (SELECT COUNT(*) FROM students) AS total_students,

            (SELECT COUNT(*) FROM attendance) AS total_attendance,

            (

                SELECT COUNT(*)

                FROM attendance

                WHERE status='present'

                AND DATE(date)=CURDATE()

            ) AS present_today

    `;

    db.query(summarySql, (err, summary) => {

        if(err){

            console.error(err);

            return res.status(500).send("Database Error");

        }

        const recentSql = `

            SELECT

                s.name,

                s.matric_no,

                s.department,

                a.status,

                a.date

            FROM attendance a

            JOIN students s

            ON a.student_id=s.id

            ORDER BY a.date DESC

            LIMIT 10

        `;

        db.query(recentSql,(err,recent)=>{

            if(err){

                console.error(err);

                return res.status(500).send("Database Error");

            }

            const totalStudents =
                summary[0].total_students;

            const presentToday =
                summary[0].present_today;

           const attendanceRate =
        totalStudents === 0
        ? 0
        : Math.round(
            (presentToday / totalStudents) * 100
        );

const absentToday =
    totalStudents - presentToday;

            res.json({

                total_students:
                    totalStudents,

                total_attendance:
                    summary[0].total_attendance,

                present_today:
                    presentToday,
                absent_today: absentToday,

                attendance_rate:
                    attendanceRate,

                recent_attendance:
                    recent

            });

        });

    });

});

// Get all students 
app.get('/students', (req, res) => {
  const sql = "SELECT * FROM students";

  db.query(sql, (err, result) => {
    if(err) {
      console.error(err)
      res.json([]);
    } else {
      res.json(result);
    }
  });
});

// Delete a student
app.delete('/students/:id', (req, res) => {
  const { id } = req.params;
  
  // First, delete any attendance records for this student
  const deleteAttendanceSql = 'DELETE FROM attendance WHERE student_id = ?';
  
  db.query(deleteAttendanceSql, [id], (attendanceErr) => {
    if (attendanceErr) {
      console.error('Delete attendance records failed:', attendanceErr);
      return res.status(500).send('Error deleting student attendance records');
    }
    
    // Then delete the student
    const deleteStudentSql = 'DELETE FROM students WHERE id = ?';
    
    db.query(deleteStudentSql, [id], (err, result) => {
      if (err) {
        console.error('Delete student failed:', err);
        return res.status(500).send('Error deleting student: ' + err.message);
      }
      if (result.affectedRows === 0) {
        return res.status(404).send('Student not found');
      }
      res.send('Student deleted successfully');
    });
  });
});

// Update a student
app.put('/students/:id', (req, res) => {
  const { id } = req.params;
  const { matric_no, name, department } = req.body;

  if (!matric_no || !name || !department) {
    return res.status(400).send('Missing student data');
  }

  const sql = `
    UPDATE students
    SET matric_no = ?, name = ?, department = ?
    WHERE id = ?
  `;

  db.query(sql, [matric_no, name, department, id], (err, result) => {
    if (err) {
      console.error('Update student failed:', err);
      return res.status(500).send('Error updating student');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Student not found');
    }
    res.send('Student updated successfully');
  });
});

// Record attendance
app.post('/attendance', (req, res) => {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).send('Missing student_id');
  }

  const checkSql = `
    SELECT id FROM attendance
    WHERE student_id = ?
      AND DATE(date) = CURDATE()
    LIMIT 1
  `;

  db.query(checkSql, [student_id], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('Attendance check failed:', checkErr);
      return res.status(500).send('Error checking attendance');
    }

    if (checkResult.length > 0) {
      return res.status(409).send('Attendance already recorded for today');
    }

    const insertSql = `
      INSERT INTO attendance
      (student_id, date, status)
      VALUES (?, NOW(), ?)
    `;

    db.query(insertSql, [student_id, 'present'], (insertErr) => {
      if (insertErr) {
        console.error('Attendance insert failed:', insertErr);
        return res.status(500).send('Error recording attendance');
      }
      res.send('Attendance recorded successfully');
    });
  });
});

// Get attendance history
app.get('/attendance-history', (req, res) => {
  const sql = `
    SELECT a.id, a.student_id, a.date, a.status,
           s.name, s.matric_no, s.department
    FROM attendance a
    LEFT JOIN students s ON s.id = a.student_id
    ORDER BY a.date DESC
    LIMIT 100
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Attendance history query failed:', err);
      return res.status(500).json([]);
    }
    res.json(result);
  });
});

app.get("/attendance-history-csv", (req, res) => {

    const sql = `

        SELECT

            s.name,
            s.matric_no,
            s.department,
            a.date,
            a.status

        FROM attendance a

        JOIN students s

        ON a.student_id = s.id

        ORDER BY a.date DESC

    `;

    db.query(sql, (err, rows) => {

        if (err) {

            console.error(err);

            return res.status(500).send("Error generating CSV");

        }

        let csv =
            "Name,Matric Number,Department,Date,Status\n";

        rows.forEach(row => {

            csv += `"${row.name}","${row.matric_no}","${row.department}","${new Date(row.date).toLocaleString()}","${row.status}"\n`;

        });

        res.setHeader(
            "Content-Type",
            "text/csv"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="attendance-history.csv"'
        );

        res.send(csv);

    });

});

app.get("/attendance-summary", (req, res) => {

    const summarySql = `
        SELECT
            s.id,
            s.name,
            s.matric_no,
            s.department,

            COUNT(
                CASE
                    WHEN a.status = 'present'
                    THEN 1
                END
            ) AS present_days,

            COUNT(a.id) AS total_days

        FROM students s

        LEFT JOIN attendance a
        ON s.id = a.student_id

        GROUP BY
            s.id,
            s.name,
            s.matric_no,
            s.department

        ORDER BY s.name ASC
    `;

    db.query(summarySql, (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        }

        const students = rows.map(student => {

            const percentage =
                student.total_days > 0
                    ? Math.round(
                        (student.present_days / student.total_days) * 100
                    )
                    : 0;

            return {
                id: student.id,
                name: student.name,
                matric_no: student.matric_no,
                department: student.department,
                present_days: student.present_days,
                attendance_percentage: percentage
            };

        });

        const totalStudents = students.length;

        const todaySql = `
            SELECT COUNT(DISTINCT student_id) AS present_today
            FROM attendance
            WHERE status='present'
            AND DATE(date)=CURDATE()
        `;

        db.query(todaySql, (err2, todayResult) => {

            if (err2) {
                console.error(err2);
                return res.status(500).send("Database Error");
            }

            const presentToday = todayResult[0].present_today;

            const attendanceRate =
                totalStudents > 0
                    ? Math.round((presentToday / totalStudents) * 100)
                    : 0;

            res.json({

                total_students: totalStudents,

                present_today: presentToday,

                attendance_rate: attendanceRate,

                students: students

            });

        });

    });

});
app.get("/attendance-history", (req, res) => {

    const sql = `

        SELECT

            a.id,

            s.name,

            s.matric_no,

            s.department,

            a.status,

            a.date

        FROM attendance a

        INNER JOIN students s

            ON a.student_id = s.id

        ORDER BY a.date DESC

    `;

    db.query(sql, (err, rows) => {

        if (err) {

            console.error(err);

            return res.status(500).send("Database Error");

        }

        res.json(rows);

    });

});

app.get("/attendance-summary-csv", (req, res) => {

    const sql = `

        SELECT
            s.id,
            s.name,
            s.matric_no,
            s.department,

            COUNT(
                CASE
                    WHEN a.status = 'present'
                    THEN 1
                END
            ) AS present_days,

            COUNT(a.id) AS total_days

        FROM students s

        LEFT JOIN attendance a

        ON s.id = a.student_id

        GROUP BY
            s.id,
            s.name,
            s.matric_no,
            s.department

        ORDER BY s.name ASC

    `;

    db.query(sql, (err, rows) => {

        if (err) {

            console.error(err);

            return res.status(500).send("Error generating CSV");

        }

        let csv =
        "Name,Matric Number,Department,Present Days,Attendance Percentage\n";

        rows.forEach(student => {

            const percentage =
                student.total_days === 0
                    ? 0
                    : Math.round(
                        (student.present_days / student.total_days) * 100
                    );

            csv +=
                `"${student.name}","${student.matric_no}","${student.department}",${student.present_days},${percentage}%\n`;

        });

        res.setHeader(
            "Content-Type",
            "text/csv"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="attendance-summary.csv"'
        );

        res.send(csv);

    });

});
app.post('/register', (req, res) => {
  const { matric_no, name, department, face_data, face_descriptor } = req.body;

  if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
    console.error("Invalid face descriptor received:", face_descriptor);
    return res.status(400).send("Invalid face descriptor");
  }

  // convert descriptor array to string
  const descriptorJSON = JSON.stringify(face_descriptor);

  const sql = `
    INSERT INTO students 
    (matric_no, name, department, face_data, face_descriptor) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [matric_no, name, department, face_data, descriptorJSON], (err) => {
    if (err) {
      console.error(err);
      res.send("Error saving student");
    } else {
      res.send("Student + Face registered successfully");
    }
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});