document.addEventListener('DOMContentLoaded', async function () {
  const studentsList = document.getElementById('js-studentsList');
  const studentsStatus = document.getElementById('js-studentsStatus');
  const searchInput = document.getElementById('js-search');

  const setStatus = (text, type = 'info') => {
    if (studentsStatus) {
      studentsStatus.innerText = text;
      studentsStatus.classList.remove('error', 'success');
      if (type === 'success') studentsStatus.classList.add('success');
      if (type === 'error') studentsStatus.classList.add('error');
    }
  };

  const fetchStudents = async () => {
    const response = await fetch('/students');
    if (!response.ok) {
      throw new Error('Failed to load students');
    }
    return response.json();
  };

    const fetchSessions = async () => {

  const response = await fetch('/sessions');

  if (!response.ok) {

    throw new Error('Failed to load sessions');

  }

  return response.json();

};
  const renderStudents = (students) => {
    if (students.length === 0) {
      studentsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 24px;">No students found.</p>';
      setStatus('No students available.', 'info');
      return;
    }

    studentsList.innerHTML = students.map(student => `
      <div class="student-item" data-id="${student.id}">
        <div class="student-info">
          <div class="student-field">
            <label>Matric No</label>
            <input class="matric-input" value="${student.matric_no || ''}" />
          </div>
          <div class="student-field">
            <label>Name</label>
            <input class="name-input" value="${student.name || ''}" />
          </div>
          <div class="student-field">
            <label>Department</label>
            <input class="department-input" value="${student.department || ''}" />
            <div class="student-field">
  <label>Level</label>
  <select class="level-input">

    <option value="ND1" ${student.level == 'ND1' ? 'selected' : ''}>ND1</option>

    <option value="ND2" ${student.level == 'ND2' ? 'selected' : ''}>ND2</option>

    <option value="HND1" ${student.level == 'HND1' ? 'selected' : ''}>HND1</option>

    <option value="HND2" ${student.level == 'HND2' ? 'selected' : ''}>HND2</option>

    <option value="POST HND" ${student.level == 'POST HND' ? 'selected' : ''}>POST HND</option>

  </select>
</div>
      <div class="student-field">

<label>Academic Session</label>

<select class="session-input">

${allSessions.map(session => `

<option

value="${session.id}"

${student.session_id == session.id ? 'selected' : ''}

>

${session.session_name}

</option>

`).join('')}

</select>

</div>
          </div>
        </div>
        <div class="student-actions">
          <button class="save-btn secondary-btn">Save</button>
          <button class="delete-btn" style="background: #dc2626; color: #fff; padding: 8px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Delete</button>
        </div>
      </div>
    `).join('');

    setStatus(`${students.length} students loaded successfully.`, 'success');
  };

  const loadAndRender = async () => {
    try {
      setStatus('Loading students...', 'info');
      const students = await fetchStudents();
      renderStudents(students);
    } catch (err) {
      console.error('Students load failed:', err);
      setStatus('Unable to load students. See console for details.', 'error');
    }
  };

  const updateStudent = async (

    id,

    matric_no,

    name,

    department,

    level,

    session_id

) => {
    const response = await fetch(`/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({

    matric_no,

    name,

    department,

    level,

    session_id

})
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to update student');
    }
  };

  const deleteStudent = async (id) => {
    const response = await fetch(`/students/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to delete student');
    }
  };

  const applySearch = (students) => {
    const query = searchInput.value.toLowerCase();
    if (!query) {
      renderStudents(students);
      return;
    }
    const filtered = students.filter(student => {
      return (
        (student.name || '').toLowerCase().includes(query) ||
        (student.matric_no || '').toLowerCase().includes(query)
      );
    });
    renderStudents(filtered);
  };

  let allStudents = [];

  let allSessions = [];
 try {

  allStudents = await fetchStudents();

  allSessions = await fetchSessions();

  renderStudents(allStudents);

}

catch (err) {

  console.error(err);

  setStatus('Unable to load data.', 'error');

  return;

}

  searchInput.addEventListener('input', () => applySearch(allStudents));

  studentsList.addEventListener('click', async (event) => {
    const target = event.target;
    const studentItem = target.closest('.student-item');
    if (!studentItem) return;
    const id = studentItem.getAttribute('data-id');
    const matricInput = studentItem.querySelector('.matric-input');
    const nameInput = studentItem.querySelector('.name-input');
    const departmentInput = studentItem.querySelector('.department-input');
    const levelInput = studentItem.querySelector('.level-input');
    const sessionInput = studentItem.querySelector('.session-input');
    
    if (target.classList.contains('save-btn')) {
      const matric_no = matricInput.value.trim();
      const name = nameInput.value.trim();
      const department = departmentInput.value.trim();
      const level = levelInput.value;
      const session_id = sessionInput.value;

      if (!matric_no || !name || !department) {
        setStatus('Matric number, name, and department are required.', 'error');
        return;
      }

      try {
        await updateStudent(

    id,

    matric_no,

    name,

    department,

    level,

    session_id

);
        setStatus('Student updated successfully.', 'success');
        allStudents = await fetchStudents();
        applySearch(allStudents);
      } catch (err) {
        console.error('Update failed:', err);
        setStatus('Failed to save changes. See console for details.', 'error');
      }
    }

    if (target.classList.contains('delete-btn')) {
      if (!confirm('Delete this student? This also removes their face data.')) {
        return;
      }

      try {
        await deleteStudent(id);
        setStatus('Student deleted successfully.', 'success');
        allStudents = await fetchStudents();
        applySearch(allStudents);
      } catch (err) {
        console.error('Delete failed:', err);
        setStatus('Failed to delete student. See console for details.', 'error');
      }
    }
  });
});
