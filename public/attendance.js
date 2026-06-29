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

  const showStudentInfo = (student) => {
    if (lastStudentCard && studentName && studentMatric && studentDept) {
      studentName.innerText = student.name || '-';
      studentMatric.innerText = student.matric_no || '-';
      studentDept.innerText = student.department || '-';
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

  await initializeBackend();
  await loadModels();
  await startCamera();

  captureBtn.addEventListener('click', async () => {

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

      let bestMatch = null;
      let lowestDistance = 1;

      for (let student of students) {
        if (!student.face_descriptor) continue;

        let storedDescriptor;
        try {
          storedDescriptor = JSON.parse(student.face_descriptor);
        } catch (err) {
          console.warn('Invalid stored descriptor JSON for student', student.name, err);
          continue;
        }

        if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== liveDescriptor.length) {
          continue;
        }

        const distance = faceapi.euclideanDistance(liveDescriptor, new Float32Array(storedDescriptor));

        if (distance < lowestDistance) {
          lowestDistance = distance;
          bestMatch = student;
        }
      }

      if (!bestMatch || lowestDistance >= 0.5) {
        setResult('Face not recognized. Attendance not recorded.', 'error');
        console.log('NO MATCH', lowestDistance);
        return;
      }

      showStudentInfo(bestMatch);

      const attendanceResponse = await fetch('/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: bestMatch.id || null
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

      setResult(`✅ Attendance recorded for ${bestMatch.name}`, 'success');
      setStatus(attendanceResult);
      console.log('MATCH FOUND:', bestMatch, lowestDistance);
    } catch (err) {
      console.error('Attendance error:', err);
      setResult('Unable to record attendance. See console for details.', 'error');
    }
  });
});
