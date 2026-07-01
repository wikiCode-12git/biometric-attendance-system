document.addEventListener('DOMContentLoaded', async function () {
  const video = document.getElementById('js-video');
  const canvas = document.getElementById('js-canvas');
  const captureBtn = document.getElementById('js-captureBtn');
  const statusText = document.getElementById('js-status');
  const resultText = document.getElementById('js-attendanceResult');
  const lastStudentCard = document.getElementById('js-lastStudent');
  const studentName = document.getElementById('js-studentName');
  const studentMatric = document.getElementById('js-studentMatric');
  const studentDept = document.getElementById('js-studentDept');
  const studentLevel = document.getElementById('js-studentLevel');
  const courseName = document.getElementById('js-courseName');
  const courseSelect = document.getElementById('js-course');

  const setStatus = (text) => {
    if (statusText) {
      statusText.innerText = text;
    } else {
      console.log('STATUS:', text);
    }
  };

  const setResult = (text, type = 'info') => {
    if (resultText) {
      resultText.innerText = text;
      resultText.classList.remove('error', 'success');
      if (type === 'success') resultText.classList.add('success');
      if (type === 'error') resultText.classList.add('error');
    } else {
      console.log('RESULT:', text);
    }
  };

  const showStudentInfo = (student, selectedCourse) => {

  if (
    lastStudentCard &&
    studentName &&
    studentMatric &&
    studentDept
  ) {

    studentName.innerText = student.name || '-';

    studentMatric.innerText = student.matric_no || '-';

    studentDept.innerText = student.department || '-';

    if (studentLevel)
      studentLevel.innerText = student.level || '-';

    if (courseName)
      courseName.innerText = selectedCourse || '-';

    lastStudentCard.classList.remove('hidden');

  }

};

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      setStatus('Camera started. Ready to capture.');
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('Unable to access camera. Check permissions.');
    }
  }

  const MODEL_URL = '/models';

  async function initializeBackend() {
    try {
      await faceapi.tf.setBackend('cpu');
      await faceapi.tf.ready();
      setStatus('TensorFlow backend set to CPU.');
    } catch (err) {
      console.error('Backend initialization failed:', err);
      setStatus('Backend initialization failed. See console.');
      throw err;
    }
  }

  async function loadModels() {
    try {
      setStatus('Loading models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setStatus('Models loaded. Ready to mark attendance.');
    } catch (err) {
      console.error('Model loading failed:', err);
      setStatus('Failed to load models. See console.');
      throw err;
    }
  }
  async function loadCourses() {

  try {

    const response = await fetch('/courses');

    const courses = await response.json();

    courseSelect.innerHTML = '<option value="">Select Course</option>';

    courses.forEach(course => {

      const option = document.createElement('option');

      option.value = course.id;

      option.textContent =
        `${course.course_code} - ${course.course_title}`;

      courseSelect.appendChild(option);

    });

  }

  catch (err) {

    console.error(err);

    courseSelect.innerHTML =
      '<option value="">Unable to load courses</option>';

  }

}
  await initializeBackend();
  await loadModels();
  await loadCourses();
  await startCamera();

  captureBtn.addEventListener('click', async () => {
    if (!courseSelect.value) {

    setResult(
        'Please select a course first.',
        'error'
    );

    return;

}
    if (video.readyState !== 4) {
      setResult('Camera not ready yet. Please wait for the video to start.', 'error');
      return;
    }

    setResult('Detecting face...');

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.35
    });

    const detection = await faceapi
      .detectSingleFace(video, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setResult('No face detected. Adjust lighting and try again.', 'error');
      return;
    }

    const liveDescriptor = detection.descriptor;
    setStatus('Face detected. Verifying against registered students...');

    try {
      const res = await fetch('/students');
      const students = await res.json();
    
      console.log("Number of students:", students.length);
      let bestMatch = null;
      let lowestDistance = 1;

      for (let student of students) {
        if (!student.face_descriptor) {
    continue;
}

        let storedDescriptor;
       try {
    storedDescriptor = JSON.parse(student.face_descriptor);
} catch (err) {
    console.error(student.name, "JSON parse failed", err);
    continue;
}

        if (!Array.isArray(storedDescriptor)) {
    console.log(student.name, "Descriptor is not an array");
    continue;
}

if (storedDescriptor.length !== liveDescriptor.length) {
    console.log(
        student.name,
        "Wrong descriptor length:",
        storedDescriptor.length,
        "Expected:",
        liveDescriptor.length
    );
    continue;
}

        const distance = faceapi.euclideanDistance(liveDescriptor, new Float32Array(storedDescriptor));
          console.log(
          student.name,
          student.id,
          distance
      );
        if (distance < lowestDistance) {
          lowestDistance = distance;
          bestMatch = student;
        }
      }
        
      if (!bestMatch || lowestDistance >= 0.5) {
        setResult('Face not recognized. Attendance not recorded.', 'error');
        return;
      }

      const selectedCourse =
    courseSelect.options[
        courseSelect.selectedIndex
    ].text;

    showStudentInfo(

    bestMatch,

    selectedCourse

);

      const attendanceResponse = await fetch('/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({

    student_id: bestMatch.id,

    course_id: courseSelect.value

})
        });

      const attendanceResult = await attendanceResponse.text();
      if (!attendanceResponse.ok) {
        if (attendanceResponse.status === 409) {
          setResult(`⚠️ ${attendanceResult}`, 'error');
          setStatus('Attendance not recorded. Duplicate check-in for today.');
          return;
        }
        throw new Error(attendanceResult || 'Attendance endpoint returned an error');
      }

      setResult(

    `✅ ${bestMatch.name} marked present for ${selectedCourse}`,

    'success'

);
      setStatus(attendanceResult);
      console.log('MATCH FOUND:', bestMatch, lowestDistance);
    } catch (err) {
      console.error('Attendance error:', err);
      setResult('Unable to record attendance. See console for details.', 'error');
    }
  });
});
